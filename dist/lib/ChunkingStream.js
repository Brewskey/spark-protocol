'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _stream = require('stream');

var _logger = require('../lib/logger');

var _logger2 = _interopRequireDefault(_logger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 Our job here is to accept messages in whole chunks, and put their length in front
 as we send them out, and parse them back into those size chunks as we read them in.
 **/
/* eslint-disable no-bitwise */

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

var MSG_LENGTH_BYTES = 2;
var messageLengthBytes = function messageLengthBytes(message) {
  // assuming a maximum encrypted message length of 65K, lets write an
  // unsigned short int before every message, so we know how much to read out.
  if (!message) {
    return null;
  }

  var length = message.length;
  var lengthBuffer = new Buffer(MSG_LENGTH_BYTES);

  lengthBuffer[0] = length >>> 8;
  lengthBuffer[1] = length & 255;

  return lengthBuffer;
};

var ChunkingStream = function (_Transform) {
  (0, _inherits3.default)(ChunkingStream, _Transform);

  function ChunkingStream(options) {
    (0, _classCallCheck3.default)(this, ChunkingStream);

    var _this = (0, _possibleConstructorReturn3.default)(this, (ChunkingStream.__proto__ || (0, _getPrototypeOf2.default)(ChunkingStream)).call(this));

    _this._incomingBuffer = null;
    _this._incomingIndex = -1;

    _this.process = function (chunk, callback) {
      if (!chunk) {
        return;
      }

      var isNewMessage = _this._incomingIndex === -1;
      var startIndex = 0;
      if (isNewMessage) {
        _this._expectedLength = (chunk[0] << 8) + chunk[1];

        // if we don't have a buffer, make one as big as we will need.
        _this._incomingBuffer = new Buffer(_this._expectedLength);
        _this._incomingIndex = 0;
        startIndex = 2; // skip the first two.
      }

      var bytesLeft = _this._expectedLength - _this._incomingIndex;
      var endIndex = startIndex + bytesLeft;
      if (endIndex > chunk.length) {
        endIndex = chunk.length;
      }

      if (startIndex < endIndex && _this._incomingBuffer) {
        if (_this._incomingIndex >= _this._incomingBuffer.length) {
          _logger2.default.log("hmm, shouldn't end up here.");
        }

        chunk.copy(_this._incomingBuffer, _this._incomingIndex, startIndex, endIndex);
      }

      _this._incomingIndex += endIndex - startIndex;

      var remainder = null;
      if (endIndex < chunk.length) {
        remainder = new Buffer(chunk.length - endIndex);
        chunk.copy(remainder, 0, endIndex, chunk.length);
      }

      if (_this._incomingIndex === _this._expectedLength && _this._incomingBuffer) {
        _this.push(_this._incomingBuffer);
        _this._incomingBuffer = null;
        _this._incomingIndex = -1;
        _this._expectedLength = -1;
        if (!remainder && callback) {
          process.nextTick(callback);
        } else {
          process.nextTick(function () {
            return _this.process(remainder, callback);
          });
        }
      } else {
        process.nextTick(callback);
      }
    };

    _this._transform = function (chunk, encoding, callback) {
      var buffer = Buffer.isBuffer(chunk) ? chunk : new Buffer(chunk);

      if (_this._outgoing) {
        // we should be passed whole messages here.
        // write our length first, then message, then bail.
        var lengthChunk = messageLengthBytes(chunk);
        _this.push(Buffer.concat(lengthChunk ? [lengthChunk, buffer] : [buffer]));
        process.nextTick(callback);
      } else {
        // Collect chunks until we hit an expected size, and then trigger a
        // readable
        try {
          process.nextTick(function () {
            return _this.process(buffer, callback);
          });
        } catch (error) {
          _logger2.default.error('ChunkingStream error!: ' + error);
        }
      }
    };

    _this._outgoing = !!options.outgoing;
    return _this;
  }

  return ChunkingStream;
}(_stream.Transform);

exports.default = ChunkingStream;