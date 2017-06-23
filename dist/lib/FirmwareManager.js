'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _values = require('babel-runtime/core-js/object/values');

var _values2 = _interopRequireDefault(_values);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _entries = require('babel-runtime/core-js/object/entries');

var _entries2 = _interopRequireDefault(_entries);

var _class, _temp;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _binaryVersionReader = require('binary-version-reader');

var _nullthrows = require('nullthrows');

var _nullthrows2 = _interopRequireDefault(_nullthrows);

var _settings = require('../settings');

var _settings2 = _interopRequireDefault(_settings);

var _settings3 = require('../../third-party/settings.json');

var _settings4 = _interopRequireDefault(_settings3);

var _specifications = require('../../third-party/specifications');

var _specifications2 = _interopRequireDefault(_specifications);

var _versions = require('../../third-party/versions.json');

var _versions2 = _interopRequireDefault(_versions);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var platformSettings = (0, _entries2.default)(_specifications2.default);
var SPECIFICATION_KEY_BY_PLATFORM = new _map2.default((0, _values2.default)(_settings4.default.knownPlatforms).map(function (platform) {
  var spec = platformSettings.find(
  // eslint-disable-next-line no-unused-vars
  function (_ref) {
    var _ref2 = (0, _slicedToArray3.default)(_ref, 2),
        key = _ref2[0],
        value = _ref2[1];

    return value.productName === platform;
  });

  return [platform, spec && spec[0]];
}).filter(function (item) {
  return !!item[1];
}));
var FIRMWARE_VERSION = _versions2.default.find(function (version) {
  return version[1] === _settings4.default.versionNumber;
})[0];

var FirmwareManager = (_temp = _class = function () {
  function FirmwareManager() {
    (0, _classCallCheck3.default)(this, FirmwareManager);

    this.getKnownAppFileName = function () {
      throw new Error('getKnownAppFileName has not been implemented.');
    };
  }

  (0, _createClass3.default)(FirmwareManager, null, [{
    key: 'getOtaUpdateConfig',
    value: function getOtaUpdateConfig(platformID) {
      var platform = _settings4.default.knownPlatforms[platformID.toString()];
      var key = SPECIFICATION_KEY_BY_PLATFORM.get(platform);

      if (!key) {
        return null;
      }

      var firmwareSettings = _settings4.default.updates[key];
      if (!key) {
        return null;
      }

      var firmwareKeys = (0, _keys2.default)(firmwareSettings);
      return firmwareKeys.map(function (firmwareKey) {
        return (0, _extends3.default)({}, _specifications2.default[key][firmwareKey], {
          binaryFileName: firmwareSettings[firmwareKey]
        });
      });
    }
  }]);
  return FirmwareManager;
}(), _class.getOtaSystemUpdateConfig = function () {
  var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(systemInformation) {
    var parser, platformID, modules, moduleToUpdate, otaUpdateConfig, moduleIndex, config, systemFile;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            parser = new _binaryVersionReader.HalDescribeParser();
            platformID = systemInformation.p;
            modules = parser.getModules(systemInformation)
            // Filter so we only have the system modules
            .filter(function (module) {
              return module.func === 's';
            });

            if (modules) {
              _context.next = 5;
              break;
            }

            throw new Error('Could not find any system modules for OTA update');

          case 5:
            moduleToUpdate = modules.find(function (module) {
              return module.version < FIRMWARE_VERSION;
            });

            if (moduleToUpdate) {
              _context.next = 8;
              break;
            }

            return _context.abrupt('return', null);

          case 8:
            otaUpdateConfig = FirmwareManager.getOtaUpdateConfig(platformID);

            if (otaUpdateConfig) {
              _context.next = 11;
              break;
            }

            throw new Error('Could not find OTA update config for device');

          case 11:
            moduleIndex = modules.indexOf(moduleToUpdate);
            config = otaUpdateConfig[moduleIndex];

            if (config) {
              _context.next = 15;
              break;
            }

            throw new Error('Cannot find the module for updating');

          case 15:
            systemFile = _fs2.default.readFileSync(_settings2.default.BINARIES_DIRECTORY + '/' + config.binaryFileName);
            return _context.abrupt('return', {
              moduleIndex: moduleIndex,
              systemFile: systemFile
            });

          case 17:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined);
  }));

  return function (_x) {
    return _ref3.apply(this, arguments);
  };
}(), _class.getAppModule = function (systemInformation) {
  var parser = new _binaryVersionReader.HalDescribeParser();
  return (0, _nullthrows2.default)(parser.getModules(systemInformation)
  // Filter so we only have the app modules
  .find(function (module) {
    return module.func === 'u';
  }));
}, _temp);
exports.default = FirmwareManager;