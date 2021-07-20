import { createPublicKey, KeyObject } from 'crypto';
import {
  generateKeyPair,
  GenerateKeyPairOptions,
} from 'jose/util/generate_key_pair';
import { fromKeyLike, JWK, KeyLike } from 'jose/jwk/from_key_like';
import { parseJwk } from 'jose/jwk/parse';

import { JWE } from 'utils/lib/types/jwe';
import { JWS } from 'utils/lib/types/jws';

class KeyStore {
  private _keystore: Map<JWS | JWE, KeyLike>;

  public get keystore(): Map<JWS | JWE, KeyLike> {
    return this._keystore;
  }

  public get size(): number {
    return this.keystore.size;
  }

  constructor() {
    this._keystore = new Map();
  }

  public add(alg: JWS | JWE, key: KeyLike): void {
    this._keystore.set(alg, key);
  }

  public get(alg: JWS | JWE): KeyLike {
    return this.keystore.get(alg);
  }

  public async export(priv?: boolean): Promise<{ keys: JWK[] }> {
    const keys: JWK[] = [];
    for (const [alg, key] of this.keystore) {
      const jwk = await fromKeyLike(
        priv ? key : createPublicKey(key as KeyObject)
      );
      keys.push({ ...jwk, alg });
    }
    return { keys };
  }

  public async toJWKS(priv?: boolean): Promise<{ keys: JWK[] }> {
    return this.export(priv);
  }

  public async generate(
    alg: JWS | JWE,
    options: GenerateKeyPairOptions = {},
    add = true
  ): Promise<KeyLike> {
    if (alg.startsWith('HS')) {
      return null;
    }
    const { privateKey } = await generateKeyPair(alg, {
      extractable: true,
      ...options,
    });
    if (add) {
      this.add(alg, privateKey);
    }
    return privateKey;
  }

  public async import(jwks: { keys: JWK[] }): Promise<void> {
    this._keystore = new Map();
    for (const key of jwks.keys) {
      this.add(key.alg as JWS | JWE, await parseJwk(key, key.alg));
    }
  }
}

export default KeyStore;
