'use strict';

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _github = require('github');

var _github2 = _interopRequireDefault(_github);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _settings = require('../settings');

var _settings2 = _interopRequireDefault(_settings);

var _nullthrows = require('nullthrows');

var _nullthrows2 = _interopRequireDefault(_nullthrows);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var GITHUB_USER = 'spark';

var GITHUB_FIRMWARE_REPOSITORY = 'firmware';
var GITHUB_CLI_REPOSITORY = 'particle-cli';
var FILE_GEN_DIRECTORY = _path2.default.join(__dirname, '../../third-party/');
var MAPPING_FILE = FILE_GEN_DIRECTORY + 'versions.json';
var SPECIFICATIONS_FILE = FILE_GEN_DIRECTORY + 'specifications.js';
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
/* eslint-enable */

var versionTag = '';
var githubAPI = new _github2.default();

var exitWithMessage = function exitWithMessage(message) {
  console.log(message);
  process.exit(0);
};

var exitWithJSON = function exitWithJSON(json) {
  exitWithMessage((0, _stringify2.default)(json, null, 2));
};

var downloadFile = function downloadFile(url) {
  return new _promise2.default(function (resolve) {
    var filename = (0, _nullthrows2.default)(url.match(/.*\/(.*)/))[1];
    console.log('Downloading ' + filename + '...');

    var file = _fs2.default.createWriteStream(_settings2.default.BINARIES_DIRECTORY + '/' + filename);

    file.on('finish', function () {
      return file.close(function () {
        return resolve(filename);
      });
    });
    (0, _request2.default)(url).pipe(file).on('error', exitWithJSON);
  });
};

var downloadFirmwareBinaries = function () {
  var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(assets) {
    var assetFileNames;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return _promise2.default.all(assets.map(function (asset) {
              if (asset.name.match(/^system-part/)) {
                return downloadFile(asset.browser_download_url);
              }
              return _promise2.default.resolve('');
            }));

          case 2:
            assetFileNames = _context.sent;
            return _context.abrupt('return', assetFileNames.filter(function (item) {
              return !!item;
            }));

          case 4:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined);
  }));

  return function downloadFirmwareBinaries(_x) {
    return _ref.apply(this, arguments);
  };
}();

var updateSettings = function updateSettings() {
  var versionNumber = versionTag;
  if (versionNumber[0] === 'v') {
    versionNumber = versionNumber.substr(1);
  }

  var scriptSettings = (0, _stringify2.default)((0, _extends3.default)({
    versionNumber: versionNumber
  }, DEFAULT_SETTINGS), null, 2);

  var settingsBinaries = [];
  scriptSettings = scriptSettings.replace(/(system-part\d-).*(-.*.bin)/g, function (filename, part, device) {
    var newFilename = part + versionNumber + device;
    settingsBinaries.push(newFilename);
    return newFilename;
  });

  _fs2.default.writeFileSync(SETTINGS_FILE, scriptSettings);
  console.log('Updated settings');

  return settingsBinaries;
};

var verifyBinariesMatch = function verifyBinariesMatch(downloadedBinaries, settingsBinaries) {
  if ((0, _stringify2.default)(downloadedBinaries.sort()) !== (0, _stringify2.default)(settingsBinaries.sort())) {
    console.log("\n\nWARNING: the list of downloaded binaries doesn't match the list " + 'of binaries in settings.js');
    console.log('Downloaded:  ', downloadedBinaries);
    console.log('settings.js: ', settingsBinaries);
  }
};

var downloadAppBinaries = function () {
  var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2() {
    var assets;
    return _regenerator2.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return githubAPI.repos.getContent({
              owner: GITHUB_USER,
              path: 'binaries',
              repo: GITHUB_CLI_REPOSITORY
            });

          case 2:
            assets = _context2.sent;
            _context2.next = 5;
            return _promise2.default.all(assets.map(function (asset) {
              return downloadFile(asset.download_url);
            }));

          case 5:
            return _context2.abrupt('return', _context2.sent);

          case 6:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, undefined);
  }));

  return function downloadAppBinaries() {
    return _ref2.apply(this, arguments);
  };
}();

