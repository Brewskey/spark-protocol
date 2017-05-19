// @flow

export type Database = {
  getCollection(collectionName: string): Object,
};

export type DeviceAttributes = {
  appHash: ?string,
  claimCode: ?string,
  currentBuildTarget: string,
  deviceID: string,
  imei?: string,
  ip: string,
  isCellular: boolean,
  last_iccid?: string,
  name: string,
  ownerID: ?string,
  particleProductId: number,
  productFirmwareVersion: number,
  registrar: string,
  timestamp: Date,
};

export type Event = EventData & {
  publishedAt: Date,
};

export type EventData = {
  connectionID?: ?string,
  data?: string,
  deviceID?: ?string,
  isPublic: boolean,
  name: string,
  ttl?: number,
  userID: string,
};

export type Repository<TModel> = {
  create: (model: TModel) => Promise<TModel>,
  deleteById: (id: string) => Promise<void>,
  getAll: () => Promise<Array<TModel>>,
  getById: (id: string) => Promise<?TModel>,
  update: (model: TModel) => Promise<TModel>,
};

export type ServerKeyRepository = {
  createKeys: (privateKeyPem: Buffer, publicKeyPem: Buffer)=> Promise<{
    privateKeyPem: Buffer,
    publicKeyPem: Buffer,
  }>,
  getPrivateKey: () => Promise<?string>,
};
