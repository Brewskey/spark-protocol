// @flow
import { Container } from 'constitute';

import DeviceAttributeDatabaseRepository from './repository/DeviceAttributeDatabaseRepository';
import DeviceKeyFileRepository from './repository/DeviceKeyFileRepository';
import DeviceServer from './server/DeviceServer';
import EventPublisher from './lib/EventPublisher';
import ClaimCodeManager from './lib/ClaimCodeManager';
import CryptoManager from './lib/CryptoManager';
import ServerKeyFileRepository from './repository/ServerKeyFileRepository';
import protocolSettings from './settings';

type ServerSettings = {
  BINARIES_DIRECTORY: string,
  DEVICE_DIRECTORY: string,
  ENABLE_SYSTEM_FIRWMARE_AUTOUPDATES: boolean,
  SERVER_KEY_FILENAME: string,
  SERVER_KEY_PASSWORD: ?string,
  SERVER_KEYS_DIRECTORY: string,
  TCP_DEVICE_SERVER_CONFIG: {
    HOST: string,
    PORT: number,
  },
};

const defaultBindings = (
  container: Container,
  serverSettings: ServerSettings,
) => {
  const mergedSettings = { ...protocolSettings, ...serverSettings };

  // Settings
  container.bindValue('DEVICE_DIRECTORY', mergedSettings.DEVICE_DIRECTORY);
  container.bindValue('ENABLE_SYSTEM_FIRWMARE_AUTOUPDATES', mergedSettings.ENABLE_SYSTEM_FIRWMARE_AUTOUPDATES);
  container.bindValue('SERVER_KEY_FILENAME', mergedSettings.SERVER_KEY_FILENAME);
  container.bindValue('SERVER_KEY_PASSWORD', mergedSettings.SERVER_KEY_PASSWORD);
  container.bindValue('SERVER_KEYS_DIRECTORY', mergedSettings.SERVER_KEYS_DIRECTORY);
  container.bindValue('TCP_DEVICE_SERVER_CONFIG', mergedSettings.TCP_DEVICE_SERVER_CONFIG);

  // Repository
  container.bindClass(
    'DeviceAttributeRepository',
    DeviceAttributeDatabaseRepository,
    ['Database'],
  );

  container.bindClass(
    'DeviceKeyRepository',
    DeviceKeyFileRepository,
    ['DEVICE_DIRECTORY'],
  );
  container.bindClass(
    'ServerKeyRepository',
    ServerKeyFileRepository,
    ['SERVER_KEYS_DIRECTORY', 'SERVER_KEY_FILENAME'],
  );

  // Utils
  container.bindClass('EventPublisher', EventPublisher, []);
  container.bindClass('ClaimCodeManager', ClaimCodeManager, []);
  container.bindClass(
    'CryptoManager',
    CryptoManager,
    [
      'DeviceKeyRepository',
      'ServerKeyRepository',
      'SERVER_KEY_PASSWORD',
    ],
  );

  // Device server
  container.bindClass(
    'DeviceServer',
    DeviceServer,
    [
      'DeviceAttributeRepository',
      'ClaimCodeManager',
      'CryptoManager',
      'EventPublisher',
      'TCP_DEVICE_SERVER_CONFIG',
      'ENABLE_SYSTEM_FIRWMARE_AUTOUPDATES',
    ],
  );
};

export default defaultBindings;
