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

var _nullthrows7 = require('nullthrows');

var _nullthrows8 = _interopRequireDefault(_nullthrows7);

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
      var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2(device, ownerID) {
        var description, systemInformation, deviceID, config;
        return _regenerator2.default.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return device.getDescription();

              case 2:
                description = _context2.sent;
                systemInformation = description.systemInformation;

                if (systemInformation) {
                  _context2.next = 6;
                  break;
                }

                return _context2.abrupt('return');

              case 6:
                deviceID = device.getID();
                _context2.next = 9;
                return _FirmwareManager2.default.getOtaSystemUpdateConfig(systemInformation);

              case 9:
                config = _context2.sent;

                if (config) {
                  _context2.next = 12;
                  break;
                }

                return _context2.abrupt('return');

              case 12:

                setTimeout((0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee() {
                  return _regenerator2.default.wrap(function _callee$(_context) {
                    while (1) {
                      switch (_context.prev = _context.next) {
                        case 0:
                          _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.SAFE_MODE_UPDATING,
                          // Lets the user know if it's the system update part 1/2/3
                          config.moduleIndex + 1, deviceID, ownerID);

                          _context.next = 3;
                          return device.flash(config.systemFile);

                        case 3:
                        case 'end':
                          return _context.stop();
                      }
                    }
                  }, _callee, _this);
                })), 1000);

              case 13:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, _this);
      }));

      return function (_x, _x2) {
        return _ref.apply(this, arguments);
      };
    }();

    this._onNewSocketConnection = function () {
      var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4(socket) {
        var counter, connectionKey, handshake, device, deviceID;
        return _regenerator2.default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.prev = 0;

                connectionIdCounter += 1;
                counter = connectionIdCounter;
                connectionKey = '_' + connectionIdCounter;
                handshake = new _Handshake2.default(_this._cryptoManager);
                device = new _Device2.default(socket, connectionKey, handshake);
                _context4.next = 8;
                return device.startProtocolInitialization();

              case 8:
                deviceID = _context4.sent;


                process.nextTick((0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3() {
                  var deviceAttributes, ownerID, existingConnection;
                  return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                      switch (_context3.prev = _context3.next) {
                        case 0:
                          _context3.prev = 0;
                          _context3.next = 3;
                          return _this._deviceAttributeRepository.getByID(device.getID());

                        case 3:
                          deviceAttributes = _context3.sent;
                          ownerID = deviceAttributes && deviceAttributes.ownerID;


                          device.on(_Device.DEVICE_EVENT_NAMES.DISCONNECT, function () {
                            return _this._onDeviceDisconnect(device);
                          });

                          device.on(_Device.DEVICE_MESSAGE_EVENTS_NAMES.SUBSCRIBE, function (packet) {
                            return _this._onDeviceSubscribe(packet, device);
                          });

                          device.on(_Device.DEVICE_MESSAGE_EVENTS_NAMES.PRIVATE_EVENT, function (packet) {
                            return _this._onDeviceSentMessage(packet,
                            /* isPublic*/false, device);
                          });

                          device.on(_Device.DEVICE_MESSAGE_EVENTS_NAMES.PUBLIC_EVENT, function (packet) {
                            return _this._onDeviceSentMessage(packet,
                            /* isPublic*/true, device);
                          });

                          device.on(_Device.DEVICE_MESSAGE_EVENTS_NAMES.GET_TIME, function (packet) {
                            return _this._onDeviceGetTime(packet, device);
                          });

                          device.on(_Device.DEVICE_EVENT_NAMES.FLASH_STARTED, function () {
                            return _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.FLASH_STATUS, 'started', deviceID, ownerID);
                          });

                          device.on(_Device.DEVICE_EVENT_NAMES.FLASH_SUCCESS, function () {
                            return _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.FLASH_STATUS, 'success', deviceID, ownerID);
                          });

                          device.on(_Device.DEVICE_EVENT_NAMES.FLASH_FAILED, function () {
                            return _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.FLASH_STATUS, 'failed', deviceID, ownerID);
                          });

                          if (_this._devicesById.has(deviceID)) {
                            existingConnection = _this._devicesById.get(deviceID);

                            (0, _nullthrows8.default)(existingConnection).disconnect('Device was already connected. Reconnecting.\r\n');
                          }

                          _this._devicesById.set(deviceID, device);

                          device.completeProtocolInitialization();
                          _this._onDeviceReady(device);

                          _logger2.default.info('Connection from: ' + device.getRemoteIPAddress() + ' - ' + ('Device ID: ' + deviceID), 'Connection ID: ' + counter);
                          _context3.next = 23;
                          break;

                        case 20:
                          _context3.prev = 20;
                          _context3.t0 = _context3['catch'](0);

                          device.disconnect('Error during connection: ' + _context3.t0);

                        case 23:
                        case 'end':
                          return _context3.stop();
                      }
                    }
                  }, _callee3, _this, [[0, 20]]);
                })));
                _context4.next = 15;
                break;

              case 12:
                _context4.prev = 12;
                _context4.t0 = _context4['catch'](0);

                _logger2.default.error('Device startup failed: ' + _context4.t0.message);

              case 15:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, _this, [[0, 12]]);
      }));

      return function (_x3) {
        return _ref3.apply(this, arguments);
      };
    }();

    this._onDeviceDisconnect = function () {
      var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5(device) {
        var deviceID, newDevice, connectionKey, deviceAttributes, ownerID;
        return _regenerator2.default.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                deviceID = device.getID();
                newDevice = _this._devicesById.get(deviceID);
                connectionKey = device.getConnectionKey();

                if (!(device !== newDevice)) {
                  _context5.next = 5;
                  break;
                }

                return _context5.abrupt('return');

              case 5:

                _this._devicesById.delete(deviceID);
                _this._eventPublisher.unsubscribeBySubscriberID(deviceID);

                _context5.next = 9;
                return _this._deviceAttributeRepository.getByID(deviceID);

              case 9:
                deviceAttributes = _context5.sent;
                _context5.next = 12;
                return _this._deviceAttributeRepository.updateByID(deviceID, { lastHeard: device.ping().lastPing });

              case 12:
                ownerID = deviceAttributes && deviceAttributes.ownerID;


                _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.SPARK_STATUS, 'offline', deviceID, ownerID);
                _logger2.default.warn('Session ended for device with ID: ' + deviceID + ' with connectionKey: ' + ('' + (connectionKey || 'no connection key')));

              case 15:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, _this);
      }));

      return function (_x4) {
        return _ref5.apply(this, arguments);
      };
    }();

    this._onDeviceGetTime = function (packet, device) {
      var timeStamp = (0, _moment2.default)().utc().unix();
      var binaryValue = _CoapMessages2.default.toBinary(timeStamp, 'uint32');

      device.sendReply('GetTimeReturn', packet.messageId, binaryValue, packet.token.length ? packet.token.readUInt8(0) : 0);
    };

    this._onDeviceReady = function () {
      var _ref6 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee6(device) {
        var deviceID, existingAttributes, ownerID, description, _FirmwareManager$getA, uuid;

        return _regenerator2.default.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                _context6.prev = 0;

                _logger2.default.log('Device online!');
                deviceID = device.getID();
                _context6.next = 5;
                return _this._deviceAttributeRepository.getByID(deviceID);

              case 5:
                existingAttributes = _context6.sent;
                ownerID = existingAttributes && existingAttributes.ownerID;


                _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.SPARK_STATUS, 'online', deviceID, ownerID);

                _context6.next = 10;
                return device.getDescription();

              case 10:
                description = _context6.sent;
                _FirmwareManager$getA = _FirmwareManager2.default.getAppModule(description.systemInformation), uuid = _FirmwareManager$getA.uuid;
                _context6.next = 14;
                return _this._deviceAttributeRepository.updateByID(deviceID, (0, _extends3.default)({
                  name: NAME_GENERATOR.choose()
                }, existingAttributes, {
                  appHash: uuid,
                  deviceID: deviceID,
                  ip: device.getRemoteIPAddress(),
                  lastHeard: new Date(),
                  particleProductId: description.productID,
                  productFirmwareVersion: description.firmwareVersion
                }));

              case 14:

                // Send app-hash if this is a new app firmware
                if (!existingAttributes || uuid !== existingAttributes.appHash) {
                  _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.APP_HASH, uuid, deviceID, ownerID);
                }
                _context6.next = 20;
                break;

              case 17:
                _context6.prev = 17;
                _context6.t0 = _context6['catch'](0);

                _logger2.default.error(_context6.t0);

              case 20:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, _this, [[0, 17]]);
      }));

      return function (_x5) {
        return _ref6.apply(this, arguments);
      };
    }();

    this._onDeviceSentMessage = function () {
      var _ref7 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee7(packet, isPublic, device) {
        var deviceID, deviceAttributes, ownerID, eventData, eventName, shouldSwallowEvent, cryptoString;
        return _regenerator2.default.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                _context7.prev = 0;
                deviceID = device.getID();
                _context7.next = 4;
                return _this._deviceAttributeRepository.getByID(deviceID);

              case 4:
                deviceAttributes = _context7.sent;
                ownerID = deviceAttributes && deviceAttributes.ownerID;
                eventData = {
                  connectionID: device.getConnectionKey(),
                  data: packet.payload.toString('utf8'),
                  deviceID: deviceID,
                  isPublic: isPublic,
                  name: _CoapMessages2.default.getUriPath(packet).substr(3),
                  ttl: _CoapMessages2.default.getMaxAge(packet)
                };
                eventName = eventData.name.toLowerCase();
                shouldSwallowEvent = false;

                // All spark events except special events should be hidden from the
                // event stream.

                if (eventName.startsWith('spark')) {
                  // These should always be private but let's make sure. This way
                  // if you are listening to a specific device you only see the system
                  // events from it.
                  eventData.isPublic = false;

                  shouldSwallowEvent = !SPECIAL_EVENTS.some(function (specialEvent) {
                    return eventName.startsWith(specialEvent);
                  });
                  if (shouldSwallowEvent) {
                    device.sendReply('EventAck', packet.messageId);
                  }
                }

                if (!shouldSwallowEvent && ownerID) {
                  _this._eventPublisher.publish((0, _extends3.default)({}, eventData, { userID: ownerID }));
                }

                if (!eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.CLAIM_CODE)) {
                  _context7.next = 14;
                  break;
                }

                _context7.next = 14;
                return _this._onDeviceClaimCodeMessage(packet, device);

              case 14:

                if (eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.GET_IP)) {
                  _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.GET_NAME, device.getRemoteIPAddress(), deviceID, ownerID);
                }

                if (eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.GET_NAME) && deviceAttributes) {
                  _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.GET_NAME, deviceAttributes.name, deviceID, ownerID);
                }

                if (eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.GET_RANDOM_BUFFER)) {
                  cryptoString = _crypto2.default.randomBytes(40).toString('base64').substring(0, 40);


                  _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.GET_RANDOM_BUFFER, cryptoString, deviceID, ownerID);
                }

                if (eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.IDENTITY)) {
                  // TODO - open up for possibility of retrieving multiple ID datums
                  // This is mostly for electron - You can get the IMEI and IICCID this way
                  // https://github.com/spark/firmware/blob/develop/system/src/system_cloud_internal.cpp#L682-L685
                  // https://github.com/spark/firmware/commit/73df5a4ac4c64f008f63a495d50f866d724c6201
                }

                if (eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.LAST_RESET)) {
                  _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.LAST_RESET, eventData.data, deviceID, ownerID);
                }

                if (eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.MAX_BINARY)) {
                  device.setMaxBinarySize((0, _parseInt2.default)((0, _nullthrows8.default)(eventData.data), 10));
                }

                if (eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.OTA_CHUNK_SIZE)) {
                  device.setOtaChunkSize((0, _parseInt2.default)((0, _nullthrows8.default)(eventData.data), 10));
                }

                if (!eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.SAFE_MODE)) {
                  _context7.next = 26;
                  break;
                }

                _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.SAFE_MODE, eventData.data, deviceID, ownerID);

                if (!_this._areSystemFirmwareAutoupdatesEnabled) {
                  _context7.next = 26;
                  break;
                }

                _context7.next = 26;
                return _this._updateDeviceSystemFirmware(device, ownerID);

              case 26:

                if (eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.SPARK_SUBSYSTEM)) {
                  // TODO: Test this with a Core device
                  // get patch version from payload
                  // compare with version on disc
                  // if device version is old, do OTA update with patch
                }
                _context7.next = 32;
                break;

              case 29:
                _context7.prev = 29;
                _context7.t0 = _context7['catch'](0);

                _logger2.default.error(_context7.t0);

              case 32:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, _this, [[0, 29]]);
      }));

      return function (_x6, _x7, _x8) {
        return _ref7.apply(this, arguments);
      };
    }();

    this._onDeviceClaimCodeMessage = function () {
      var _ref8 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee8(packet, device) {
        var claimCode, deviceID, deviceAttributes, claimRequestUserID;
        return _regenerator2.default.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                claimCode = packet.payload.toString('utf8');
                deviceID = device.getID();
                _context8.next = 4;
                return _this._deviceAttributeRepository.getByID(deviceID);

              case 4:
                deviceAttributes = _context8.sent;

                if (!(!deviceAttributes || deviceAttributes.ownerID || deviceAttributes.claimCode === claimCode)) {
                  _context8.next = 7;
                  break;
                }

                return _context8.abrupt('return');

              case 7:
                claimRequestUserID = _this._claimCodeManager.getUserIDByClaimCode(claimCode);

                if (claimRequestUserID) {
                  _context8.next = 10;
                  break;
                }

                return _context8.abrupt('return');

              case 10:
                _context8.next = 12;
                return _this._deviceAttributeRepository.updateByID(deviceID, {
                  claimCode: claimCode,
                  ownerID: claimRequestUserID
                });

              case 12:

                _this._claimCodeManager.removeClaimCode(claimCode);

              case 13:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, _this);
      }));

      return function (_x9, _x10) {
        return _ref8.apply(this, arguments);
      };
    }();

    this._onDeviceSubscribe = function () {
      var _ref9 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee9(packet, device) {
        var messageName, deviceID, deviceAttributes, ownerID, query, isFromMyDevices;
        return _regenerator2.default.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                // uri -> /e/?u    --> firehose for all my devices
                // uri -> /e/ (deviceid in body)   --> allowed
                // uri -> /e/    --> not allowed (no global firehose for cores, kthxplox)
                // uri -> /e/event_name?u    --> all my devices
                // uri -> /e/event_name?u (deviceid)    --> deviceid?
                messageName = _CoapMessages2.default.getUriPath(packet).substr(3);
                deviceID = device.getID();
                _context9.next = 4;
                return _this._deviceAttributeRepository.getByID(deviceID);

              case 4:
                deviceAttributes = _context9.sent;
                ownerID = deviceAttributes && deviceAttributes.ownerID;
                query = _CoapMessages2.default.getUriQuery(packet);
                isFromMyDevices = !!query.match('u');

                if (messageName) {
                  _context9.next = 11;
                  break;
                }

                device.sendReply('SubscribeFail', packet.messageId);
                return _context9.abrupt('return');

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
                return _context9.stop();
            }
          }
        }, _callee9, _this);
      }));

      return function (_x11, _x12) {
        return _ref9.apply(this, arguments);
      };
    }();

    this._onSparkServerCallDeviceFunctionRequest = function () {
      var _ref10 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee10(event) {
        var _nullthrows, deviceID, functionArguments, functionName, responseEventName, device;

        return _regenerator2.default.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                _nullthrows = (0, _nullthrows8.default)(event.context), deviceID = _nullthrows.deviceID, functionArguments = _nullthrows.functionArguments, functionName = _nullthrows.functionName, responseEventName = _nullthrows.responseEventName;
                _context10.prev = 1;
                device = _this.getDevice(deviceID);

                if (device) {
                  _context10.next = 5;
                  break;
                }

                throw new Error('Could not get device for ID');

              case 5:
                _context10.t0 = _this._eventPublisher;
                _context10.next = 8;
                return device.callFunction(functionName, functionArguments);

              case 8:
                _context10.t1 = _context10.sent;
                _context10.t2 = responseEventName;
                _context10.t3 = {
                  context: _context10.t1,
                  isPublic: false,
                  name: _context10.t2
                };

                _context10.t0.publish.call(_context10.t0, _context10.t3);

                _context10.next = 17;
                break;

              case 14:
                _context10.prev = 14;
                _context10.t4 = _context10['catch'](1);

                _this._eventPublisher.publish({
                  context: { error: _context10.t4 },
                  isPublic: false,
                  name: responseEventName
                });

              case 17:
              case 'end':
                return _context10.stop();
            }
          }
        }, _callee10, _this, [[1, 14]]);
      }));

      return function (_x13) {
        return _ref10.apply(this, arguments);
      };
    }();

    this._onSparkServerFlashDeviceRequest = function () {
      var _ref11 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee11(event) {
        var _nullthrows2, deviceID, fileBuffer, responseEventName, device;

        return _regenerator2.default.wrap(function _callee11$(_context11) {
          while (1) {
            switch (_context11.prev = _context11.next) {
              case 0:
                _nullthrows2 = (0, _nullthrows8.default)(event.context), deviceID = _nullthrows2.deviceID, fileBuffer = _nullthrows2.fileBuffer, responseEventName = _nullthrows2.responseEventName;
                _context11.prev = 1;
                device = _this.getDevice(deviceID);

                if (device) {
                  _context11.next = 5;
                  break;
                }

                throw new Error('Could not get device for ID');

              case 5:
                _context11.t0 = _this._eventPublisher;
                _context11.next = 8;
                return device.flash(fileBuffer);

              case 8:
                _context11.t1 = _context11.sent;
                _context11.t2 = responseEventName;
                _context11.t3 = {
                  context: _context11.t1,
                  isPublic: false,
                  name: _context11.t2
                };

                _context11.t0.publish.call(_context11.t0, _context11.t3);

                _context11.next = 17;
                break;

              case 14:
                _context11.prev = 14;
                _context11.t4 = _context11['catch'](1);

                _this._eventPublisher.publish({
                  context: { error: _context11.t4 },
                  isPublic: false,
                  name: responseEventName
                });

              case 17:
              case 'end':
                return _context11.stop();
            }
          }
        }, _callee11, _this, [[1, 14]]);
      }));

      return function (_x14) {
        return _ref11.apply(this, arguments);
      };
    }();

    this._onSparkServerGetDeviceDescriptionRequest = function () {
      var _ref12 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee12(event) {
        var _nullthrows3, deviceID, responseEventName, device;

        return _regenerator2.default.wrap(function _callee12$(_context12) {
          while (1) {
            switch (_context12.prev = _context12.next) {
              case 0:
                _nullthrows3 = (0, _nullthrows8.default)(event.context), deviceID = _nullthrows3.deviceID, responseEventName = _nullthrows3.responseEventName;
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
                return device.getDescription();

              case 8:
                _context12.t1 = _context12.sent;
                _context12.t2 = responseEventName;
                _context12.t3 = {
                  context: _context12.t1,
                  isPublic: false,
                  name: _context12.t2
                };

                _context12.t0.publish.call(_context12.t0, _context12.t3);

                _context12.next = 17;
                break;

              case 14:
                _context12.prev = 14;
                _context12.t4 = _context12['catch'](1);

                _this._eventPublisher.publish({
                  context: { error: _context12.t4 },
                  isPublic: false,
                  name: responseEventName
                });

              case 17:
              case 'end':
                return _context12.stop();
            }
          }
        }, _callee12, _this, [[1, 14]]);
      }));

      return function (_x15) {
        return _ref12.apply(this, arguments);
      };
    }();

    this._onSparkServerGetDeviceVariableValueRequest = function () {
      var _ref13 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee13(event) {
        var _nullthrows4, deviceID, responseEventName, variableName, device;

        return _regenerator2.default.wrap(function _callee13$(_context13) {
          while (1) {
            switch (_context13.prev = _context13.next) {
              case 0:
                _nullthrows4 = (0, _nullthrows8.default)(event.context), deviceID = _nullthrows4.deviceID, responseEventName = _nullthrows4.responseEventName, variableName = _nullthrows4.variableName;
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
                return device.getVariableValue(variableName);

              case 8:
                _context13.t1 = _context13.sent;
                _context13.t2 = {
                  result: _context13.t1
                };
                _context13.t3 = responseEventName;
                _context13.t4 = {
                  context: _context13.t2,
                  isPublic: false,
                  name: _context13.t3
                };

                _context13.t0.publish.call(_context13.t0, _context13.t4);

                _context13.next = 18;
                break;

              case 15:
                _context13.prev = 15;
                _context13.t5 = _context13['catch'](1);

                _this._eventPublisher.publish({
                  context: { error: _context13.t5 },
                  isPublic: false,
                  name: responseEventName
                });

              case 18:
              case 'end':
                return _context13.stop();
            }
          }
        }, _callee13, _this, [[1, 15]]);
      }));

      return function (_x16) {
        return _ref13.apply(this, arguments);
      };
    }();

    this._onSparkServerPingDeviceRequest = function () {
      var _ref14 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee14(event) {
        var _nullthrows5, deviceID, responseEventName, device, pingObject;

        return _regenerator2.default.wrap(function _callee14$(_context14) {
          while (1) {
            switch (_context14.prev = _context14.next) {
              case 0:
                _nullthrows5 = (0, _nullthrows8.default)(event.context), deviceID = _nullthrows5.deviceID, responseEventName = _nullthrows5.responseEventName;
                device = _this.getDevice(deviceID);
                pingObject = device ? device.ping() : {
                  connected: false,
                  lastPing: null
                };


                _this._eventPublisher.publish({
                  context: pingObject,
                  isPublic: false,
                  name: responseEventName
                });

              case 4:
              case 'end':
                return _context14.stop();
            }
          }
        }, _callee14, _this);
      }));

      return function (_x17) {
        return _ref14.apply(this, arguments);
      };
    }();

    this._onSparkServerRaiseYourHandRequest = function () {
      var _ref15 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee15(event) {
        var _nullthrows6, deviceID, responseEventName, shouldShowSignal, device;

        return _regenerator2.default.wrap(function _callee15$(_context15) {
          while (1) {
            switch (_context15.prev = _context15.next) {
              case 0:
                _nullthrows6 = (0, _nullthrows8.default)(event.context), deviceID = _nullthrows6.deviceID, responseEventName = _nullthrows6.responseEventName, shouldShowSignal = _nullthrows6.shouldShowSignal;
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
                return device.raiseYourHand(shouldShowSignal);

              case 8:
                _context15.t1 = _context15.sent;
                _context15.t2 = responseEventName;
                _context15.t3 = {
                  context: _context15.t1,
                  isPublic: false,
                  name: _context15.t2
                };

                _context15.t0.publish.call(_context15.t0, _context15.t3);

                _context15.next = 17;
                break;

              case 14:
                _context15.prev = 14;
                _context15.t4 = _context15['catch'](1);

                _this._eventPublisher.publish({
                  context: { error: _context15.t4 },
                  isPublic: false,
                  name: responseEventName
                });

              case 17:
              case 'end':
                return _context15.stop();
            }
          }
        }, _callee15, _this, [[1, 14]]);
      }));

      return function (_x18) {
        return _ref15.apply(this, arguments);
      };
    }();

    this.getDevice = function (deviceID) {
      return _this._devicesById.get(deviceID);
    };

    this.publishSpecialEvent = function (eventName, data, deviceID, userID) {
      if (!userID) {
        return;
      }
      var eventData = {
        data: data,
        deviceID: deviceID,
        isPublic: false,
        name: eventName,
        userID: userID
      };
      process.nextTick(function () {
        _this._eventPublisher.publish(eventData);
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

      this._eventPublisher.subscribe((0, _EventPublisher.getRequestEventName)(_SparkServerEvents2.default.GET_DEVICE_DESCRIPTION), this._onSparkServerGetDeviceDescriptionRequest);

      this._eventPublisher.subscribe((0, _EventPublisher.getRequestEventName)(_SparkServerEvents2.default.GET_DEVICE_VARIABLE_VALUE), this._onSparkServerGetDeviceVariableValueRequest);

      this._eventPublisher.subscribe((0, _EventPublisher.getRequestEventName)(_SparkServerEvents2.default.PING_DEVICE), this._onSparkServerPingDeviceRequest);

      this._eventPublisher.subscribe((0, _EventPublisher.getRequestEventName)(_SparkServerEvents2.default.RAISE_YOUR_HAND), this._onSparkServerRaiseYourHandRequest);

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