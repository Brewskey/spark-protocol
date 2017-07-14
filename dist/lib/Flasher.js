'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

var _from = require('babel-runtime/core-js/array/from');

var _from2 = _interopRequireDefault(_from);

var _parseInt = require('babel-runtime/core-js/number/parse-int');

var _parseInt2 = _interopRequireDefault(_parseInt);

var _isNan = require('babel-runtime/core-js/number/is-nan');

var _isNan2 = _interopRequireDefault(_isNan);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _set = require('babel-runtime/core-js/set');

var _set2 = _interopRequireDefault(_set);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _BufferStream = require('./BufferStream');

var _BufferStream2 = _interopRequireDefault(_BufferStream);

var _CoapMessages = require('./CoapMessages');

var _CoapMessages2 = _interopRequireDefault(_CoapMessages);

var _Device = require('../clients/Device');

var _Device2 = _interopRequireDefault(_Device);

var _ProtocolErrors = require('./ProtocolErrors');

var _ProtocolErrors2 = _interopRequireDefault(_ProtocolErrors);

var _FileTransferStore = require('./FileTransferStore');

var _FileTransferStore2 = _interopRequireDefault(_FileTransferStore);

var _coapPacket = require('coap-packet');

var _coapPacket2 = _interopRequireDefault(_coapPacket);

var _bufferCrc = require('buffer-crc32');

var _bufferCrc2 = _interopRequireDefault(_bufferCrc);

var _nullthrows = require('nullthrows');

var _nullthrows2 = _interopRequireDefault(_nullthrows);

