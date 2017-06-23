'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _parseInt = require('babel-runtime/core-js/number/parse-int');

var _parseInt2 = _interopRequireDefault(_parseInt);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _Handshake = require('../lib/Handshake');

var _Handshake2 = _interopRequireDefault(_Handshake);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _net = require('net');

var _net2 = _interopRequireDefault(_net);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _nullthrows8 = require('nullthrows');

var _nullthrows9 = _interopRequireDefault(_nullthrows8);

var _moment = require('moment');

var _moment2 = _interopRequireDefault(_moment);

var _moniker = require('moniker');

var _moniker2 = _interopRequireDefault(_moniker);

var _Device = require('../clients/Device');

var _Device2 = _interopRequireDefault(_Device);

var _FirmwareManager = require('../lib/FirmwareManager');

var _FirmwareManager2 = _interopRequireDefault(_FirmwareManager);

var _logger = require('../lib/logger');

var _logger2 = _interopRequireDefault(_logger);

var _CoapMessages = require('../lib/CoapMessages');

var _CoapMessages2 = _interopRequireDefault(_CoapMessages);

var _EventPublisher = require('../lib/EventPublisher');

var _SparkServerEvents = require('../lib/SparkServerEvents');

var _SparkServerEvents2 = _interopRequireDefault(_SparkServerEvents);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var NAME_GENERATOR = _moniker2.default.generator([_moniker2.default.adjective, _moniker2.default.noun]); /*
                                                                                                         *   Copyright (c) 2015 Particle Industries, Inc.  All rights reserved.
                                                                                                         *
                                                                                                         *   This program is free software; you can redistribute it and/or
                                                                                                         *   modify it under the terms of the GNU Lesser General Public
                                                                                                         *   License as published by the Free Software Foundation, either
                                                                                                         *   version 3 of the License, or (at your option) any later version.
                                                                                                         *
                                                                                                         *   This program is distributed in the hope that it will be useful,
                                                                                                         *   but WITHOUT ANY WARRANTY; without even the implied warranty of
                                                                                                         *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
                                                                                                         *   Lesser General Public License for more details.
                                                                                                         *
                                                                                                         *   You should have received a copy of the GNU Lesser General Public
                                                                                                         *   License along with this program; if not, see <http://www.gnu.org/licenses/>.
                                                                                                         *
                                                                                                         * 
                                                                                                         *
                                                                                                         */

var SPECIAL_EVENTS = [_Device.SYSTEM_EVENT_NAMES.APP_HASH, _Device.SYSTEM_EVENT_NAMES.FLASH_AVAILABLE, _Device.SYSTEM_EVENT_NAMES.FLASH_PROGRESS, _Device.SYSTEM_EVENT_NAMES.FLASH_STATUS, _Device.SYSTEM_EVENT_NAMES.SAFE_MODE, _Device.SYSTEM_EVENT_NAMES.SPARK_STATUS];

var connectionIdCounter = 0;

