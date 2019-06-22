#! /usr/bin/env node
'use strict';

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _values = require('babel-runtime/core-js/object/values');

var _values2 = _interopRequireDefault(_values);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _rest = require('@octokit/rest');

var _rest2 = _interopRequireDefault(_rest);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _settings = require('../settings');

var _settings2 = _interopRequireDefault(_settings);

var _binaryVersionReader = require('binary-version-reader');

var _dotenv = require('dotenv');

var _dotenv2 = _interopRequireDefault(_dotenv);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var fileDirectory = _path2.default.resolve(process.cwd());

var filePath = null;

// A counter is a lot safer than a while(true)
var count = 0;
while (count < 20) {
  count += 1;
  filePath = _path2.default.join(fileDirectory, '.env');
  console.log('Checking for .env: ', filePath);
  if (_fs2.default.existsSync(filePath)) {
    break;
  }

  var newFileDirectory = _path2.default.join(fileDirectory, '..');
  if (newFileDirectory === fileDirectory) {
    filePath = null;
    break;
  }
  fileDirectory = newFileDirectory;
}

if (!filePath) {
  _dotenv2.default.config();
} else {
  _dotenv2.default.config({
    path: filePath
  });
}

var GITHUB_USER = 'particle-iot';
var GITHUB_FIRMWARE_REPOSITORY = 'firmware';
var GITHUB_CLI_REPOSITORY = 'particle-cli';
var FILE_GEN_DIRECTORY = _path2.default.join(__dirname, '../../third-party/');
var SETTINGS_FILE = FILE_GEN_DIRECTORY + 'settings.json';

// This default is here so that the regex will work when updating these files.
/* eslint-disable */
var DEFAULT_SETTINGS = {
  knownApps: {
    deep_update_2014_06: true,
    cc3000: true,
    cc3000_1_14: true,
    tinker: true,
    voodoo: true
  },
  knownPlatforms: {
    '0': 'Core',
    '6': 'Photon',
    '8': 'P1',
    '10': 'Electron',
    '88': 'Duo',
    '103': 'Bluz'
  },
  updates: {
    '2b04:d006': {
      systemFirmwareOne: 'system-part1-0.6.0-photon.bin',
      systemFirmwareTwo: 'system-part2-0.6.0-photon.bin'
    },
    '2b04:d008': {
      systemFirmwareOne: 'system-part1-0.6.0-p1.bin',
      systemFirmwareTwo: 'system-part2-0.6.0-p1.bin'
    },
    '2b04:d00a': {
      // The bin files MUST be in this order to be flashed to the correct memory locations
      systemFirmwareOne: 'system-part2-0.6.0-electron.bin',
      systemFirmwareTwo: 'system-part3-0.6.0-electron.bin',
      systemFirmwareThree: 'system-part1-0.6.0-electron.bin'
    }
  }
};

var FIRMWARE_PLATFORMS = (0, _values2.default)(DEFAULT_SETTINGS.knownPlatforms).map(function (platform) {
  return platform.toLowerCase();
});
/* eslint-enable */

var githubAPI = new _rest2.default();

var _process$env = process.env,
    GITHUB_AUTH_PASSWORD = _process$env.GITHUB_AUTH_PASSWORD,
    GITHUB_AUTH_TYPE = _process$env.GITHUB_AUTH_TYPE,
    GITHUB_AUTH_TOKEN = _process$env.GITHUB_AUTH_TOKEN,
    GITHUB_AUTH_USERNAME = _process$env.GITHUB_AUTH_USERNAME;


if (!GITHUB_AUTH_TYPE) {
  throw new Error('You need to set up a .env file with auth credentials');
}

if (GITHUB_AUTH_TYPE === 'oauth') {
  githubAPI.authenticate({
    token: GITHUB_AUTH_TOKEN,
    type: GITHUB_AUTH_TYPE
  });
} else {
  githubAPI.authenticate({
    password: GITHUB_AUTH_PASSWORD,
    type: GITHUB_AUTH_TYPE,
    username: GITHUB_AUTH_USERNAME
  });
}

var downloadAssetFile = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(asset) {
    var filename, fileWithPath;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            filename = asset.name;
            fileWithPath = _settings2.default.BINARIES_DIRECTORY + '/' + filename;

            if (!_fs2.default.existsSync(fileWithPath)) {
              _context.next = 5;
              break;
            }

            console.log('File Exists: ' + filename);
            return _context.abrupt('return', filename);

          case 5:

            console.log('Downloading ' + filename + '...');

            return _context.abrupt('return', githubAPI.repos.getReleaseAsset({
              headers: {
                accept: 'application/octet-stream'
              },
              id: asset.id,
              owner: GITHUB_USER,
              repo: GITHUB_FIRMWARE_REPOSITORY
            }).then(function (response) {
              _fs2.default.writeFileSync(fileWithPath, response.data);
              return filename;
            }).catch(function (error) {
              return console.error(asset, error);
            }));

          case 7:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined);
  }));

  return function downloadAssetFile(_x) {
    return _ref.apply(this, arguments);
  };
}();

