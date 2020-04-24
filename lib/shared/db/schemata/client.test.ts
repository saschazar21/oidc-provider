import mongoose from 'mongoose';

import connect, { ClientModel } from '~/lib/shared/db';

describe('Clients', () => {
  let client_id: string;
  const baseData = {
    logo: 'https://source.unsplash.com/random/512x512',
    name: 'Test Client',
    redirect_uris: ['https://test.com/cb'],
  };

  afterAll(async () => {
    await ClientModel.findByIdAndDelete(client_id);
    mongoose.connection.close();
  });

  beforeAll(async () => {
    await connect();
  });

  it('should fail when _id is present', async () => {
    const data = { ...baseData, _id: 'I am invalid' };
    await expect(ClientModel.create(data)).rejects.toThrowError();
    await expect(ClientModel.find()).resolves.toHaveLength(0);
  });

  it('should fail when client_secret is present', async () => {
    const data = { ...baseData, client_secret: 'I am invalid' };
    await expect(ClientModel.create(data)).rejects.toThrowError();
  });

  it('should fail when name is omitted', async () => {
    const { name, ...data } = baseData;
    await expect(ClientModel.create(data)).rejects.toThrowError(
      'Client name is mandatory!'
    );
  });

  it('should fail when redirect URIs are omitted', async () => {
    const { redirect_uris, ...data } = baseData;
    await expect(ClientModel.create(data)).rejects.toThrowError();
  });

  it('should fail when empty redirect URI array is given', async () => {
    const data = { ...baseData, redirect_uris: [] };
    await expect(ClientModel.create(data)).rejects.toThrowError();
  });

  it('should fail when invalid redirect URI is present', async () => {
    const data = {
      ...baseData,
      redirect_uris: [...baseData.redirect_uris, 'http://invalid.com'],
    };
    await expect(ClientModel.create(data)).rejects.toThrowError();
  });

  it('should fail when invalid logo URI is given', async () => {
    const data = {
      ...baseData,
      logo: 'mongo://invalid.url',
    };

    await expect(ClientModel.create(data)).rejects.toThrowError();
  });

  it('should create a client', async () => {
    const client = await ClientModel.create(baseData);
    client_id = client.get('_id');

    expect(client.get('client_id')).toBeTruthy();
    expect(client.get('client_secret')).toBeTruthy();
  });

  it('should reset client secret', async () => {
    const client = (await ClientModel.findById(client_id)) as any;
    const { client_secret: original } = client.toJSON();
    const updated = await client.resetSecret();

    expect(updated.length).toBeGreaterThan(0);
    expect(client.get('client_secret')).toEqual(updated);
    expect(original).not.toEqual(updated);
    expect(client.get('__v')).toBeGreaterThan(0);
  });

  it('should update client model', async () => {
    const data = {
      active: false,
      name: 'New Test Client',
    };

    const updated = await ClientModel.findByIdAndUpdate(
      client_id,
      { $set: data },
      { new: true }
    );

    expect(updated.get('client_id')).toEqual(client_id);
    expect(updated.get('name')).toEqual(data.name);
    expect(updated.get('__v')).toBeGreaterThan(1);
  });

  it('should fail when client_secret gets updated', async () => {
    const data = {
      client_secret: 'I am invalid anyways',
    };

    const updated = ClientModel.findByIdAndUpdate(
      client_id,
      { ...data },
      { new: true }
    );
    await expect(updated).rejects.toThrowError();
  });
});
