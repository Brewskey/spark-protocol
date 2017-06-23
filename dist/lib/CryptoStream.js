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

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _logger = require('../lib/logger');

var _logger2 = _interopRequireDefault(_logger);

var _settings = require('../settings');

var _settings2 = _interopRequireDefault(_settings);

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

var CryptoStream = function (_Transform) {
  (0, _inherits3.default)(CryptoStream, _Transform);

  function CryptoStream(options) {
    (0, _classCallCheck3.default)(this, CryptoStream);

    var _this = (0, _possibleConstructorReturn3.default)(this, (CryptoStream.__proto__ || (0, _getPrototypeOf2.default)(CryptoStream)).call(this));

    _this._transform = function (chunk, encoding, callback) {
      if (!chunk.length) {
        _logger2.default.error("CryptoStream transform error: Chunk didn't have any length");
        callback();
        return;
      }

      try {
        var data = chunk;
        var cipherParams = [_settings2.default.CRYPTO_ALGORITHM, _this._key, _this._iv];
        var cipher = _this._streamType === 'encrypt' ? _crypto2.default.createCipheriv.apply(_crypto2.default, cipherParams) : _crypto2.default.createDecipheriv.apply(_crypto2.default, cipherParams);

        var transformedData = cipher.update(data);
        var extraData = cipher.final();
        var output = Buffer.concat([transformedData, extraData], transformedData.length + extraData.length);

        var ivContainer = _this._streamType === 'encrypt' ? output : data;
        _this._iv = new Buffer(16);
        ivContainer.copy(_this._iv, 0, 0, 16);

        _this.push(output);
      } catch (error) {
        _logger2.default.error('CryptoStream transform error: ' + error);
      }
      callback();
    };

    _this._key = options.key;
    _this._iv = options.iv;
    _this._streamType = options.streamType;
    return _this;
  }

  return CryptoStream;
}(_stream.Transform);

exports.default = CryptoStream;