var downloadBlob = function () {
  var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(asset) {
    var filename, fileWithPath;
    return _regenerator2.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            filename = asset.name;
            fileWithPath = _settings2.default.BINARIES_DIRECTORY + '/' + filename;

            if (!_fs2.default.existsSync(fileWithPath)) {
              _context2.next = 5;
              break;
            }

            console.log('File Exists: ' + filename);
            return _context2.abrupt('return', filename);

          case 5:

            console.log('Downloading ' + filename + '...');

            return _context2.abrupt('return', githubAPI.gitdata.getBlob({
              file_sha: asset.sha,
              headers: {
                accept: 'application/vnd.github.v3.raw'
              },
              owner: GITHUB_USER,
              repo: GITHUB_CLI_REPOSITORY
            }).then(function (response) {
              _fs2.default.writeFileSync(fileWithPath, response.data);
              return filename;
            }).catch(function (error) {
              return console.error(error);
            }));

          case 7:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, undefined);
  }));

  return function downloadBlob(_x2) {
    return _ref2.apply(this, arguments);
  };
}();

var downloadFirmwareBinaries = function () {
  var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(assets) {
    var assetFileNames;
    return _regenerator2.default.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return _promise2.default.all(assets.map(function (asset) {
              if (asset.name.match(/(system-part|bootloader)/)) {
                return downloadAssetFile(asset);
              }
              return _promise2.default.resolve('');
            }));

          case 2:
            assetFileNames = _context3.sent;


            console.log();

            return _context3.abrupt('return', assetFileNames.filter(function (item) {
              return !!item;
            }));

          case 5:
          case 'end':
            return _context3.stop();
        }
      }
    }, _callee3, undefined);
  }));

  return function downloadFirmwareBinaries(_x3) {
    return _ref3.apply(this, arguments);
  };
}();

var updateSettings = function () {
  var _ref4 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(binaryFileNames) {
    var parser, moduleInfos, scriptSettings;
    return _regenerator2.default.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            parser = new _binaryVersionReader.HalModuleParser();
            _context4.next = 3;
            return _promise2.default.all(binaryFileNames.map(function (filename) {
              return new _promise2.default(function (resolve) {
                return parser.parseFile(_settings2.default.BINARIES_DIRECTORY + '/' + filename, function (result) {
                  resolve((0, _extends3.default)({}, result, {
                    fileBuffer: undefined,
                    filename: filename
                  }));
                });
              });
            }));

          case 3:
            moduleInfos = _context4.sent;
            scriptSettings = (0, _stringify2.default)(moduleInfos, null, 2);


            _fs2.default.writeFileSync(SETTINGS_FILE, scriptSettings);
            console.log('Updated settings');

          case 7:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, undefined);
  }));

  return function updateSettings(_x4) {
    return _ref4.apply(this, arguments);
  };
}();

var downloadAppBinaries = function () {
  var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee5() {
    var assets;
    return _regenerator2.default.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            _context5.next = 2;
            return githubAPI.repos.getContents({
              owner: GITHUB_USER,
              path: 'assets/binaries',
              repo: GITHUB_CLI_REPOSITORY
            });

          case 2:
            assets = _context5.sent;
            _context5.next = 5;
            return _promise2.default.all(assets.data.map(function (asset) {
              return downloadBlob(asset);
            }));

          case 5:
            return _context5.abrupt('return', _context5.sent);

          case 6:
          case 'end':
            return _context5.stop();
        }
      }
    }, _callee5, undefined);
  }));

  return function downloadAppBinaries() {
    return _ref5.apply(this, arguments);
  };
}();

(0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee6() {
  var _ref7, releases, _releases, data, assets, downloadedBinaries;

  return _regenerator2.default.wrap(function _callee6$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _context6.prev = 0;

          if (!_fs2.default.existsSync(_settings2.default.BINARIES_DIRECTORY)) {
            _mkdirp2.default.sync(_settings2.default.BINARIES_DIRECTORY);
          }
          if (!_fs2.default.existsSync(FILE_GEN_DIRECTORY)) {
            _mkdirp2.default.sync(FILE_GEN_DIRECTORY);
          }

          _context6.prev = 3;
          _context6.next = 6;
          return downloadAppBinaries();

        case 6:
          _context6.next = 11;
          break;

        case 8:
          _context6.prev = 8;
          _context6.t0 = _context6['catch'](3);

          console.error(_context6.t0);

        case 11:
          _context6.next = 13;
          return githubAPI.repos.listReleases({
            owner: GITHUB_USER,
            page: 0,
            perPage: 100,
            repo: GITHUB_FIRMWARE_REPOSITORY
          });

        case 13:
          releases = _context6.sent;
          _releases = releases, data = _releases.data;

        case 15:
          if (!githubAPI.hasNextPage(releases)) {
            _context6.next = 22;
            break;
          }

          _context6.next = 18;
          return githubAPI.getNextPage(releases);

        case 18:
          releases = _context6.sent;

          data = data.concat(releases.data);
          _context6.next = 15;
          break;

        case 22:

          data.sort(function (a, b) {
            if (a.tag_name < b.tag_name) {
              return 1;
            }
            if (a.tag_name > b.tag_name) {
              return -1;
            }
            return 0;
          });

          assets = (_ref7 = []).concat.apply(_ref7, (0, _toConsumableArray3.default)(data.map(function (release) {
            return release.assets;
          })));
          _context6.next = 26;
          return downloadFirmwareBinaries(assets);

        case 26:
          downloadedBinaries = _context6.sent;
          _context6.next = 29;
          return updateSettings(downloadedBinaries);

        case 29:

          console.log('\r\nCompleted Sync');
          _context6.next = 35;
          break;

        case 32:
          _context6.prev = 32;
          _context6.t1 = _context6['catch'](0);

          console.log(_context6.t1);

        case 35:
        case 'end':
          return _context6.stop();
      }
    }
  }, _callee6, undefined, [[0, 32], [3, 8]]);
}))();