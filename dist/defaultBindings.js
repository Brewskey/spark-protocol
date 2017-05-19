'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _constitute = require('constitute');

var _DeviceAttributeDatabaseRepository = require('./repository/DeviceAttributeDatabaseRepository');

var _DeviceAttributeDatabaseRepository2 = _interopRequireDefault(_DeviceAttributeDatabaseRepository);

var _DeviceKeyFileRepository = require('./repository/DeviceKeyFileRepository');

var _DeviceKeyFileRepository2 = _interopRequireDefault(_DeviceKeyFileRepository);

var _DeviceServer = require('./server/DeviceServer');

var _DeviceServer2 = _interopRequireDefault(_DeviceServer);

var _EventPublisher = require('./lib/EventPublisher');

var _EventPublisher2 = _interopRequireDefault(_EventPublisher);

var _ClaimCodeManager = require('./lib/ClaimCodeManager');

var _ClaimCodeManager2 = _interopRequireDefault(_ClaimCodeManager);

var _CryptoManager = require('./lib/CryptoManager');

var _CryptoManager2 = _interopRequireDefault(_CryptoManager);

var _ServerKeyFileRepository = require('./repository/ServerKeyFileRepository');

var _ServerKeyFileRepository2 = _interopRequireDefault(_ServerKeyFileRepository);

var _settings = require('./settings');

var _settings2 = _interopRequireDefault(_settings);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var defaultBindings = function defaultBindings(container, serverSettings) {
  var mergedSettings = (0, _extends3.default)({}, _settings2.default, serverSettings);

  // Settings
  container.bindValue('DEVICE_DIRECTORY', mergedSettings.DEVICE_DIRECTORY);
  container.bindValue('ENABLE_SYSTEM_FIRWMARE_AUTOUPDATES', mergedSettings.ENABLE_SYSTEM_FIRWMARE_AUTOUPDATES);
  container.bindValue('SERVER_KEY_FILENAME', mergedSettings.SERVER_KEY_FILENAME);
  container.bindValue('SERVER_KEY_PASSWORD', mergedSettings.SERVER_KEY_PASSWORD);
  container.bindValue('SERVER_KEYS_DIRECTORY', mergedSettings.SERVER_KEYS_DIRECTORY);
  container.bindValue('TCP_DEVICE_SERVER_CONFIG', mergedSettings.TCP_DEVICE_SERVER_CONFIG);

  // Repository
  container.bindClass('DeviceAttributeRepository', _DeviceAttributeDatabaseRepository2.default, ['Database']);

  container.bindClass('DeviceKeyRepository', _DeviceKeyFileRepository2.default, ['DEVICE_DIRECTORY']);
  container.bindClass('ServerKeyRepository', _ServerKeyFileRepository2.default, ['SERVER_KEYS_DIRECTORY', 'SERVER_KEY_FILENAME']);

  // Utils
  container.bindClass('EventPublisher', _EventPublisher2.default, []);
  container.bindClass('ClaimCodeManager', _ClaimCodeManager2.default, []);
  container.bindClass('CryptoManager', _CryptoManager2.default, ['DeviceKeyRepository', 'ServerKeyRepository', 'SERVER_KEY_PASSWORD']);

  // Device server
  container.bindClass('DeviceServer', _DeviceServer2.default, ['DeviceAttributeRepository', 'ClaimCodeManager', 'CryptoManager', 'EventPublisher', 'TCP_DEVICE_SERVER_CONFIG', 'ENABLE_SYSTEM_FIRWMARE_AUTOUPDATES']);
};
exports.default = defaultBindings;