var _logger = require('../lib/logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
*   Lesser General Public License for more details.
*
*   You should have received a copy of the GNU Lesser General Public
*   License along with this program; if not, see <http://www.gnu.org/licenses/>.
*
* 
*
*/

var logger = _logger2.default.createModuleLogger(module);
//
// UpdateBegin — sent by Server to initiate an OTA firmware update
// UpdateReady — sent by Device to indicate readiness to receive firmware chunks
// Chunk — sent by Server to send chunks of a firmware binary to Device
// ChunkReceived — sent by Device to respond to each chunk, indicating the CRC of
// the received chunk data.  if Server receives CRC that does not match the chunk just sent,
// that chunk is sent again
// UpdateDone — sent by Server to indicate all firmware chunks have been sent
//

var CHUNK_SIZE = 256;
var MAX_MISSED_CHUNKS = 10;
var MAX_BINARY_SIZE = 108000; // According to the forums this is the max size for device.

function waitFor(ms) {
  return new _promise2.default(function (res) {
    setTimeout(function () {
      return res();
    }, ms);
  });
}

var Flasher =

// OTA tweaks
function Flasher(client, maxBinarySize, otaChunkSize) {
  var _this = this;

  (0, _classCallCheck3.default)(this, Flasher);
  this._chunk = null;
  this._chunkSize = CHUNK_SIZE;
  this._maxBinarySize = MAX_BINARY_SIZE;
  this._fileStream = null;
  this._lastCrc = null;
  this._protocolVersion = 0;
  this._missedChunks = new _set2.default();
  this._fastOtaEnabled = true;
  this._ignoreMissedChunks = false;

  this.startFlashBuffer = function () {
    var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(buffer) {
      var fileTransferStore = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _FileTransferStore2.default.FIRMWARE;
      var address = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '0x0';
      return _regenerator2.default.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              if (!(!buffer || buffer.length === 0)) {
                _context.next = 3;
                break;
              }

              logger.error({
                deviceID: _this._client.getDeviceID()
              }, 'flash failed! - file is empty! ');

              throw new Error('Update failed - File was empty!');

            case 3:
              if (!(buffer && buffer.length > _this._maxBinarySize)) {
                _context.next = 6;
                break;
              }

              logger.error({
                deviceID: _this._client.getDeviceID(),
                length: buffer.length
              }, 'flash failed! - file is too BIG');

              throw new Error('Update failed - File was too big!');

            case 6:
              _context.prev = 6;

              if (_this._claimConnection()) {
                _context.next = 9;
                break;
              }

              return _context.abrupt('return');

            case 9:

              _this._startTime = new Date();

              _this._prepare(buffer);
              _context.next = 13;
              return _this._beginUpdate(buffer, fileTransferStore, address);

            case 13:
              _context.next = 15;
              return _promise2.default.race([
              // Fail after 60 of trying to flash
              new _promise2.default(function (resolve, reject) {
                return setTimeout(function () {
                  return reject(new Error('Update timed out'));
                }, 60 * 1000);
              }), _this._sendFile()]);

            case 15:

              _this._cleanup();
              _context.next = 22;
              break;

            case 18:
              _context.prev = 18;
              _context.t0 = _context['catch'](6);

              _this._cleanup();
              throw _context.t0;

            case 22:
            case 'end':
              return _context.stop();
          }
        }
      }, _callee, _this, [[6, 18]]);
    }));

    return function (_x) {
      return _ref.apply(this, arguments);
    };
  }();

  this._prepare = function (fileBuffer) {
    // make sure we have a file,
    // open a stream to our file
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('Flasher: this.fileBuffer was empty.');
    } else {
      _this._fileStream = new _BufferStream2.default(fileBuffer);
    }

    _this._chunk = null;
    _this._lastCrc = null;

    _this._chunkIndex = -1;

    // start listening for missed chunks before the update fully begins
    _this._client.on('ChunkMissed', function (packet) {
      return _this._onChunkMissed(packet);
    });
  };

  this._claimConnection = function () {
    // suspend all other messages to the device
    if (!_this._client.takeOwnership(_this)) {
      throw new Error('Flasher: Unable to take ownership');
    }

    return true;
  };

  this._beginUpdate = function () {
    var _ref2 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3(buffer, fileTransferStore, address) {
      var maxTries, tryBeginUpdate;
      return _regenerator2.default.wrap(function _callee3$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              maxTries = 3;

              tryBeginUpdate = function () {
                var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2() {
                  var delay, sentStatus, packet, version;
                  return _regenerator2.default.wrap(function _callee2$(_context2) {
                    while (1) {
                      switch (_context2.prev = _context2.next) {
                        case 0:
                          if (!(maxTries < 0)) {
                            _context2.next = 2;
                            break;
                          }

                          throw new Error('Failed waiting on UpdateReady - out of retries ');

                        case 2:

                          // NOTE: this is 6 because it's double the ChunkMissed 3 second delay
                          // The 90 second delay is crazy but try it just in case.
                          delay = maxTries > 0 ? 6 : 90;
                          sentStatus = _this._sendBeginUpdateMessage(buffer, fileTransferStore, address);

                          maxTries -= 1;

                          // did we fail to send out the UpdateBegin message?

                          if (!(sentStatus === false)) {
                            _context2.next = 7;
                            break;
                          }

                          throw new Error('UpdateBegin failed - sendMessage failed');

                        case 7:
                          _context2.next = 9;
                          return _promise2.default.race([_this._client.listenFor('UpdateReady', /* uri */null, /* token */null), _this._client.listenFor('UpdateAbort', /* uri */null, /* token */null).then(function (newPacket) {
                            var failReason = '';
                            if (newPacket && newPacket.payload.length) {
                              failReason = !!newPacket.payload.readUInt8(0);
                            }

                            failReason = !(0, _isNan2.default)(failReason) ? _ProtocolErrors2.default.get((0, _parseInt2.default)(failReason, 10)) || failReason : failReason;

                            throw new Error('aborted: ' + failReason);
                          }),

                          // Try to update multiple times
                          new _promise2.default(function (resolve) {
                            return setTimeout(function () {
                              if (maxTries <= 0) {
                                return;
                              }

                              tryBeginUpdate();
                              resolve();
                            }, delay * 1000);
                          })]);

                        case 9:
                          packet = _context2.sent;

                          if (packet) {
                            _context2.next = 12;
                            break;
                          }

                          return _context2.abrupt('return');

                        case 12:

                          maxTries = 0;

                          version = 0;

                          if (packet && packet.payload.length > 0) {
                            version = packet.payload.readUInt8(0);
                          }
                          _this._protocolVersion = version;

                        case 16:
                        case 'end':
                          return _context2.stop();
                      }
                    }
                  }, _callee2, _this);
                }));

                return function tryBeginUpdate() {
                  return _ref3.apply(this, arguments);
                };
              }();

              _context3.next = 4;
              return tryBeginUpdate();

            case 4:
            case 'end':
              return _context3.stop();
          }
        }
      }, _callee3, _this);
    }));

    return function (_x4, _x5, _x6) {
      return _ref2.apply(this, arguments);
    };
  }();

  this._sendBeginUpdateMessage = function (fileBuffer, fileTransferStore, address) {
    // (MDM Proposal) Optional payload to enable fast OTA and file placement:
    // u8  flags 0x01 - Fast OTA available - when set the server can
    // provide fast OTA transfer
    // u16 chunk size. Each chunk will be this size apart from the last which
    // may be smaller.
    // u32 file size. The total size of the file.
    // u8 destination. Where to store the file
    // 0x00 Firmware update
    // 0x01 External Flash
    // 0x02 User Memory Function
    // u32 destination address (0 for firmware update, otherwise the address
    // of external flash or user memory.)

    var flags = 0; // fast ota available
    var chunkSize = _this._chunkSize;
    var fileSize = fileBuffer.length;
    var destFlag = fileTransferStore;
    var destAddr = parseInt(address, 10);

    if (_this._fastOtaEnabled) {
      logger.info({ logInfo: _this._getLogInfo() }, 'fast ota enabled! ');
      flags = 1;
    }

    // UpdateBegin — sent by Server to initiate an OTA firmware update
    return !!_this._client.sendMessage('UpdateBegin', null, null, Buffer.concat([_CoapMessages2.default.toBinary(flags, 'uint8'), _CoapMessages2.default.toBinary(chunkSize, 'uint16'), _CoapMessages2.default.toBinary(fileSize, 'uint32'), _CoapMessages2.default.toBinary(destFlag, 'uint8'), _CoapMessages2.default.toBinary(destAddr, 'uint32')]), _this);
  };

  this._sendFile = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4() {
    var canUseFastOTA, chunkCount, messageToken, message, counter;
    return _regenerator2.default.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _this._chunk = null;
            _this._lastCrc = null;

            // while iterating over our file...
            // Chunk — sent by Server to send chunks of a firmware binary to Device
            // ChunkReceived — sent by Device to respond to each chunk, indicating the CRC
            //  of the received chunk data.  if Server receives CRC that does not match
            //  the chunk just sent, that chunk is sent again

            // send when ready:
            // UpdateDone — sent by Server to indicate all firmware chunks have been sent

            canUseFastOTA = _this._fastOtaEnabled && _this._protocolVersion > 0;

            if (canUseFastOTA) {
              logger.info({
                deviceID: _this._client.getDeviceID()
              }, 'Starting FastOTA update');
            }
            chunkCount = 0;

            _this._readNextChunk();

          case 6:
            if (!_this._chunk) {
              _context4.next = 23;
              break;
            }

            messageToken = _this._sendChunk(_this._chunkIndex);

            chunkCount += 1;

            if (!(chunkCount % 50 === 0)) {
              _context4.next = 12;
              break;
            }

            _context4.next = 12;
            return waitFor(500);

          case 12:
            _this._readNextChunk();
            // We don't need to wait for the response if using FastOTA.

            if (!canUseFastOTA) {
              _context4.next = 15;
              break;
            }

            return _context4.abrupt('continue', 6);

          case 15:
            _context4.next = 17;
            return _this._client.listenFor('ChunkReceived', null, messageToken);

          case 17:
            message = _context4.sent;


            logger.info({ message: message }, 'ChunkReceived');

            if (_CoapMessages2.default.statusIsOkay(message)) {
              _context4.next = 21;
              break;
            }

            throw new Error("'ChunkReceived' failed.");

          case 21:
            _context4.next = 6;
            break;

          case 23:
            if (!canUseFastOTA) {
              _context4.next = 28;
              break;
            }

            _context4.next = 26;
            return _this._onAllChunksDone();

          case 26:
            _context4.next = 28;
            return _this._waitForMissedChunks();

          case 28:

            // Handle missed chunks
            counter = 0;

          case 29:
            if (!(_this._missedChunks.size > 0 && counter < 3)) {
              _context4.next = 37;
              break;
            }

            _context4.next = 32;
            return _this._resendChunks();

          case 32:
            _context4.next = 34;
            return _this._waitForMissedChunks();

          case 34:
            counter += 1;
            _context4.next = 29;
            break;

          case 37:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, _this);
  }));
  this._resendChunks = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee6() {
    var missedChunks, canUseFastOTA;
    return _regenerator2.default.wrap(function _callee6$(_context6) {
      while (1) {
        switch (_context6.prev = _context6.next) {
          case 0:
            missedChunks = (0, _from2.default)(_this._missedChunks);

            _this._missedChunks.clear();

            canUseFastOTA = _this._fastOtaEnabled && _this._protocolVersion > 0;
            _context6.next = 5;
            return _promise2.default.all(missedChunks.map(function () {
              var _ref6 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee5(chunkIndex) {
                var offset, messageToken, message;
                return _regenerator2.default.wrap(function _callee5$(_context5) {
                  while (1) {
                    switch (_context5.prev = _context5.next) {
                      case 0:
                        offset = chunkIndex * _this._chunkSize;

                        (0, _nullthrows2.default)(_this._fileStream).seek(offset);
                        _this._chunkIndex = chunkIndex;

                        _this._readNextChunk();
                        messageToken = _this._sendChunk(chunkIndex);

                        // We don't need to wait for the response if using FastOTA.

                        if (!canUseFastOTA) {
                          _context5.next = 7;
                          break;
                        }

                        return _context5.abrupt('return');

                      case 7:
                        _context5.next = 9;
                        return _this._client.listenFor('ChunkReceived', null, messageToken);

                      case 9:
                        message = _context5.sent;

                        if (_CoapMessages2.default.statusIsOkay(message)) {
                          _context5.next = 12;
                          break;
                        }

                        throw new Error("'ChunkReceived' failed.");

                      case 12:
                      case 'end':
                        return _context5.stop();
                    }
                  }
                }, _callee5, _this);
              }));

              return function (_x7) {
                return _ref6.apply(this, arguments);
              };
            }()));

          case 5:
          case 'end':
            return _context6.stop();
        }
      }
    }, _callee6, _this);
  }));

  this._readNextChunk = function () {
    if (!_this._fileStream) {
      logger.error('Asked to read a chunk after the update was finished');
    }

    var chunk = _this._chunk = _this._fileStream ? _this._fileStream.read(_this._chunkSize) : null;

    // workaround for https://github.com/spark/core-firmware/issues/238
    if (chunk && chunk.length !== _this._chunkSize) {
      var buffer = new Buffer(_this._chunkSize);
      chunk.copy(buffer, 0, 0, chunk.length);
      buffer.fill(0, chunk.length, _this._chunkSize);
      _this._chunk = chunk = buffer;
    }

    _this._chunkIndex += 1;
    // end workaround
    _this._lastCrc = chunk ? _bufferCrc2.default.unsigned(chunk) : null;
  };

  this._sendChunk = function () {
    var chunkIndex = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;

    var encodedCrc = _CoapMessages2.default.toBinary((0, _nullthrows2.default)(_this._lastCrc), 'crc');

    var args = [encodedCrc];
    if (_this._fastOtaEnabled && _this._protocolVersion > 0) {
      args.push(_CoapMessages2.default.toBinary(chunkIndex, 'uint16'));
    }
    return _this._client.sendMessage('Chunk', { args: args }, null, _this._chunk, _this);
  };

  this._onAllChunksDone = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee7() {
    return _regenerator2.default.wrap(function _callee7$(_context7) {
      while (1) {
        switch (_context7.prev = _context7.next) {
          case 0:
            if (_this._client.sendMessage('UpdateDone', null, null, null, _this)) {
              _context7.next = 2;
              break;
            }

            throw new Error('Flasher - failed sending updateDone message');

          case 2:
          case 'end':
            return _context7.stop();
        }
      }
    }, _callee7, _this);
  }));

  this._cleanup = function () {
    try {
      // resume all other messages to the device
      _this._client.releaseOwnership(_this);

      // release our file handle
      var fileStream = _this._fileStream;
      if (fileStream) {
        fileStream.close();
        _this._fileStream = null;
      }
    } catch (error) {
      throw new Error('Flasher: error during cleanup ' + error);
    }
  };

  this._waitForMissedChunks = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee8() {
    var waitCount;
    return _regenerator2.default.wrap(function _callee8$(_context8) {
      while (1) {
        switch (_context8.prev = _context8.next) {
          case 0:
            if (!(_this._protocolVersion <= 0)) {
              _context8.next = 2;
              break;
            }

            return _context8.abrupt('return', null);

          case 2:
            waitCount = 20;

          case 3:
            if (!(waitCount > 0)) {
              _context8.next = 12;
              break;
            }

            waitCount -= 1;

            if (!(_this._missedChunks.size > 0)) {
              _context8.next = 8;
              break;
            }

            logger.info({ missedChunks: _this._missedChunks.size }, 'Missed Chunks received');
            return _context8.abrupt('return', _promise2.default.resolve());

          case 8:
            _context8.next = 10;
            return waitFor(500);

          case 10:
            _context8.next = 3;
            break;

          case 12:
            logger.info('Finished waiting');
            return _context8.abrupt('return', _promise2.default.resolve());

          case 14:
          case 'end':
            return _context8.stop();
        }
      }
    }, _callee8, _this);
  }));

  this._getLogInfo = function () {
    if (_this._client) {
      return {
        cache_key: _this._client._connectionKey || undefined,
        deviceID: _this._client.getDeviceID()
      };
    }

    return { deviceID: 'unknown' };
  };

  this._onChunkMissed = function (packet) {
    if (_this._missedChunks.size > MAX_MISSED_CHUNKS) {
      var json = (0, _stringify2.default)(_this._getLogInfo());
      throw new Error('flasher - chunk missed - device over limit, killing! ' + json);
    }

    // if we're not doing a fast OTA, and ignore missed is turned on, then
    // ignore this missed chunk.
    if (!_this._fastOtaEnabled && _this._ignoreMissedChunks) {
      logger.info({ logInfo: _this._getLogInfo() }, 'ignoring missed chunk');
      return;
    }

    logger.warn({ logInfo: _this._getLogInfo() }, 'flasher - chunk missed - recovering ');

    // kosher if I ack before I've read the payload?
    _this._client.sendReply('ChunkMissedAck', packet.messageId, null, null, _this);

    // the payload should include one or more chunk indexes
    var payload = packet.payload;
    for (var ii = 0; ii < payload.length; ii += 2) {
      try {
        _this._missedChunks.add(payload.readUInt16BE());
      } catch (error) {
        logger.error({ err: error }, 'onChunkMissed error reading payload');
      }
    }
  };

  this._client = client;
  this._maxBinarySize = maxBinarySize || MAX_BINARY_SIZE;
  this._chunkSize = otaChunkSize || CHUNK_SIZE;
}

/*
 * delay the teardown until at least like 10 seconds after the last
 * chunkmissed message.
 */
;

exports.default = Flasher;