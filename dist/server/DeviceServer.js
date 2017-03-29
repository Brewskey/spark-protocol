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

var _net = require('net');

var _net2 = _interopRequireDefault(_net);

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _nullthrows = require('nullthrows');

var _nullthrows2 = _interopRequireDefault(_nullthrows);

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

var _Messages = require('../lib/Messages');

var _Messages2 = _interopRequireDefault(_Messages);

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
        return _regenerator2.default.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                _context4.prev = 0;
                return _context4.delegateYield(_regenerator2.default.mark(function _callee3() {
                  var connectionKey, handshake, device, deviceID, deviceAttributes, ownerID;
                  return _regenerator2.default.wrap(function _callee3$(_context3) {
                    while (1) {
                      switch (_context3.prev = _context3.next) {
                        case 0:
                          connectionIdCounter += 1;
                          connectionKey = '_' + connectionIdCounter;
                          handshake = new _Handshake2.default(_this._cryptoManager);
                          device = new _Device2.default(socket, connectionKey, handshake);


                          _logger2.default.log('Connection from: ' + device.getRemoteIPAddress() + ' - ' + ('Connection ID: ' + connectionIdCounter));

                          _context3.next = 7;
                          return device.startupProtocol();

                        case 7:
                          deviceID = device.getID();
                          _context3.next = 10;
                          return _this._deviceAttributeRepository.getById(device.getID());

                        case 10:
                          deviceAttributes = _context3.sent;
                          ownerID = deviceAttributes && deviceAttributes.ownerID;


                          device.on(_Device.DEVICE_EVENT_NAMES.READY, function () {
                            return _this._onDeviceReady(device);
                          });

                          device.on(_Device.DEVICE_EVENT_NAMES.DISCONNECT, function () {
                            return _this._onDeviceDisconnect(device);
                          });

                          device.on(_Device.DEVICE_MESSAGE_EVENTS_NAMES.SUBSCRIBE, function (message) {
                            return _this._onDeviceSubscribe(message, device);
                          });

                          device.on(_Device.DEVICE_MESSAGE_EVENTS_NAMES.PRIVATE_EVENT, function (message) {
                            return _this._onDeviceSentMessage(message, /* isPublic */false, device);
                          });

                          device.on(_Device.DEVICE_MESSAGE_EVENTS_NAMES.PUBLIC_EVENT, function (message) {
                            return _this._onDeviceSentMessage(message, /* isPublic */true, device);
                          });

                          device.on(_Device.DEVICE_MESSAGE_EVENTS_NAMES.GET_TIME, function (message) {
                            return _this._onDeviceGetTime(message, device);
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

                          device.ready();

                        case 22:
                        case 'end':
                          return _context3.stop();
                      }
                    }
                  }, _callee3, _this);
                })(), 't0', 2);

              case 2:
                _context4.next = 7;
                break;

              case 4:
                _context4.prev = 4;
                _context4.t1 = _context4['catch'](0);

                _logger2.default.error('Device startup failed: ' + _context4.t1.message);

              case 7:
              case 'end':
                return _context4.stop();
            }
          }
        }, _callee4, _this, [[0, 4]]);
      }));

      return function (_x3) {
        return _ref3.apply(this, arguments);
      };
    }();

    this._onDeviceDisconnect = function () {
      var _ref4 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5(device) {
        var deviceID, newDevice, connectionKey, deviceAttributes, ownerID;
        return _regenerator2.default.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                deviceID = device.getID();
                newDevice = _this._devicesById.get(deviceID);

                if (!(device !== newDevice)) {
                  _context5.next = 4;
                  break;
                }

                return _context5.abrupt('return');

              case 4:

                _this._devicesById.delete(deviceID);
                _this._eventPublisher.unsubscribeBySubscriberID(deviceID);

                connectionKey = device.getConnectionKey();
                _context5.next = 9;
                return _this._deviceAttributeRepository.getById(deviceID);

              case 9:
                deviceAttributes = _context5.sent;
                _context5.next = 12;
                return _this._deviceAttributeRepository.update((0, _extends3.default)({}, deviceAttributes, {
                  lastHeard: device.ping().lastPing
                }));

              case 12:
                ownerID = deviceAttributes && deviceAttributes.ownerID;


                _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.SPARK_STATUS, 'offline', deviceID, ownerID);
                _logger2.default.log('Session ended for device with ID: ' + deviceID + ' with connectionKey: ' + ('' + (connectionKey || 'no connection key')));

              case 15:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, _this);
      }));

      return function (_x4) {
        return _ref4.apply(this, arguments);
      };
    }();

    this._onDeviceGetTime = function (message, device) {
      var timeStamp = (0, _moment2.default)().utc().unix();
      var binaryValue = _Messages2.default.toBinary(timeStamp, 'uint32');

      device.sendReply('GetTimeReturn', message.getId(), binaryValue, message.getToken());
    };

    this._onDeviceReady = function () {
      var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee6(device) {
        var deviceID, existingConnection, existingAttributes, ownerID, description, _FirmwareManager$getA, uuid, deviceAttributes;

        return _regenerator2.default.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                _context6.prev = 0;

                _logger2.default.log('Device online!');
                deviceID = device.getID();

                if (!_this._devicesById.has(deviceID)) {
                  _context6.next = 8;
                  break;
                }

                existingConnection = _this._devicesById.get(deviceID);

                (0, _nullthrows2.default)(existingConnection).disconnect('Device was already connected. Reconnecting.\r\n');

                _context6.next = 8;
                return _this._onDeviceDisconnect(device);

              case 8:

                _this._devicesById.set(deviceID, device);

                _context6.next = 11;
                return _this._deviceAttributeRepository.getById(deviceID);

              case 11:
                existingAttributes = _context6.sent;
                ownerID = existingAttributes && existingAttributes.ownerID;


                _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.SPARK_STATUS, 'online', deviceID, ownerID);

                _context6.next = 16;
                return device.getDescription();

              case 16:
                description = _context6.sent;
                _FirmwareManager$getA = _FirmwareManager2.default.getAppModule(description.systemInformation), uuid = _FirmwareManager$getA.uuid;
                deviceAttributes = (0, _extends3.default)({
                  name: NAME_GENERATOR.choose()
                }, existingAttributes, {
                  appHash: uuid,
                  deviceID: deviceID,
                  ip: device.getRemoteIPAddress(),
                  lastHeard: new Date(),
                  particleProductId: description.productID,
                  productFirmwareVersion: description.firmwareVersion
                });


                _this._deviceAttributeRepository.update(deviceAttributes);

                // Send app-hash if this is a new app firmware
                if (!existingAttributes || uuid !== existingAttributes.appHash) {
                  _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.APP_HASH, uuid, deviceID, ownerID);
                }
                _context6.next = 26;
                break;

              case 23:
                _context6.prev = 23;
                _context6.t0 = _context6['catch'](0);

                _logger2.default.error(_context6.t0);

              case 26:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, _this, [[0, 23]]);
      }));

      return function (_x5) {
        return _ref5.apply(this, arguments);
      };
    }();

    this._onDeviceSentMessage = function () {
      var _ref6 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee8(message, isPublic, device) {
        return _regenerator2.default.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                _context8.prev = 0;
                return _context8.delegateYield(_regenerator2.default.mark(function _callee7() {
                  var deviceID, deviceAttributes, ownerID, eventData, eventName, shouldSwallowEvent, cryptoString;
                  return _regenerator2.default.wrap(function _callee7$(_context7) {
                    while (1) {
                      switch (_context7.prev = _context7.next) {
                        case 0:
                          deviceID = device.getID();
                          _context7.next = 3;
                          return _this._deviceAttributeRepository.getById(deviceID);

                        case 3:
                          deviceAttributes = _context7.sent;
                          ownerID = deviceAttributes && deviceAttributes.ownerID;
                          eventData = {
                            connectionID: device.getConnectionKey(),
                            data: message.getPayloadLength() === 0 ? '' : message.getPayload().toString(),
                            deviceID: deviceID,
                            isPublic: isPublic,
                            name: message.getUriPath().substr(3),
                            ttl: message.getMaxAge()
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
                              device.sendReply('EventAck', message.getId());
                            }
                          }

                          if (!shouldSwallowEvent && ownerID) {
                            _this._eventPublisher.publish((0, _extends3.default)({}, eventData, { userID: ownerID }));
                          }

                          if (!eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.CLAIM_CODE)) {
                            _context7.next = 13;
                            break;
                          }

                          _context7.next = 13;
                          return _this._onDeviceClaimCodeMessage(message, device);

                        case 13:

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
                            device.setMaxBinarySize((0, _parseInt2.default)((0, _nullthrows2.default)(eventData.data), 10));
                          }

                          if (eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.OTA_CHUNK_SIZE)) {
                            device.setOtaChunkSize((0, _parseInt2.default)((0, _nullthrows2.default)(eventData.data), 10));
                          }

                          if (!eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.SAFE_MODE)) {
                            _context7.next = 25;
                            break;
                          }

                          _this.publishSpecialEvent(_Device.SYSTEM_EVENT_NAMES.SAFE_MODE, eventData.data, deviceID, ownerID);

                          if (!_this._areSystemFirmwareAutoupdatesEnabled) {
                            _context7.next = 25;
                            break;
                          }

                          _context7.next = 25;
                          return _this._updateDeviceSystemFirmware(device, ownerID);

                        case 25:

                          if (eventName.startsWith(_Device.SYSTEM_EVENT_NAMES.SPARK_SUBSYSTEM)) {
                            // TODO: Test this with a Core device
                            // get patch version from payload
                            // compare with version on disc
                            // if device version is old, do OTA update with patch
                          }

                        case 26:
                        case 'end':
                          return _context7.stop();
                      }
                    }
                  }, _callee7, _this);
                })(), 't0', 2);

              case 2:
                _context8.next = 7;
                break;

              case 4:
                _context8.prev = 4;
                _context8.t1 = _context8['catch'](0);

                _logger2.default.error(_context8.t1);

              case 7:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, _this, [[0, 4]]);
      }));

      return function (_x6, _x7, _x8) {
        return _ref6.apply(this, arguments);
      };
    }();

    this._onDeviceClaimCodeMessage = function () {
      var _ref7 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee9(message, device) {
        var claimCode, deviceID, deviceAttributes, claimRequestUserID;
        return _regenerator2.default.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                claimCode = message.getPayload().toString();
                deviceID = device.getID();
                _context9.next = 4;
                return _this._deviceAttributeRepository.getById(deviceID);

              case 4:
                deviceAttributes = _context9.sent;

                if (!(!deviceAttributes || deviceAttributes.ownerID || deviceAttributes.claimCode === claimCode)) {
                  _context9.next = 7;
                  break;
                }

                return _context9.abrupt('return');

              case 7:
                claimRequestUserID = _this._claimCodeManager.getUserIDByClaimCode(claimCode);

                if (claimRequestUserID) {
                  _context9.next = 10;
                  break;
                }

                return _context9.abrupt('return');

              case 10:
                _context9.next = 12;
                return _this._deviceAttributeRepository.update((0, _extends3.default)({}, deviceAttributes, {
                  claimCode: claimCode,
                  ownerID: claimRequestUserID
                }));

              case 12:

                _this._claimCodeManager.removeClaimCode(claimCode);

              case 13:
              case 'end':
                return _context9.stop();
            }
          }
        }, _callee9, _this);
      }));

      return function (_x9, _x10) {
        return _ref7.apply(this, arguments);
      };
    }();

    this._onDeviceSubscribe = function () {
      var _ref8 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee10(message, device) {
        var messageName, deviceID, deviceAttributes, ownerID, query, isFromMyDevices;
        return _regenerator2.default.wrap(function _callee10$(_context10) {
          while (1) {
            switch (_context10.prev = _context10.next) {
              case 0:
                // uri -> /e/?u    --> firehose for all my devices
                // uri -> /e/ (deviceid in body)   --> allowed
                // uri -> /e/    --> not allowed (no global firehose for cores, kthxplox)
                // uri -> /e/event_name?u    --> all my devices
                // uri -> /e/event_name?u (deviceid)    --> deviceid?
                messageName = message.getUriPath().substr(3);
                deviceID = device.getID();
                _context10.next = 4;
                return _this._deviceAttributeRepository.getById(deviceID);

              case 4:
                deviceAttributes = _context10.sent;
                ownerID = deviceAttributes && deviceAttributes.ownerID;
                query = message.getUriQuery();
                isFromMyDevices = query && !!query.match('u');

                if (messageName) {
                  _context10.next = 11;
                  break;
                }

                device.sendReply('SubscribeFail', message.getId());
                return _context10.abrupt('return');

              case 11:

                _logger2.default.log('Subscribe Request:\r\n', {
                  deviceID: deviceID,
                  isFromMyDevices: isFromMyDevices,
                  messageName: messageName
                });

                if (ownerID) {
                  _context10.next = 16;
                  break;
                }

                device.sendReply('SubscribeAck', message.getId());
                _logger2.default.log('device with ID ' + deviceID + ' wasn\'t subscribed to' + (messageName + ' event: the device is unclaimed.'));
                return _context10.abrupt('return');

              case 16:

                _this._eventPublisher.subscribe(messageName, device.onDeviceEvent, {
                  connectionID: device.getConnectionKey(),
                  mydevices: isFromMyDevices,
                  userID: ownerID
                }, deviceID);

                device.sendReply('SubscribeAck', message.getId());

              case 18:
              case 'end':
                return _context10.stop();
            }
          }
        }, _callee10, _this);
      }));

      return function (_x11, _x12) {
        return _ref8.apply(this, arguments);
      };
    }();

    this.getDevice = function (deviceID) {
      return _this._devicesById.get(deviceID);
    };

    this.publishSpecialEvent = function (eventName, data, deviceID, userID) {
      if (!userID) {
        return;
      }
      _this._eventPublisher.publish({
        data: data,
        deviceID: deviceID,
        isPublic: false,
        name: eventName,
        userID: userID
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

      var server = _net2.default.createServer(function (socket) {
        return process.nextTick(function () {
          return _this2._onNewSocketConnection(socket);
        });
      });

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