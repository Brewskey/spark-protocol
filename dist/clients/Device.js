'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DEVICE_STATUS_MAP = exports.DEVICE_MESSAGE_EVENTS_NAMES = exports.SYSTEM_EVENT_NAMES = exports.DEVICE_EVENT_NAMES = undefined;

var _values = require('babel-runtime/core-js/object/values');

var _values2 = _interopRequireDefault(_values);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _CoapMessage = require('../lib/CoapMessage');

var _CoapMessage2 = _interopRequireDefault(_CoapMessage);

var _coapPacket = require('coap-packet');

var _coapPacket2 = _interopRequireDefault(_coapPacket);

var _CryptoManager = require('../lib/CryptoManager');

var _CryptoManager2 = _interopRequireDefault(_CryptoManager);

var _FileTransferStore = require('../lib/FileTransferStore');

var _FileTransferStore2 = _interopRequireDefault(_FileTransferStore);

var _CoapMessages = require('../lib/CoapMessages');

var _CoapMessages2 = _interopRequireDefault(_CoapMessages);

var _Flasher = require('../lib/Flasher');

var _Flasher2 = _interopRequireDefault(_Flasher);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _logger = require('../lib/logger');

var _logger2 = _interopRequireDefault(_logger);

var _nullthrows = require('nullthrows');

var _nullthrows2 = _interopRequireDefault(_nullthrows);

var _settings = require('../settings');

var _settings2 = _interopRequireDefault(_settings);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Hello — sent first by Device then by Server immediately after handshake, never again
// Ignored — sent by either side to respond to a message with a bad counter value.
// The receiver of an Ignored message can optionally decide to resend a previous message
// if the indicated bad counter value matches a recently sent message.

// package flasher
// Chunk — sent by Server to send chunks of a firmware binary to Device
// ChunkReceived — sent by Device to respond to each chunk,
// indicating the CRC of the received chunk data.
// if Server receives CRC that does not match the chunk just sent, that chunk is sent again
// UpdateBegin — sent by Server to initiate an OTA firmware update
// UpdateReady — sent by Device to indicate readiness to receive firmware chunks
// UpdateDone — sent by Server to indicate all firmware chunks have been sent

// FunctionCall — sent by Server to tell Device to call a user-exposed function
// FunctionReturn — sent by Device in response to FunctionCall to indicate return value.
// void functions will not send this message
// VariableRequest — sent by Server to request the value of a user-exposed variable
// VariableValue — sent by Device in response to VariableRequest to indicate the value

// Event — sent by Device to initiate a Server Sent Event and optionally
// an HTTP callback to a 3rd party
// KeyChange — sent by Server to change the AES credentials

/**
 * How high do our counters go before we wrap around to 0?
 * (CoAP maxes out at a 16 bit int)
 */
/*
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
*   Lesser General Public License for more .
*
*   You should have received a copy of the GNU Lesser General Public
*   License along with this program; if not, see <http://www.gnu.org/licenses/>.
*
* 
*
*/

var COUNTER_MAX = 65536;
/**
 * How big can our tokens be in CoAP messages?
 */
var TOKEN_COUNTER_MAX = 256;
var KEEP_ALIVE_TIMEOUT = _settings2.default.KEEP_ALIVE_TIMEOUT;
var SOCKET_TIMEOUT = _settings2.default.SOCKET_TIMEOUT;

var DEVICE_EVENT_NAMES = exports.DEVICE_EVENT_NAMES = {
  DISCONNECT: 'disconnect',
  FLASH_FAILED: 'flash/failed',
  FLASH_STARTED: 'flash/started',
  FLASH_SUCCESS: 'flash/success',
  READY: 'ready'
};

var SYSTEM_EVENT_NAMES = exports.SYSTEM_EVENT_NAMES = {
  APP_HASH: 'spark/device/app-hash',
  CLAIM_CODE: 'spark/device/claim/code',
  FLASH_AVAILABLE: 'spark/flash/available',
  FLASH_PROGRESS: 'spark/flash/progress',
  FLASH_STATUS: 'spark/flash/status',
  GET_IP: 'spark/device/ip',
  GET_NAME: 'spark/device/name',
  GET_RANDOM_BUFFER: 'spark/device/random',
  IDENTITY: 'spark/device/ident/0',
  LAST_RESET: 'spark/device/last_reset', // This should just have a friendly string in its payload.
  MAX_BINARY: 'spark/hardware/max_binary',
  OTA_CHUNK_SIZE: 'spark/hardware/ota_chunk_size',
  RESET: 'spark/device/reset', // send this to reset passing "safe mode"/"dfu"/"reboot"
  SAFE_MODE: 'spark/device/safemode',
  SAFE_MODE_UPDATING: 'spark/safe-mode-updater/updating',
  SPARK_STATUS: 'spark/status',
  SPARK_SUBSYSTEM: 'spark/cc3000-patch-version'
};

