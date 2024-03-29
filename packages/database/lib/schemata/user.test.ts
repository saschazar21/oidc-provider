import { ClientModel, UserModel } from '@saschazar/oidc-provider-database/lib';
import connect, {
  disconnect,
} from '@saschazar/oidc-provider-database/lib/connect';
import { ClientSchema } from '@saschazar/oidc-provider-database/lib/schemata/client';
import { ACR_VALUES } from '@saschazar/oidc-provider-types/lib/acr';

describe('UserModel', () => {
  let sub: string;
  const baseData = {
    email: 'john.doe@test.com',
    name: 'John Doe',
    password: 'a test password',
    picture: 'https://gravatar.com/avatar/14139afb48fd0c193f375d2d4c3bea53',
    profile: 'https://gravatar.com/profile/14139afb48fd0c193f375d2d4c3bea53',
    website: 'https://sascha.work',
  };

  afterAll(async () => {
    await connect();
    await UserModel.findByIdAndDelete(sub);
    await disconnect();
  });

  beforeAll(async () => {
    await connect();
  });

  it('should fail when custom ID is present', async () => {
    await expect(
      UserModel.create({ ...baseData, _id: 'custom ID' })
    ).rejects.toThrowError();
  });

  it('should fail when custom sub is present', async () => {
    await expect(
      UserModel.create({ ...baseData, sub: 'custom ID' })
    ).rejects.toThrowError();
  });

  it('should fail when malformed e-mail address is present', async () => {
    await expect(
      UserModel.create({ ...baseData, email: 'saschazar21@huhu' })
    ).rejects.toThrowError();
  });

  it('should fail when malformed picture URL is present', async () => {
    await expect(
      UserModel.create({ ...baseData, picture: 'http:/url' })
    ).rejects.toThrowError();
  });

  it('should fail when malformed profile URL is present', async () => {
    await expect(
      UserModel.create({ ...baseData, profile: 'ftp://profile.com' })
    ).rejects.toThrowError();
  });

  it('should fail when malformed website URL is present', async () => {
    await expect(
      UserModel.create({ ...baseData, website: 'custom://url.com' })
    ).rejects.toThrowError();
  });

  it('creates a basic user', async () => {
    const user = await UserModel.create(baseData);
    sub = user.get('sub');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match = await (user as any).comparePassword(baseData.password);

    expect(user.get('sub')).toEqual(user.get('_id'));
    expect(user.get('password')).not.toEqual(baseData.password);
    expect(user.get('name')).toEqual(baseData.name);
    expect(user.get('given_name')).toEqual(baseData.name.split(' ')[0]);
    expect(user.get('created_at')).toBeTruthy();
    expect(user.get('acr')).toEqual(ACR_VALUES.BASIC);
    expect(match).toBeTruthy();
  });

  it('updates a password', async () => {
    const old = await UserModel.findById(sub);
    const oldPassword = old.get('password');
    const updated = await UserModel.findByIdAndUpdate(
      sub,
      {
        password: 'a new password',
      },
      { new: true }
    );

    expect(updated.get('password')).not.toEqual(oldPassword);
    expect(updated.get('password')).not.toEqual('a new password');
    expect(updated.get('__v')).toBeGreaterThan(0);
  });

  it('updates a password using $set', async () => {
    const old = await UserModel.findById(sub);
    const oldPassword = old.get('password');
    const updated = await UserModel.findByIdAndUpdate(
      sub,
      {
        $set: { password: 'a newer password' },
      },
      { new: true }
    );

    expect(updated.get('password')).not.toEqual(oldPassword);
    expect(updated.get('password')).not.toEqual('a newer password');
    expect(updated.get('__v')).toBeGreaterThan(1);
  });

  it('updates the user with address information', async () => {
    const address = {
      country: 'United States of America',
      locality: 'Sacramento',
      postal_code: '95814',
      region: 'CA',
      street_address: '1474 Timber Ridge Road',
    };

    const updated = await UserModel.findByIdAndUpdate(
      sub,
      { address },
      { new: true }
    );

    expect(updated.get('address')).toBeTruthy();
    expect(updated.get('address').get('formatted')).toBeTruthy();
    expect(updated.get('address').get('formatted').length).toBeGreaterThan(0);
  });

  it("updates the user's address", async () => {
    const user = await UserModel.findByIdAndUpdate(
      sub,
      { 'address.locality': 'Los Angeles' },
      { new: true }
    );

    expect(user.get('address').get('locality')).toEqual('Los Angeles');
    expect(user.get('address').get('region')).toEqual('CA');
  });

  it('should fail to update custom ID', async () => {
    await expect(
      UserModel.findByIdAndUpdate(sub, { $set: { _id: 'i am invalid' } })
    ).rejects.toThrowError();
  });

  it('should return consents', async () => {
    let client: ClientSchema;
    const rand = Math.floor(Math.random() * 1000);
    const dummy = {
      email: `test-${rand}@mail.com`,
      password: 'some-password',
    };

    const dummyClient = {
      name: `test-${rand}`,
      redirect_uris: [`https://test-${rand}.com`],
    };

    await connect()
      .then(() => UserModel.create(dummy))
      .then((user) =>
        ClientModel.create({ ...dummyClient, owner: user.get('sub') })
      )
      .then((c) => {
        client = c.toJSON<ClientSchema>();
      });

    const user = await UserModel.findByIdAndUpdate(
      sub,
      { $addToSet: { consents: client._id } },
      { new: true }
    );
    await UserModel.populate(user, { path: 'consents' });

    expect(user.get('consents')).toHaveLength(1);
    expect(user.get('consents')[0]).toHaveProperty('owner', client.owner);

    const userUpdate = await UserModel.findByIdAndUpdate(
      sub,
      { $addToSet: { consents: client._id } },
      { new: true }
    );

    expect(userUpdate.get('consents')).toHaveLength(1);

    await Promise.all([
      UserModel.findByIdAndDelete(client.owner),
      ClientModel.findByIdAndDelete(client._id),
    ]);
  });
});