var DeviceServer = function () {
  function DeviceServer(deviceAttributeRepository, claimCodeManager, cryptoManager, eventPublisher, deviceServerConfig, areSystemFirmwareAutoupdatesEnabled) {
    var _this = this;

    (0, _classCallCheck3.default)(this, DeviceServer);
    this._devicesById = new _map2.default();

    this._updateDeviceSystemFirmware = function () {
      var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2(device) {
        var _device$getAttributes, deviceID, ownerID, systemInformation, config;

        return _regenerator2.default.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return device.hasStatus(_Device.DEVICE_STATUS_MAP.READY);

              case 2:
                _device$getAttributes = device.getAttributes(), deviceID = _device$getAttributes.deviceID, ownerID = _device$getAttributes.ownerID;
                systemInformation = device.getSystemInformation();
                _context2.next = 6;
                return _FirmwareManager2.default.getOtaSystemUpdateConfig(systemInformation);

              case 6:
                config = _context2.sent;

                if (config) {
                  _context2.next = 9;
                  break;
                }

                return _context2.abrupt('return');

              case 9:

                setTimeout((0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
                  return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                      switch (_context.prev = _context.next) {
                        case 0:
                          _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.SAFE_MODE_UPDATING,
                          // Lets the user know if it's the system update part 1/2/3
                          config.moduleIndex + 1, deviceID, ownerID, false);

                          _context.next = 3;
                          return device.flash(config.systemFile);

                        case 3:
                        case 'end':
                          return _context.stop();
                      }
                    }
                  }, _callee, _this);
                })), 1000);

              case 10:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, _this);
      }));

      return function (_x) {
        return _ref.apply(this, arguments);
      };
    }();

    this._onNewSocketConnection = function () {
      var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee7(socket) {
        var counter, connectionKey, handshake, device, deviceID;
        return _regenerator2.default.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                _context7.prev = 0;

                connectionIdCounter += 1;
                counter = connectionIdCounter;
                connectionKey = '_' + connectionIdCounter;
                handshake = new _Handshake2.default(_this._cryptoManager);
                device = new _Device2.default(socket, connectionKey, handshake);
                _context7.next = 8;
                return device.startProtocolInitialization();

              case 8:
                deviceID = _context7.sent;


                _logger2.default.info('Connection from: ' + device.getRemoteIPAddress() + ' - ' + ('Device ID: ' + deviceID), 'Connection ID: ' + counter);

                process.nextTick((0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee6() {
                  var existingConnection, systemInformation, _FirmwareManager$getA, appHash, existingAttributes, _ref8, claimCode, currentBuildTarget, imei, isCellular, last_iccid, name, ownerID, registrar;

                  return _regenerator2.default.wrap(function _callee6$(_context6) {
                    while (1) {
                      switch (_context6.prev = _context6.next) {
                        case 0:
                          _context6.prev = 0;

                          device.on(_Device.DEVICE_EVENT_NAMES.DISCONNECT, function () {
                            return _this._onDeviceDisconnect(device);
                          });

                          device.on(_Device.DEVICE_MESSAGE_EVENTS_NAMES.SUBSCRIBE, function (packet) {
                            return _this._onDeviceSubscribe(packet, device);
                          });

                          device.on(_Device.DEVICE_MESSAGE_EVENTS_NAMES.PRIVATE_EVENT, function (packet) {
                            return _this._onDeviceSentMessage(packet, /* isPublic*/false, device);
                          });

                          device.on(_Device.DEVICE_MESSAGE_EVENTS_NAMES.PUBLIC_EVENT, function (packet) {
                            return _this._onDeviceSentMessage(packet, /* isPublic*/true, device);
                          });

                          device.on(_Device.DEVICE_MESSAGE_EVENTS_NAMES.GET_TIME, function (packet) {
                            return _this._onDeviceGetTime(packet, device);
                          });

                          // TODO in the next 3 subscriptions for flashing events
                          // there is code duplication, its not clean, but
                          // i guess we'll remove these subscription soon anyways
                          // so I keep it like this for now.
                          device.on(_Device.DEVICE_EVENT_NAMES.FLASH_STARTED, (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3() {
                            var _device$getAttributes2, ownerID;

                            return _regenerator2.default.wrap(function _callee3$(_context3) {
                              while (1) {
                                switch (_context3.prev = _context3.next) {
                                  case 0:
                                    _context3.next = 2;
                                    return device.hasStatus(_Device.DEVICE_STATUS_MAP.READY);

                                  case 2:
                                    _device$getAttributes2 = device.getAttributes(), ownerID = _device$getAttributes2.ownerID;

                                    _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.FLASH_STATUS, 'started', deviceID, ownerID, false);

                                  case 4:
                                  case 'end':
                                    return _context3.stop();
                                }
                              }
                            }, _callee3, _this);
                          })));

                          device.on(_Device.DEVICE_EVENT_NAMES.FLASH_SUCCESS, (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4() {
                            var _device$getAttributes3, ownerID;

                            return _regenerator2.default.wrap(function _callee4$(_context4) {
                              while (1) {
                                switch (_context4.prev = _context4.next) {
                                  case 0:
                                    _context4.next = 2;
                                    return device.hasStatus(_Device.DEVICE_STATUS_MAP.READY);

                                  case 2:
                                    _device$getAttributes3 = device.getAttributes(), ownerID = _device$getAttributes3.ownerID;

                                    _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.FLASH_STATUS, 'success', deviceID, ownerID, false);

                                  case 4:
                                  case 'end':
                                    return _context4.stop();
                                }
                              }
                            }, _callee4, _this);
                          })));

                          device.on(_Device.DEVICE_EVENT_NAMES.FLASH_FAILED, (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5() {
                            var _device$getAttributes4, ownerID;

                            return _regenerator2.default.wrap(function _callee5$(_context5) {
                              while (1) {
                                switch (_context5.prev = _context5.next) {
                                  case 0:
                                    _context5.next = 2;
                                    return device.hasStatus(_Device.DEVICE_STATUS_MAP.READY);

                                  case 2:
                                    _device$getAttributes4 = device.getAttributes(), ownerID = _device$getAttributes4.ownerID;

                                    _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.FLASH_STATUS, 'failed', deviceID, ownerID, false);

                                  case 4:
                                  case 'end':
                                    return _context5.stop();
                                }
                              }
                            }, _callee5, _this);
                          })));

                          if (_this._devicesById.has(deviceID)) {
                            existingConnection = _this._devicesById.get(deviceID);

                            (0, _nullthrows9.default)(existingConnection).disconnect('Device was already connected. Reconnecting.\r\n');
                          }

                          _this._devicesById.set(deviceID, device);

                          _context6.next = 13;
                          return device.completeProtocolInitialization();

                        case 13:
                          systemInformation = _context6.sent;
                          _FirmwareManager$getA = _FirmwareManager2.default.getAppModule(systemInformation), appHash = _FirmwareManager$getA.uuid;
                          _context6.next = 17;
                          return _this._deviceAttributeRepository.getByID(deviceID);

                        case 17:
                          existingAttributes = _context6.sent;
                          _ref8 = existingAttributes || {}, claimCode = _ref8.claimCode, currentBuildTarget = _ref8.currentBuildTarget, imei = _ref8.imei, isCellular = _ref8.isCellular, last_iccid = _ref8.last_iccid, name = _ref8.name, ownerID = _ref8.ownerID, registrar = _ref8.registrar;


                          device.updateAttributes({
                            appHash: appHash,
                            claimCode: claimCode,
                            currentBuildTarget: currentBuildTarget,
                            imei: imei,
                            isCellular: isCellular,
                            last_iccid: last_iccid,
                            lastHeard: new Date(),
                            name: name || NAME_GENERATOR.choose(),
                            ownerID: ownerID,
                            registrar: registrar
                          });

                          device.setStatus(_Device.DEVICE_STATUS_MAP.READY);

                          _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.SPARK_STATUS, 'online', deviceID, ownerID, false);

                          // TODO
                          // we may update attributes only on disconnect, but currently
                          // removing update here can break claim/provision flow
                          // so need to test carefully before doing this.
                          _context6.next = 24;
                          return _this._deviceAttributeRepository.updateByID(deviceID, device.getAttributes());

                        case 24:

                          // Send app-hash if this is a new app firmware
                          if (!existingAttributes || appHash !== existingAttributes.appHash) {
                            _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.APP_HASH, appHash, deviceID, ownerID, false);
                          }
                          _context6.next = 30;
                          break;

                        case 27:
                          _context6.prev = 27;
                          _context6.t0 = _context6['catch'](0);

                          device.disconnect('Error during connection: ' + _context6.t0 + ': ' + _context6.t0.stack);

                        case 30:
                        case 'end':
                          return _context6.stop();
                      }
                    }
                  }, _callee6, _this, [[0, 27]]);
                })));
                _context7.next = 16;
                break;

              case 13:
                _context7.prev = 13;
                _context7.t0 = _context7['catch'](0);

                _logger2.default.error('Device startup failed: ' + _context7.t0.message);

              case 16:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, _this, [[0, 13]]);
      }));

      return function (_x2) {
        return _ref3.apply(this, arguments);
      };
    }();

    this._onDeviceDisconnect = function () {
      var _ref9 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee8(device) {
        var attributes, deviceID, ownerID, newDevice, connectionKey;
        return _regenerator2.default.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                attributes = device.getAttributes();
                deviceID = attributes.deviceID, ownerID = attributes.ownerID;
                newDevice = _this._devicesById.get(deviceID);
                connectionKey = device.getConnectionKey();

                if (!(device !== newDevice)) {
                  _context8.next = 6;
                  break;
                }

                return _context8.abrupt('return');

              case 6:

                _this._devicesById.delete(deviceID);
                _this._eventPublisher.unsubscribeBySubscriberID(deviceID);

                if (!(device.getStatus() === _Device.DEVICE_STATUS_MAP.READY)) {
                  _context8.next = 11;
                  break;
                }

                _context8.next = 11;
                return _this._deviceAttributeRepository.updateByID(deviceID, attributes);

              case 11:

                _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.SPARK_STATUS, 'offline', deviceID, ownerID, false);
                _logger2.default.warn('Session ended for device with ID: ' + deviceID + ' with connectionKey: ' + ('' + (connectionKey || 'no connection key')));

              case 13:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, _this);
      }));

      return function (_x3) {
        return _ref9.apply(this, arguments);
      };
    }();

    this._onDeviceGetTime = function (packet, device) {
      var timeStamp = (0, _moment2.default)().utc().unix();
      var binaryValue = _CoapMessages2.default.toBinary(timeStamp, 'uint32');

      device.sendReply('GetTimeReturn', packet.messageId, binaryValue, packet.token.length ? packet.token.readUInt8(0) : 0);
    };

    this._onDeviceSentMessage = function () {
      var _ref10 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee9(packet, isPublic, device) {
        var _device$getAttributes5, deviceID, name, ownerID, eventData, publishOptions, eventName, shouldSwallowEvent, cryptoString;

        return _regenerator2.default.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                _context9.prev = 0;
                _context9.next = 3;
                return device.hasStatus(_Device.DEVICE_STATUS_MAP.READY);

              case 3:
                _device$getAttributes5 = device.getAttributes(), deviceID = _device$getAttributes5.deviceID, name = _device$getAttributes5.name, ownerID = _device$getAttributes5.ownerID;
                eventData = {
                  connectionID: device.getConnectionKey(),
                  data: packet.payload.toString('utf8'),
                  deviceID: deviceID,
                  name: _CoapMessages2.default.getUriPath(packet).substr(3),
                  ttl: _CoapMessages2.default.getMaxAge(packet)
                };
                publishOptions = {
                  isInternal: false,
                  isPublic: isPublic
                };
                eventName = eventData.name.toLowerCase();
                shouldSwallowEvent = false;

                // All spark events except special events should be hidden from the
                // event stream.

                if (eventName.startsWith('spark')) {
                  // These should always be private but let's make sure. This way
                  // if you are listening to a specific device you only see the system
                  // events from it.
                  publishOptions.isPublic = false;

                  shouldSwallowEvent = !SPECIAL_EVENTS.some(function (specialEvent) {
                    return eventName.startsWith(specialEvent);
                  });
                  if (shouldSwallowEvent) {
                    device.sendReply('EventAck', packet.messageId);
                  }
                }

                if (!shouldSwallowEvent && ownerID) {
                  _this._eventPublisher.publish((0, _extends3.default)({}, eventData, { userID: ownerID }), publishOptions);
                }

                if (!eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.CLAIM_CODE)) {
                  _context9.next = 13;
                  break;
                }

                _context9.next = 13;
                return _this._onDeviceClaimCodeMessage(packet, device);

              case 13:

                if (eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.GET_IP)) {
                  _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.GET_NAME, device.getRemoteIPAddress(), deviceID, ownerID, false);
                }

                if (eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.GET_NAME)) {
                  _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.GET_NAME, name, deviceID, ownerID, false);
                }

                if (eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.GET_RANDOM_BUFFER)) {
                  cryptoString = _crypto2.default.randomBytes(40).toString('base64').substring(0, 40);


                  _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.GET_RANDOM_BUFFER, cryptoString, deviceID, ownerID, false);
                }

                if (eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.IDENTITY)) {
                  // TODO - open up for possibility of retrieving multiple ID datums
                  // This is mostly for electron - You can get the IMEI and IICCID this way
                  // https://github.com/spark/firmware/blob/develop/system/src/system_cloud_internal.cpp#L682-L685
                  // https://github.com/spark/firmware/commit/73df5a4ac4c64f008f63a495d50f866d724c6201
                }

                if (eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.LAST_RESET)) {
                  _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.LAST_RESET, eventData.data, deviceID, ownerID, false);
                }

                if (eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.MAX_BINARY)) {
                  device.setMaxBinarySize((0, _parseInt2.default)((0, _nullthrows9.default)(eventData.data), 10));
                }

                if (eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.OTA_CHUNK_SIZE)) {
                  device.setOtaChunkSize((0, _parseInt2.default)((0, _nullthrows9.default)(eventData.data), 10));
                }

                if (!eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.SAFE_MODE)) {
                  _context9.next = 25;
                  break;
                }

                _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.SAFE_MODE, eventData.data, deviceID, ownerID, false);

                if (!_this._areSystemFirmwareAutoupdatesEnabled) {
                  _context9.next = 25;
                  break;
                }

                _context9.next = 25;
                return _this._updateDeviceSystemFirmware(device);

              case 25:

                if (eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.SPARK_SUBSYSTEM)) {
                  // TODO: Test this with a Core device
                  // get patch version from payload
                  // compare with version on disc
                  // if device version is old, do OTA update with patch
                }
                _context9.next = 31;
                break;

              case 28:
                _context9.prev = 28;
                _context9.t0 = _context9['catch'](0);

                _logger2.default.error(_context9.t0);

              case 31:
              case 'end':
                return _context9.stop();
            }
          }
        }, _callee9, _this, [[0, 28]]);
      }));

      return function (_x4, _x5, _x6) {
        return _ref10.apply(this, arguments);
      };
    }();

    this._onDeviceClaimCodeMessage = function () {
      var _ref11 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee10(packet, device) {
        var claimCode, _device$getAttributes6, previousClaimCode, deviceID, ownerID, claimRequestUserID;

        return _regenerator2.default.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                _context10.next = 2;
                return device.hasStatus(_Device.DEVICE_STATUS_MAP.READY);

              case 2:
                claimCode = packet.payload.toString('utf8');
                _device$getAttributes6 = device.getAttributes(), previousClaimCode = _device$getAttributes6.claimCode, deviceID = _device$getAttributes6.deviceID, ownerID = _device$getAttributes6.ownerID;

                if (!(ownerID || claimCode === previousClaimCode)) {
                  _context10.next = 6;
                  break;
                }

                return _context10.abrupt('return');

              case 6:
                claimRequestUserID = _this._claimCodeManager.getUserIDByClaimCode(claimCode);

                if (claimRequestUserID) {
                  _context10.next = 9;
                  break;
                }

                return _context10.abrupt('return');

              case 9:

                device.updateAttributes({
                  claimCode: claimCode,
                  ownerID: claimRequestUserID
                });
                _context10.next = 12;
                return _this._deviceAttributeRepository.updateByID(deviceID, {
                  claimCode: claimCode,
                  ownerID: claimRequestUserID
                });

              case 12:

                _this._claimCodeManager.removeClaimCode(claimCode);

              case 13:
              case 'end':
                return _context10.stop();
            }
          }
        }, _callee10, _this);
      }));

      return function (_x7, _x8) {
        return _ref11.apply(this, arguments);
      };
    }();

    this._onDeviceSubscribe = function () {
      var _ref12 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee11(packet, device) {
        var deviceAttributes, deviceID, ownerID, messageName, query, isFromMyDevices;
        return _regenerator2.default.wrap(function _callee11$(_context11) {
          while (1) {
            switch (_context11.prev = _context11.next) {
              case 0:
                _context11.next = 2;
                return device.hasStatus(_Device.DEVICE_STATUS_MAP.READY);

              case 2:
                deviceAttributes = device.getAttributes();
                deviceID = deviceAttributes.deviceID;
                ownerID = deviceAttributes.ownerID;

                // uri -> /e/?u    --> firehose for all my devices
                // uri -> /e/ (deviceid in body)   --> allowed
                // uri -> /e/    --> not allowed (no global firehose for cores, kthxplox)
                // uri -> /e/event_name?u    --> all my devices
                // uri -> /e/event_name?u (deviceid)    --> deviceid?

                messageName = _CoapMessages2.default.getUriPath(packet).substr(3);
                query = _CoapMessages2.default.getUriQuery(packet);
                isFromMyDevices = !!query.match('u');

                if (messageName) {
                  _context11.next = 11;
                  break;
                }

                device.sendReply('SubscribeFail', packet.messageId);
                return _context11.abrupt('return');

              case 11:

                _logger2.default.log('Subscribe Request:\r\n', {
                  deviceID: deviceID,
                  isFromMyDevices: isFromMyDevices,
                  messageName: messageName
                });

                device.sendReply('SubscribeAck', packet.messageId);

                process.nextTick(function () {
                  if (!ownerID) {
                    _logger2.default.log('device with ID ' + deviceID + ' wasn\'t subscribed to ' + (messageName + ' event: the device is unclaimed.'));
                    ownerID = '--unclaimed--';
                  }

                  var isSystemEvent = messageName.startsWith('spark');

                  _this._eventPublisher.subscribe(messageName, device.onDeviceEvent, {
                    filterOptions: {
                      connectionID: isSystemEvent ? device.getConnectionKey() : undefined,
                      mydevices: isFromMyDevices,
                      userID: ownerID
                    },
                    subscriberID: deviceID
                  });
                });

              case 14:
              case 'end':
                return _context11.stop();
            }
          }
        }, _callee11, _this);
      }));

      return function (_x9, _x10) {
        return _ref12.apply(this, arguments);
      };
    }();

    this._onSparkServerCallDeviceFunctionRequest = function () {
      var _ref13 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee12(event) {
        var _nullthrows, deviceID, functionArguments, functionName, responseEventName, device;

        return _regenerator2.default.wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                _nullthrows = (0, _nullthrows9.default)(event.context), deviceID = _nullthrows.deviceID, functionArguments = _nullthrows.functionArguments, functionName = _nullthrows.functionName, responseEventName = _nullthrows.responseEventName;
                _context12.prev = 1;
                device = _this.getDevice(deviceID);

                if (device) {
                  _context12.next = 5;
                  break;
                }

                throw new Error('Could not get device for ID');

              case 5:
                _context12.t0 = _this._eventPublisher;
                _context12.next = 8;
                return device.callFunction(functionName, functionArguments);

              case 8:
                _context12.t1 = _context12.sent;
                _context12.t2 = responseEventName;
                _context12.t3 = {
                  context: _context12.t1,
                  name: _context12.t2
                };
                _context12.t4 = {
                  isInternal: true,
                  isPublic: false
                };

                _context12.t0.publish.call(_context12.t0, _context12.t3, _context12.t4);

                _context12.next = 18;
                break;

              case 15:
                _context12.prev = 15;
                _context12.t5 = _context12['catch'](1);

                _this._eventPublisher.publish({
                  context: { error: _context12.t5 },
                  name: responseEventName
                }, {
                  isInternal: true,
                  isPublic: false
                });

              case 18:
              case 'end':
                return _context12.stop();
            }
          }
        }, _callee12, _this, [[1, 15]]);
      }));

      return function (_x11) {
        return _ref13.apply(this, arguments);
      };
    }();

    this._onSparkServerFlashDeviceRequest = function () {
      var _ref14 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee13(event) {
        var _nullthrows2, deviceID, fileBuffer, responseEventName, device;

        return _regenerator2.default.wrap(function _callee13$(_context13) {
          while (1) {
            switch (_context13.prev = _context13.next) {
              case 0:
                _nullthrows2 = (0, _nullthrows9.default)(event.context), deviceID = _nullthrows2.deviceID, fileBuffer = _nullthrows2.fileBuffer, responseEventName = _nullthrows2.responseEventName;
                _context13.prev = 1;
                device = _this.getDevice(deviceID);

                if (device) {
                  _context13.next = 5;
                  break;
                }

                throw new Error('Could not get device for ID');

              case 5:
                _context13.t0 = _this._eventPublisher;
                _context13.next = 8;
                return device.flash(fileBuffer);

              case 8:
                _context13.t1 = _context13.sent;
                _context13.t2 = responseEventName;
                _context13.t3 = {
                  context: _context13.t1,
                  name: _context13.t2
                };
                _context13.t4 = {
                  isInternal: true,
                  isPublic: false
                };

                _context13.t0.publish.call(_context13.t0, _context13.t3, _context13.t4);

                _context13.next = 18;
                break;

              case 15:
                _context13.prev = 15;
                _context13.t5 = _context13['catch'](1);

                _this._eventPublisher.publish({
                  context: { error: _context13.t5 },
                  name: responseEventName
                }, {
                  isInternal: true,
                  isPublic: false
                });

              case 18:
              case 'end':
                return _context13.stop();
            }
          }
        }, _callee13, _this, [[1, 15]]);
      }));

      return function (_x12) {
        return _ref14.apply(this, arguments);
      };
    }();

    this._onSparkServerGetDeviceAttributes = function () {
      var _ref15 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee14(event) {
        var _nullthrows3, deviceID, responseEventName, device;

        return _regenerator2.default.wrap(function _callee14$(_context14) {
          while (1) {
            switch (_context14.prev = _context14.next) {
              case 0:
                _nullthrows3 = (0, _nullthrows9.default)(event.context), deviceID = _nullthrows3.deviceID, responseEventName = _nullthrows3.responseEventName;
                _context14.prev = 1;
                device = _this.getDevice(deviceID);

                if (device) {
                  _context14.next = 5;
                  break;
                }

                throw new Error('Could not get device for ID');

              case 5:
                _context14.next = 7;
                return device.hasStatus(_Device.DEVICE_STATUS_MAP.READY);

              case 7:

                _this._eventPublisher.publish({
                  context: device.getAttributes(),
                  name: responseEventName
                }, {
                  isInternal: true,
                  isPublic: false
                });
                _context14.next = 13;
                break;

              case 10:
                _context14.prev = 10;
                _context14.t0 = _context14['catch'](1);

                _this._eventPublisher.publish({
                  context: { error: _context14.t0 },
                  name: responseEventName
                }, {
                  isInternal: true,
                  isPublic: false
                });

              case 13:
              case 'end':
                return _context14.stop();
            }
          }
        }, _callee14, _this, [[1, 10]]);
      }));

      return function (_x13) {
        return _ref15.apply(this, arguments);
      };
    }();

    this._onSparkServerGetDeviceVariableValueRequest = function () {
      var _ref16 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee15(event) {
        var _nullthrows4, deviceID, responseEventName, variableName, device;

        return _regenerator2.default.wrap(function _callee15$(_context15) {
          while (1) {
            switch (_context15.prev = _context15.next) {
              case 0:
                _nullthrows4 = (0, _nullthrows9.default)(event.context), deviceID = _nullthrows4.deviceID, responseEventName = _nullthrows4.responseEventName, variableName = _nullthrows4.variableName;
                _context15.prev = 1;
                device = _this.getDevice(deviceID);

                if (device) {
                  _context15.next = 5;
                  break;
                }

                throw new Error('Could not get device for ID');

              case 5:
                _context15.t0 = _this._eventPublisher;
                _context15.next = 8;
                return device.getVariableValue(variableName);

              case 8:
                _context15.t1 = _context15.sent;
                _context15.t2 = {
                  result: _context15.t1
                };
                _context15.t3 = responseEventName;
                _context15.t4 = {
                  context: _context15.t2,
                  name: _context15.t3
                };
                _context15.t5 = {
                  isInternal: true,
                  isPublic: false
                };

                _context15.t0.publish.call(_context15.t0, _context15.t4, _context15.t5);

                _context15.next = 19;
                break;

              case 16:
                _context15.prev = 16;
                _context15.t6 = _context15['catch'](1);

                _this._eventPublisher.publish({
                  context: { error: _context15.t6 },
                  name: responseEventName
                }, {
                  isInternal: true,
                  isPublic: false
                });

              case 19:
              case 'end':
                return _context15.stop();
            }
          }
        }, _callee15, _this, [[1, 16]]);
      }));

      return function (_x14) {
        return _ref16.apply(this, arguments);
      };
    }();

    this._onSparkServerPingDeviceRequest = function () {
      var _ref17 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee16(event) {
        var _nullthrows5, deviceID, responseEventName, device, pingObject;

        return _regenerator2.default.wrap(function _callee16$(_context16) {
          while (1) {
            switch (_context16.prev = _context16.next) {
              case 0:
                _nullthrows5 = (0, _nullthrows9.default)(event.context), deviceID = _nullthrows5.deviceID, responseEventName = _nullthrows5.responseEventName;
                device = _this.getDevice(deviceID);
                pingObject = device ? device.ping() : {
                  connected: false,
                  lastPing: null
                };


                _this._eventPublisher.publish({
                  context: pingObject,
                  name: responseEventName
                }, {
                  isInternal: true,
                  isPublic: false
                });

              case 4:
              case 'end':
                return _context16.stop();
            }
          }
        }, _callee16, _this);
      }));

      return function (_x15) {
        return _ref17.apply(this, arguments);
      };
    }();

    this._onSparkServerRaiseYourHandRequest = function () {
      var _ref18 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee17(event) {
        var _nullthrows6, deviceID, responseEventName, shouldShowSignal, device;

        return _regenerator2.default.wrap(function _callee17$(_context17) {
          while (1) {
            switch (_context17.prev = _context17.next) {
              case 0:
                _nullthrows6 = (0, _nullthrows9.default)(event.context), deviceID = _nullthrows6.deviceID, responseEventName = _nullthrows6.responseEventName, shouldShowSignal = _nullthrows6.shouldShowSignal;
                _context17.prev = 1;
                device = _this.getDevice(deviceID);

                if (device) {
                  _context17.next = 5;
                  break;
                }

                throw new Error('Could not get device for ID');

              case 5:
                _context17.next = 7;
                return device.hasStatus(_Device.DEVICE_STATUS_MAP.READY);

              case 7:
                _context17.t0 = _this._eventPublisher;
                _context17.next = 10;
                return device.raiseYourHand(shouldShowSignal);

              case 10:
                _context17.t1 = _context17.sent;
                _context17.t2 = responseEventName;
                _context17.t3 = {
                  context: _context17.t1,
                  name: _context17.t2
                };
                _context17.t4 = {
                  isInternal: true,
                  isPublic: false
                };

                _context17.t0.publish.call(_context17.t0, _context17.t3, _context17.t4);

                _context17.next = 20;
                break;

              case 17:
                _context17.prev = 17;
                _context17.t5 = _context17['catch'](1);

                _this._eventPublisher.publish({
                  context: { error: _context17.t5 },
                  name: responseEventName
                }, {
                  isInternal: true,
                  isPublic: false
                });

              case 20:
              case 'end':
                return _context17.stop();
            }
          }
        }, _callee17, _this, [[1, 17]]);
      }));

      return function (_x16) {
        return _ref18.apply(this, arguments);
      };
    }();

    this._onSparkServerUpdateDeviceAttributesRequest = function () {
      var _ref19 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee18(event) {
        var _nullthrows7, attributes, deviceID, responseEventName, device;

        return _regenerator2.default.wrap(function _callee18$(_context18) {
          while (1) {
            switch (_context18.prev = _context18.next) {
              case 0:
                _nullthrows7 = (0, _nullthrows9.default)(event.context), attributes = _nullthrows7.attributes, deviceID = _nullthrows7.deviceID, responseEventName = _nullthrows7.responseEventName;
                _context18.prev = 1;
                device = _this.getDevice(deviceID);

                if (device) {
                  _context18.next = 5;
                  break;
                }

                throw new Error('Could not get device for ID');

              case 5:
                _context18.next = 7;
                return device.hasStatus(_Device.DEVICE_STATUS_MAP.READY);

              case 7:
                device.updateAttributes((0, _extends3.default)({}, attributes));

                _context18.t0 = _this._eventPublisher;
                _context18.next = 11;
                return device.getAttributes();

              case 11:
                _context18.t1 = _context18.sent;
                _context18.t2 = responseEventName;
                _context18.t3 = {
                  context: _context18.t1,
                  name: _context18.t2
                };
                _context18.t4 = {
                  isInternal: true,
                  isPublic: false
                };

                _context18.t0.publish.call(_context18.t0, _context18.t3, _context18.t4);

                _context18.next = 21;
                break;

              case 18:
                _context18.prev = 18;
                _context18.t5 = _context18['catch'](1);

                _this._eventPublisher.publish({
                  context: { error: _context18.t5 },
                  name: responseEventName
                }, {
                  isInternal: true,
                  isPublic: false
                });

              case 21:
              case 'end':
                return _context18.stop();
            }
          }
        }, _callee18, _this, [[1, 18]]);
      }));

      return function (_x17) {
        return _ref19.apply(this, arguments);
      };
    }();

    this.getDevice = function (deviceID) {
      return _this._devicesById.get(deviceID);
    };

    this.publishSpecialEvent = function (eventName, data, deviceID, userID) {
      var isInternal = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

      if (!userID) {
        return;
      }
      var eventData = {
        data: data,
        deviceID: deviceID,
        name: eventName,
        userID: userID
      };
      process.nextTick(function () {
        _this._eventPublisher.publish(eventData, { isInternal: isInternal, isPublic: false });
      });
    };

    this._config = deviceServerConfig;
    this._deviceAttributeRepository = deviceAttributeRepository;
    this._cryptoManager = cryptoManager;
    this._claimCodeManager = claimCodeManager;
    this._eventPublisher = eventPublisher;
    this._areSystemFirmwareAutoupdatesEnabled = areSystemFirmwareAutoupdatesEnabled;
  }

  (0, _createClass3.default)(DeviceServer, [{
    key: 'start',
    value: function start() {
      var _this2 = this;

      this._eventPublisher.subscribe((0, _EventPublisher.getRequestEventName)(_SparkServerEvents2.default.CALL_DEVICE_FUNCTION), this._onSparkServerCallDeviceFunctionRequest);

      this._eventPublisher.subscribe((0, _EventPublisher.getRequestEventName)(_SparkServerEvents2.default.FLASH_DEVICE), this._onSparkServerFlashDeviceRequest);

      this._eventPublisher.subscribe((0, _EventPublisher.getRequestEventName)(_SparkServerEvents2.default.GET_DEVICE_ATTRIBUTES), this._onSparkServerGetDeviceAttributes);

      this._eventPublisher.subscribe((0, _EventPublisher.getRequestEventName)(_SparkServerEvents2.default.GET_DEVICE_VARIABLE_VALUE), this._onSparkServerGetDeviceVariableValueRequest);

      this._eventPublisher.subscribe((0, _EventPublisher.getRequestEventName)(_SparkServerEvents2.default.PING_DEVICE), this._onSparkServerPingDeviceRequest);

      this._eventPublisher.subscribe((0, _EventPublisher.getRequestEventName)(_SparkServerEvents2.default.RAISE_YOUR_HAND), this._onSparkServerRaiseYourHandRequest);

      this._eventPublisher.subscribe((0, _EventPublisher.getRequestEventName)(_SparkServerEvents2.default.UPDATE_DEVICE_ATTRIBUTES), this._onSparkServerUpdateDeviceAttributesRequest);

      var server = _net2.default.createServer(function (socket) {
        return process.nextTick(function () {
          return _this2._onNewSocketConnection(socket);
        });
      });

      setInterval(function () {
        return server.getConnections(function (error, count) {
          _logger2.default.info('Connected Devices ' + _chalk2.default.green(_this2._devicesById.size), ' - Sockets ' + _chalk2.default.green(count) + ' ');
        });
      }, 10000);

      server.on('error', function (error) {
        return _logger2.default.error('something blew up ' + error.message);
      });

      var serverPort = this._config.PORT.toString();
      server.listen(serverPort, function () {
        return _logger2.default.log('Server started on port: ' + serverPort);
      });
    }
  }]);
  return DeviceServer;
}();

exports.default = DeviceServer;