// These constants should be consistent with message names in
// MessageSpecifications.js
var DEVICE_MESSAGE_EVENTS_NAMES = exports.DEVICE_MESSAGE_EVENTS_NAMES = {
  GET_TIME: 'GetTime',
  PRIVATE_EVENT: 'PrivateEvent',
  PUBLIC_EVENT: 'PublicEvent',
  SUBSCRIBE: 'Subscribe'
};

var DEVICE_STATUS_MAP = exports.DEVICE_STATUS_MAP = {
  GOT_DESCRIPTION: 3,
  GOT_HELLO: 2,
  INITIAL: 1,
  READY: 4
};

var NEW_STATUS_EVENT_NAME = 'newStatus';

/**
 * Implementation of the Particle messaging protocol
 * @Device
 */

var Device = function (_EventEmitter) {
  (0, _inherits3.default)(Device, _EventEmitter);

  function Device(socket, connectionKey, handshake) {
    var _this2 = this;

    (0, _classCallCheck3.default)(this, Device);

    var _this = (0, _possibleConstructorReturn3.default)(this, (Device.__proto__ || (0, _getPrototypeOf2.default)(Device)).call(this));

    _this._attributes = {
      appHash: null,
      deviceID: '',
      functions: null,
      ip: 'unkonwn',
      lastHeard: null,
      name: '',
      ownerID: null,
      particleProductId: 0,
      platformId: 0,
      productFirmwareVersion: 0,
      registrar: null,
      reservedFlags: 0,
      variables: null
    };
    _this._cipherStream = null;
    _this._connectionKey = null;
    _this._connectionStartTime = null;
    _this._decipherStream = null;
    _this._disconnectCounter = 0;
    _this._maxBinarySize = null;
    _this._otaChunkSize = null;
    _this._receiveCounter = 0;
    _this._sendCounter = 0;
    _this._sendToken = 0;
    _this._socketTimeoutInterval = null;
    _this._status = DEVICE_STATUS_MAP.INITIAL;
    _this._statusEventEmitter = new _events2.default();
    _this._tokens = {};

    _this.getAttributes = function () {
      return _this._attributes;
    };

    _this.getStatus = function () {
      return _this._status;
    };

    _this.getSystemInformation = function () {
      return (0, _nullthrows2.default)(_this._systemInformation);
    };

    _this.updateAttributes = function (attributes) {
      _this._attributes = (0, _extends3.default)({}, _this._attributes, attributes);

      return _this._attributes;
    };

    _this.setMaxBinarySize = function (maxBinarySize) {
      _this._maxBinarySize = maxBinarySize;
    };

    _this.setOtaChunkSize = function (maxBinarySize) {
      _this._otaChunkSize = maxBinarySize;
    };

    _this.setStatus = function (status) {
      _this._status = status;
      _this._statusEventEmitter.emit(NEW_STATUS_EVENT_NAME, status);
    };

    _this.hasStatus = function () {
      var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(status) {
        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                if (!(status <= _this._status)) {
                  _context.next = 2;
                  break;
                }

                return _context.abrupt('return', _promise2.default.resolve());

              case 2:
                return _context.abrupt('return', new _promise2.default(function (resolve) {
                  var deviceStatusListener = function deviceStatusListener(newStatus) {
                    if (status <= newStatus) {
                      resolve();
                      _this._statusEventEmitter.removeListener(NEW_STATUS_EVENT_NAME, deviceStatusListener);
                    }
                  };

                  _this._statusEventEmitter.on(NEW_STATUS_EVENT_NAME, deviceStatusListener);
                }));

              case 3:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, _this2);
      }));

      return function (_x) {
        return _ref.apply(this, arguments);
      };
    }();

    _this.startProtocolInitialization = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2() {
      return _regenerator2.default.wrap(function _callee2$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _this._socket.setNoDelay(true);
              _this._socket.setKeepAlive(true, KEEP_ALIVE_TIMEOUT); // every 15 second(s)
              _this._socket.setTimeout(SOCKET_TIMEOUT);

              _this._socket.on('error', function (error) {
                return _this.disconnect('socket error: ' + error.message);
              });
              _this._socket.on('close', function () {
                return _this.disconnect('socket close');
              });
              _this._socket.on('timeout', function () {
                return _this.disconnect('socket timeout');
              });

              _context2.next = 8;
              return _this.startHandshake();

            case 8:
              return _context2.abrupt('return', _context2.sent);

            case 9:
            case 'end':
              return _context2.stop();
          }
        }
      }, _callee2, _this2);
    }));
    _this.startHandshake = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3() {
      var result, cipherStream, decipherStream, deviceID, handshakeBuffer, getHelloInfo;
      return _regenerator2.default.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              _context3.prev = 0;
              _context3.next = 3;
              return _this._handshake.start(_this);

            case 3:
              result = _context3.sent;

              if (result) {
                _context3.next = 6;
                break;
              }

              throw new Error('Handshake result undefined');

            case 6:
              cipherStream = result.cipherStream, decipherStream = result.decipherStream, deviceID = result.deviceID, handshakeBuffer = result.handshakeBuffer;


              _this._cipherStream = cipherStream;
              _this._decipherStream = decipherStream;

              getHelloInfo = _this._getHello(handshakeBuffer);


              _this.updateAttributes((0, _extends3.default)({}, getHelloInfo || {}, {
                deviceID: deviceID,
                ip: _this.getRemoteIPAddress()
              }));
              _this.setStatus(DEVICE_STATUS_MAP.GOT_HELLO);

              return _context3.abrupt('return', deviceID);

            case 15:
              _context3.prev = 15;
              _context3.t0 = _context3['catch'](0);

              _this.disconnect(_context3.t0);
              throw _context3.t0;

            case 19:
            case 'end':
              return _context3.stop();
          }
        }
      }, _callee3, _this2, [[0, 15]]);
    }));
    _this.completeProtocolInitialization = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4() {
      var decipherStream, _ref5, _functionState, _systemInformation;

      return _regenerator2.default.wrap(function _callee4$(_context4) {
        while (1) {
          switch (_context4.prev = _context4.next) {
            case 0:
              _context4.prev = 0;
              decipherStream = _this._decipherStream;

              if (decipherStream) {
                _context4.next = 4;
                break;
              }

              throw new Error('decipherStream not set.');

            case 4:

              decipherStream.on('readable', function () {
                var read = function read() {
                  return decipherStream.read();
                };

                var chunk = read();
                while (chunk !== null) {
                  _this._clientHasWrittenToSocket();
                  _this.routeMessage(chunk);
                  chunk = read();
                }
                _this._clientHasWrittenToSocket();
              });

              // Wait for this thing to be readable before sending any messages
              /* await new Promise((resolve: () => void) => {
                decipherStream.once('readable', resolve);
              });*/

              _this._sendHello();
              _this._connectionStartTime = new Date();

              _context4.next = 9;
              return _this._getDescription();

            case 9:
              _ref5 = _context4.sent;
              _functionState = _ref5.functionState;
              _systemInformation = _ref5.systemInformation;

              _this._systemInformation = _systemInformation;

              _this.updateAttributes({
                functions: (0, _nullthrows2.default)(_functionState).f,
                variables: (0, _nullthrows2.default)(_functionState).v
              });

              _this.setStatus(DEVICE_STATUS_MAP.GOT_DESCRIPTION);

              _logger2.default.log('On device protocol initialization complete:\r\n', {
                cache_key: _this._connectionKey,
                deviceID: _this.getDeviceID(),
                firmwareVersion: _this._attributes.productFirmwareVersion,
                ip: _this.getRemoteIPAddress(),
                platformID: _this._attributes.platformId,
                productID: _this._attributes.particleProductId
              });

              return _context4.abrupt('return', _systemInformation);

            case 19:
              _context4.prev = 19;
              _context4.t0 = _context4['catch'](0);
              throw new Error('completeProtocolInitialization: ' + _context4.t0);

            case 22:
            case 'end':
              return _context4.stop();
          }
        }
      }, _callee4, _this2, [[0, 19]]);
    }));

    _this._clientHasWrittenToSocket = function () {
      if (_this._socketTimeoutInterval) {
        clearTimeout(_this._socketTimeoutInterval);
      }
      _this._socketTimeoutInterval = setTimeout(function () {
        return _this.disconnect('socket timeout');
      }, SOCKET_TIMEOUT);
    };

    _this._getHello = function (chunk) {
      var message = _CoapMessages2.default.unwrap(chunk);
      if (!message) {
        throw new Error('failed to parse hello');
      }

      _this._receiveCounter = message.messageId;

      try {
        var payload = message.payload;
        if (payload.length <= 0) {
          return null;
        }

        return {
          particleProductId: payload.readUInt16BE(0),
          platformId: payload.readUInt16BE(6),
          productFirmwareVersion: payload.readUInt16BE(2),
          reservedFlags: payload.readUInt16BE(4)
        };
      } catch (error) {
        _logger2.default.log('error while parsing hello payload ', error);
        return null;
      }
    };

    _this._sendHello = function () {
      // client will set the counter property on the message
      _this._sendCounter = _CryptoManager2.default.getRandomUINT16();
      _this.sendMessage('Hello');
    };

    _this.ping = function () {
      if (_settings2.default.logApiMessages) {
        _logger2.default.log('Pinged, replying', { deviceID: _this.getDeviceID() });
      }

      return {
        connected: _this._socket !== null,
        lastHeard: _this._attributes.lastHeard
      };
    };

    _this.routeMessage = function (data) {
      var packet = _CoapMessages2.default.unwrap(data);

      if (!packet) {
        _logger2.default.error('routeMessage got a NULL coap message ', {
          deviceID: _this.getDeviceID()
        });
        return;
      }

      // make sure the packet always has a number for code...
      packet.code = parseFloat(packet.code);

      // Get the message code (the decimal portion of the code) to determine
      // how we should handle the message
      var messageCode = packet.code;
      var requestType = '';
      if (messageCode > _CoapMessage2.default.Code.EMPTY && messageCode <= _CoapMessage2.default.Code.DELETE) {
        // probably a request
        requestType = _CoapMessages2.default.getRequestType(packet);
      }

      if (!requestType) {
        requestType = _this._getResponseType(packet.token);
      }

      // This is just a dumb ack packet. We don't really need to do anything
      // with it.
      if (packet.ack) {
        if (!requestType) {
          // no type, can't route it.
          requestType = 'PingAck';
        }

        _this.emit(requestType, packet);
        return;
      }

      _this._incrementReceiveCounter();
      if (packet.code === 0 && packet.confirmable) {
        _this.updateAttributes({ lastHeard: new Date() });
        _this.sendReply('PingAck', packet.messageId);
        return;
      }

      if (!packet || packet.messageId !== _this._receiveCounter) {
        _logger2.default.log('got counter ', packet.messageId, ' expecting ', _this._receiveCounter, { deviceID: _this.getDeviceID() });

        if (requestType === 'Ignored') {
          // don't ignore an ignore...
          _this.disconnect('Got an Ignore');
          return;
        }

        // this.sendMessage('Ignored', null, {}, null, null);
        _this.disconnect('Bad Counter');
        return;
      }

      _this.emit(requestType || '', packet);
    };

    _this.sendReply = function (messageName, id, data, token, requester) {
      if (!_this._isSocketAvailable(requester || null, messageName)) {
        _logger2.default.error('This client has an exclusive lock.');
        return;
      }

      // if my reply is an acknowledgement to a confirmable message
      // then I need to re-use the message id...

      // set our counter
      if (id < 0) {
        _this._incrementSendCounter();
        id = _this._sendCounter; // eslint-disable-line no-param-reassign
      }

      var message = _CoapMessages2.default.wrap(messageName, id, null, null, data, token);
      if (!message) {
        _logger2.default.error('Device - could not unwrap message', {
          deviceID: _this.getDeviceID()
        });
        return;
      }

      if (!_this._cipherStream) {
        _logger2.default.error('Device - sendReply before READY', {
          deviceID: _this.getDeviceID()
        });
        return;
      }
      _this._cipherStream.write(message);
    };

    _this.sendMessage = function (messageName, params, options, data, requester) {
      if (!_this._isSocketAvailable(requester, messageName)) {
        _logger2.default.error('This client has an exclusive lock.');
        return -1;
      }

      // increment our counter
      _this._incrementSendCounter();

      var token = null;
      if (!_CoapMessages2.default.isNonTypeMessage(messageName)) {
        _this._incrementSendToken();
        _this._useToken(messageName, _this._sendToken);
        token = _this._sendToken;
      }

      var message = _CoapMessages2.default.wrap(messageName, _this._sendCounter, params, options, data, token);

      if (!message) {
        _logger2.default.error('Could not wrap message', messageName, params, data);
        return -1;
      }

      if (!_this._cipherStream) {
        _logger2.default.error('Client - sendMessage before READY', {
          deviceID: _this.getDeviceID(),
          messageName: messageName
        });
      }

      process.nextTick(function () {
        return !!_this._cipherStream && _this._cipherStream.write(message);
      });

      return token || 0;
    };

    _this.listenFor = function () {
      var _ref6 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5(eventName, uri, token) {
        var tokenHex, beVerbose;
        return _regenerator2.default.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                tokenHex = token ? _this._toHexString(token) : null;
                beVerbose = _settings2.default.SHOW_VERBOSE_DEVICE_LOGS;
                return _context5.abrupt('return', new _promise2.default(function (resolve, reject) {
                  var timeout = setTimeout(function () {
                    cleanUpListeners();
                    reject(new Error('Request timed out', eventName));
                  }, KEEP_ALIVE_TIMEOUT);

                  // adds a one time event
                  var handler = function handler(packet) {
                    clearTimeout(timeout);
                    var packetUri = _CoapMessages2.default.getUriPath(packet);
                    if (uri && packetUri.indexOf(uri) !== 0) {
                      if (beVerbose) {
                        _logger2.default.log('URI filter did not match', uri, packetUri, {
                          deviceID: _this.getDeviceID()
                        });
                      }
                      return;
                    }

                    var packetTokenHex = packet.token.toString('hex');
                    if (tokenHex && tokenHex !== packetTokenHex) {
                      if (beVerbose) {
                        _logger2.default.log('Tokens did not match ', tokenHex, packetTokenHex, {
                          deviceID: _this.getDeviceID()
                        });
                      }
                      return;
                    }

                    cleanUpListeners();
                    resolve(packet);
                  };

                  var disconnectHandler = function disconnectHandler() {
                    cleanUpListeners();
                    reject();
                  };

                  var cleanUpListeners = function cleanUpListeners() {
                    _this.removeListener(eventName, handler);
                    _this.removeListener('disconnect', disconnectHandler);
                  };

                  _this.on(eventName, handler);
                  _this.on('disconnect', disconnectHandler);
                }));

              case 3:
              case 'end':
                return _context5.stop();
            }
          }
        }, _callee5, _this2);
      }));

      return function (_x2, _x3, _x4) {
        return _ref6.apply(this, arguments);
      };
    }();

    _this._increment = function (counter, maxSize) {
      var resultCounter = counter + 1;
      return resultCounter < maxSize ? resultCounter : 0;
    };

    _this._incrementSendCounter = function () {
      _this._sendCounter = _this._increment(_this._sendCounter, COUNTER_MAX);
    };

    _this._incrementReceiveCounter = function () {
      _this._receiveCounter = _this._increment(_this._receiveCounter, COUNTER_MAX);
    };

    _this._incrementSendToken = function () {
      _this._sendToken = _this._increment(_this._sendToken, TOKEN_COUNTER_MAX);
      _this._clearToken(_this._sendToken);
      return _this._sendToken;
    };

    _this._useToken = function (name, sendToken) {
      var key = _this._toHexString(sendToken);

      if (_this._tokens[key]) {
        throw new Error('Token ' + name + ' ' + _this._tokens[key] + ' ' + key + ' already in use');
      }

      _this._tokens[key] = name;
    };

    _this._clearToken = function (sendToken) {
      var key = _this._toHexString(sendToken);

      if (_this._tokens[key]) {
        delete _this._tokens[key];
      }
    };

    _this._getResponseType = function (token) {
      var tokenString = token.toString('hex');
      var request = _this._tokens[tokenString];
      if (!request) {
        return '';
      }

      return _CoapMessages2.default.getResponseType(request);
    };

    _this.getVariableValue = function () {
      var _ref7 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee6(name) {
        var isBusy, messageToken, message;
        return _regenerator2.default.wrap(function _callee6$(_context6) {
          while (1) {
            switch (_context6.prev = _context6.next) {
              case 0:
                isBusy = !_this._isSocketAvailable(null);

                if (!isBusy) {
                  _context6.next = 3;
                  break;
                }

                throw new Error('This device is locked during the flashing process.');

              case 3:
                _context6.next = 5;
                return _this.hasStatus(DEVICE_STATUS_MAP.READY);

              case 5:
                if (_this._hasParticleVariable(name)) {
                  _context6.next = 7;
                  break;
                }

                throw new Error('Variable not found');

              case 7:
                messageToken = _this.sendMessage('VariableRequest', { name: name });
                _context6.next = 10;
                return _this.listenFor('VariableValue', null, messageToken);

              case 10:
                message = _context6.sent;
                return _context6.abrupt('return', _this._transformVariableResult(name, message));

              case 12:
              case 'end':
                return _context6.stop();
            }
          }
        }, _callee6, _this2);
      }));

      return function (_x5) {
        return _ref7.apply(this, arguments);
      };
    }();

    _this.callFunction = function () {
      var _ref8 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee7(functionName, functionArguments) {
        var isBusy, token, message;
        return _regenerator2.default.wrap(function _callee7$(_context7) {
          while (1) {
            switch (_context7.prev = _context7.next) {
              case 0:
                isBusy = !_this._isSocketAvailable(null);

                if (!isBusy) {
                  _context7.next = 3;
                  break;
                }

                throw new Error('This device is locked during the flashing process.');

              case 3:
                _context7.next = 5;
                return _this.hasStatus(DEVICE_STATUS_MAP.READY);

              case 5:
                if (_this._hasSparkFunction(functionName)) {
                  _context7.next = 7;
                  break;
                }

                throw new Error('Function not found');

              case 7:

                _logger2.default.log('sending function call to the device', {
                  deviceID: _this.getDeviceID(),
                  functionName: functionName
                });

                token = _this.sendMessage('FunctionCall', {
                  args: (0, _values2.default)(functionArguments),
                  name: functionName
                });
                _context7.next = 11;
                return _this.listenFor('FunctionReturn', null, token);

              case 11:
                message = _context7.sent;
                return _context7.abrupt('return', _this._transformFunctionResult(functionName, message));

              case 13:
              case 'end':
                return _context7.stop();
            }
          }
        }, _callee7, _this2);
      }));

      return function (_x6, _x7) {
        return _ref8.apply(this, arguments);
      };
    }();

    _this.raiseYourHand = function () {
      var _ref9 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee8(shouldShowSignal) {
        var isBusy, buffer, token;
        return _regenerator2.default.wrap(function _callee8$(_context8) {
          while (1) {
            switch (_context8.prev = _context8.next) {
              case 0:
                isBusy = !_this._isSocketAvailable(null);

                if (!isBusy) {
                  _context8.next = 3;
                  break;
                }

                throw new Error('This device is locked during the flashing process.');

              case 3:

                /**
                 * does the special URL writing needed directly to the COAP message object,
                 * since the URI requires non-text values
                 */
                buffer = new Buffer(1);

                buffer.writeUInt8(shouldShowSignal ? 1 : 0, 0);

                token = _this.sendMessage('SignalStart', null, [{
                  name: _CoapMessage2.default.Option.URI_QUERY,
                  value: buffer
                }]);
                _context8.next = 8;
                return _this.listenFor('SignalStartReturn', null, token);

              case 8:
                return _context8.abrupt('return', _context8.sent);

              case 9:
              case 'end':
                return _context8.stop();
            }
          }
        }, _callee8, _this2);
      }));

      return function (_x8) {
        return _ref9.apply(this, arguments);
      };
    }();

    _this.flash = function () {
      var _ref10 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee9(binary) {
        var fileTransferStore = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _FileTransferStore2.default.FIRMWARE;
        var address = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '0x0';
        var isBusy, flasher;
        return _regenerator2.default.wrap(function _callee9$(_context9) {
          while (1) {
            switch (_context9.prev = _context9.next) {
              case 0:
                isBusy = !_this._isSocketAvailable(null);

                if (!isBusy) {
                  _context9.next = 3;
                  break;
                }

                throw new Error('This device is locked during the flashing process.');

              case 3:
                flasher = new _Flasher2.default(_this, _this._maxBinarySize, _this._otaChunkSize);
                _context9.prev = 4;

                _logger2.default.log('flash device started! - sending api event', {
                  deviceID: _this.getDeviceID()
                });

                _this.emit(DEVICE_EVENT_NAMES.FLASH_STARTED);

                _context9.next = 9;
                return flasher.startFlashBuffer(binary, fileTransferStore, address);

              case 9:

                _logger2.default.log('flash device finished! - sending api event', {
                  deviceID: _this.getDeviceID()
                });

                _this.emit(DEVICE_EVENT_NAMES.FLASH_SUCCESS);

                return _context9.abrupt('return', { status: 'Update finished' });

              case 14:
                _context9.prev = 14;
                _context9.t0 = _context9['catch'](4);

                _logger2.default.log('flash device failed! - sending api event', {
                  deviceID: _this.getDeviceID(),
                  error: _context9.t0
                });

                _this.emit(DEVICE_EVENT_NAMES.FLASH_FAILED);
                throw new Error('Update failed: ' + _context9.t0.message);

              case 19:
              case 'end':
                return _context9.stop();
            }
          }
        }, _callee9, _this2, [[4, 14]]);
      }));

      return function (_x9) {
        return _ref10.apply(this, arguments);
      };
    }();

    _this._isSocketAvailable = function (requester, messageName) {
      if (!_this._owningFlasher || _this._owningFlasher === requester) {
        return true;
      }

      _logger2.default.error('This client has an exclusive lock', {
        cache_key: _this._connectionKey,
        deviceID: _this.getDeviceID(),
        messageName: messageName
      });

      return false;
    };

    _this.takeOwnership = function (flasher) {
      if (_this._owningFlasher) {
        _logger2.default.error('already owned', { deviceID: _this.getDeviceID() });
        return false;
      }
      // only permit the owning object to send messages.
      _this._owningFlasher = flasher;
      return true;
    };

    _this.releaseOwnership = function (flasher) {
      _logger2.default.log('releasing flash ownership ', { deviceID: _this.getDeviceID() });
      if (_this._owningFlasher === flasher) {
        _this._owningFlasher = null;
      } else if (_this._owningFlasher) {
        _logger2.default.error('cannot releaseOwnership, ', flasher, " isn't the current owner ", { deviceID: _this.getDeviceID() });
      }
    };

    _this._transformVariableResult = function (name, packet) {
      // grab the variable type, if the device doesn't say, assume it's a 'string'
      var variableType = _this._attributes.variables && _this._attributes.variables[name] || 'string';

      var result = null;
      try {
        if (packet.payload.length) {
          // leaving raw payload in response message for now, so we don't shock
          // our users.
          result = _CoapMessages2.default.fromBinary(packet.payload, variableType);
        }
      } catch (error) {
        _logger2.default.error('_transformVariableResult - error transforming response: ' + error);
      }

      return result;
    };

    _this._transformFunctionResult = function (name, packet) {
      var variableType = 'int32';

      var result = null;
      try {
        if (packet.payload.length) {
          result = _CoapMessages2.default.fromBinary(packet.payload, variableType);
        }
      } catch (error) {
        _logger2.default.error('_transformFunctionResult - error transforming response: ' + error);
        throw error;
      }

      return result;
    };

    _this._getDescription = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee10() {
      return _regenerator2.default.wrap(function _callee10$(_context10) {
        while (1) {
          switch (_context10.prev = _context10.next) {
            case 0:
              return _context10.abrupt('return', new _promise2.default(function (resolve, reject) {
                var systemInformation = void 0;
                var functionState = void 0;

                var timeout = setTimeout(function () {
                  cleanUpListeners();
                  reject(new Error('Request timed out - Describe'));
                }, KEEP_ALIVE_TIMEOUT);

                var handler = function handler(packet) {
                  var payload = packet.payload;
                  if (!payload.length) {
                    throw new Error('Payload empty for Describe message');
                  }

                  var data = JSON.parse(payload.toString('utf8'));

                  if (!systemInformation && data.m) {
                    systemInformation = data;
                  }

                  if (data && data.v) {
                    functionState = data;
                    // 'v':{'temperature':2}
                    (0, _nullthrows2.default)(functionState).v = _CoapMessages2.default.translateIntTypes((0, _nullthrows2.default)(data.v));
                  }

                  if (!systemInformation || !functionState) {
                    return;
                  }

                  clearTimeout(timeout);
                  cleanUpListeners();

                  resolve({ functionState: functionState, systemInformation: systemInformation });
                };

                var disconnectHandler = function disconnectHandler() {
                  cleanUpListeners();
                };

                var cleanUpListeners = function cleanUpListeners() {
                  _this.removeListener('DescribeReturn', handler);
                  _this.removeListener('disconnect', disconnectHandler);
                };

                _this.on('DescribeReturn', handler);
                _this.on('disconnect', disconnectHandler);

                // Because some firmware versions do not send the app + system state
                // in a single message, we cannot use `listenFor` and instead have to
                // write some hacky code that duplicates a lot of the functionality
                _this.sendMessage('Describe');
              }));

            case 1:
            case 'end':
              return _context10.stop();
          }
        }
      }, _callee10, _this2);
    }));

    _this.onDeviceEvent = function (event) {
      _this.sendDeviceEvent(event);
    };

    _this.sendDeviceEvent = function (event) {
      var data = event.data,
          isPublic = event.isPublic,
          name = event.name,
          ttl = event.ttl;

      var messageName = isPublic ? DEVICE_MESSAGE_EVENTS_NAMES.PUBLIC_EVENT : DEVICE_MESSAGE_EVENTS_NAMES.PRIVATE_EVENT;

      _this.sendMessage(messageName, {
        event_name: name.toString()
      }, [{
        name: _CoapMessage2.default.Option.MAX_AGE,
        value: _CoapMessages2.default.toBinary(ttl, 'uint32')
      }], data && new Buffer(data) || null);
    };

    _this._hasParticleVariable = function (name) {
      return !!(_this._attributes.variables && _this._attributes.variables[name]);
    };

    _this._hasSparkFunction = function (functionName) {
      return !!(_this._attributes.functions && _this._attributes.functions.some(function (fn) {
        return fn.toLowerCase() === functionName.toLowerCase();
      }));
    };

    _this._toHexString = function (value) {
      return (value < 10 ? '0' : '') + value.toString(16);
    };

    _this.getDeviceID = function () {
      return _this._attributes.deviceID;
    };

    _this.getConnectionKey = function () {
      return _this._connectionKey;
    };

    _this.getRemoteIPAddress = function () {
      return _this._socket.remoteAddress ? _this._socket.remoteAddress.toString() : 'unknown';
    };

    _this.disconnect = function () {
      var message = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

      _this._disconnectCounter += 1;

      if (_this._socketTimeoutInterval) {
        clearTimeout(_this._socketTimeoutInterval);
        _this._socketTimeoutInterval = null;
      }

      if (_this._disconnectCounter > 1) {
        // don't multi-disconnect
        return;
      }

      try {
        var logInfo = {
          cache_key: _this._connectionKey,
          deviceID: _this.getDeviceID(),
          duration: _this._connectionStartTime ? (new Date() - _this._connectionStartTime) / 1000.0 : undefined
        };

        _logger2.default.error(_this._disconnectCounter + ' : Device disconnected: ' + (message || ''), logInfo);
      } catch (error) {
        _logger2.default.error('Disconnect log error ' + error);
      }

      if (_this._decipherStream) {
        try {
          _this._decipherStream.end();
          _this._decipherStream = null;
        } catch (error) {
          _logger2.default.error('Error cleaning up decipherStream: ' + error);
        }
      }

      if (_this._cipherStream) {
        try {
          _this._cipherStream.end();
          _this._cipherStream = null;
        } catch (error) {
          _logger2.default.error('Error cleaning up cipherStream: ' + error);
        }
      }

      try {
        _this._socket.end();
        _this._socket.destroy();
      } catch (error) {
        _logger2.default.error('Disconnect TCPSocket error: ' + error);
      }

      _this.emit(DEVICE_EVENT_NAMES.DISCONNECT, message);

      // obv, don't do this before emitting disconnect.
      try {
        _this.removeAllListeners();
      } catch (error) {
        _logger2.default.error('Problem removing listeners ' + error);
      }
    };

    _this._connectionKey = connectionKey;
    _this._socket = socket;
    _this._handshake = handshake;
    return _this;
  }

  /**
   * configure our socket and start the handshake
   */


  // This handles the case on some operating systems where `socket.setTimeout`
  // doesn't work. On windows, that function will timeout when if the client
  // doesn't send a reply. On Linux as long as someone is reading or writing
  // to a socket it will stay open.


  /**
   * Deals with messages coming from the device over our secure connection
   * @param data
   */


  // Adds a listener to our secure message stream


  // increments or wraps our token value, and makes sure it isn't in use


  /**
   * Associates a particular token with a message we're sending, so we know
   * what we're getting back when we get an ACK
   */


  // clears the association with a particular token


  /**
   * Asks the device to start or stop its 'raise your hand' signal.
   * This will turn `nyan` mode on or off which just flashes the LED a bunch of
   * colors.
   */


  // Transforms the result from a device function to the correct type.


  //-------------
  // Device Events / Spark.publish / Spark.subscribe
  //-------------


  return Device;
}(_events2.default);

exports.default = Device;