(0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3() {
  var releases, release, downloadedBinaries, settingsBinaries, specificationsResponse, versionResponse, versionText, data, mapping, line;
  return _regenerator2.default.wrap(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          // Start running process. If you pass `0.6.0` it will install that version of
          // the firmware.
          versionTag = process.argv[2];
          if (versionTag && versionTag[0] !== 'v') {
            versionTag = 'v' + versionTag;
          }

          if (!_fs2.default.existsSync(_settings2.default.BINARIES_DIRECTORY)) {
            _mkdirp2.default.sync(_settings2.default.BINARIES_DIRECTORY);
          }
          if (!_fs2.default.existsSync(FILE_GEN_DIRECTORY)) {
            _mkdirp2.default.sync(FILE_GEN_DIRECTORY);
          }

          // Download app binaries
          _context3.next = 6;
          return downloadAppBinaries();

        case 6:
          if (!(process.argv.length !== 3)) {
            _context3.next = 13;
            break;
          }

          _context3.next = 9;
          return githubAPI.repos.getReleases({
            owner: GITHUB_USER,
            page: 0,
            perPage: 30,
            repo: GITHUB_FIRMWARE_REPOSITORY
          });

        case 9:
          releases = _context3.sent;

          releases = releases.filter(function (release
          // Don't use release candidates.. we only need main releases.
          ) {
            return !release.tag_name.includes('-rc') && !release.tag_name.includes('-pi') && release.assets.length > 2;
          });

          releases.sort(function (a, b) {
            if (a.tag_name < b.tag_name) {
              return 1;
            }
            if (a.tag_name > b.tag_name) {
              return -1;
            }
            return 0;
          });

          versionTag = releases[0].tag_name;

        case 13:
          _context3.next = 15;
          return githubAPI.repos.getReleaseByTag({
            owner: GITHUB_USER,
            repo: GITHUB_FIRMWARE_REPOSITORY,
            tag: versionTag
          });

        case 15:
          release = _context3.sent;
          _context3.next = 18;
          return downloadFirmwareBinaries(release.assets);

        case 18:
          downloadedBinaries = _context3.sent;
          _context3.next = 21;
          return updateSettings();

        case 21:
          settingsBinaries = _context3.sent;

          verifyBinariesMatch(downloadedBinaries, settingsBinaries);

          _context3.next = 25;
          return githubAPI.repos.getContent({
            owner: GITHUB_USER,
            path: 'oldlib/deviceSpecs/specifications.js',
            repo: GITHUB_CLI_REPOSITORY
          });

        case 25:
          specificationsResponse = _context3.sent;


          _fs2.default.writeFileSync(SPECIFICATIONS_FILE, new Buffer(specificationsResponse.content, 'base64').toString());

          _context3.next = 29;
          return githubAPI.repos.getContent({
            owner: GITHUB_USER,
            path: 'system/system-versions.md',
            repo: GITHUB_FIRMWARE_REPOSITORY
          });

        case 29:
          versionResponse = _context3.sent;
          versionText = new Buffer(versionResponse.content, 'base64').toString() || '';
          data = versionText.match(/^\|[^\n]*/gim).map(function (line) {
            return line.split('|').slice(2, 5);
          }).filter(function (arr) {
            return !isNaN(parseInt(arr[0], 10));
          }).map(function (vdata) {
            return [vdata[0].replace(/\s+/g, ''), vdata[1].replace(/\s+/g, '')];
          });

          if (data.length === 0) {
            console.log('cant parse system-versions from https://github.com/spark/firmware/blob/develop/system/system-versions.md');
          }
          mapping = [];

          for (line = 0; line < data.length; line += 1) {
            mapping.push(data[line]);
          }
          _fs2.default.writeFileSync(MAPPING_FILE, (0, _stringify2.default)(mapping, null, 2));

          console.log('\r\nCompleted Sync');

        case 37:
        case 'end':
          return _context3.stop();
      }
    }
  }, _callee3, undefined);
}))();