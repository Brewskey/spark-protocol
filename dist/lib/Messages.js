'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _getOwnPropertyNames = require('babel-runtime/core-js/object/get-own-property-names');

var _getOwnPropertyNames2 = _interopRequireDefault(_getOwnPropertyNames);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _h = require('h5.coap');

var _Option = require('h5.coap/lib/Option');

var _Option2 = _interopRequireDefault(_Option);

var _logger = require('../lib/logger');

var _logger2 = _interopRequireDefault(_logger);

var _h2 = require('h5.buffers');

var _MessageSpecifications = require('./MessageSpecifications');

var _MessageSpecifications2 = _interopRequireDefault(_MessageSpecifications);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/*
*   Copyright (C) 2013-2014 Spark Labs, Inc. All rights reserved. -  https://www.spark.io/
*
*   This file is part of the Spark-protocol module
*
*   This program is free software: you can redistribute it and/or modify
*   it under the terms of the GNU General Public License version 3
*   as published by the Free Software Foundation.
*
*   Spark-protocol is distributed in the hope that it will be useful,
*   but WITHOUT ANY WARRANTY; without even the implied warranty of
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
*   GNU General Public License for more details.
*
*   You should have received a copy of the GNU General Public License
*   along with Spark-protocol.  If not, see <http://www.gnu.org/licenses/>.
*
*   You can download the source here: https://github.com/spark/spark-protocol
*
* 
*
*/

var _getRouteKey = function _getRouteKey(code, path) {
  var uri = code + path;
  var idx = uri.indexOf('/');

  // this assumes all the messages are one character for now.
  // if we wanted to change this, we'd need to find the first non message char,
  // '/' or '?', or use the real coap parsing stuff
  return uri.substr(0, idx + 2);
};

var Messages = function Messages() {
  var _this = this;

  (0, _classCallCheck3.default)(this, Messages);
  this._specifications = new _map2.default(_MessageSpecifications2.default);
  this._routes = new _map2.default(_MessageSpecifications2.default.filter(
  // eslint-disable-next-line no-unused-vars
  function (_ref) {
    var _ref2 = (0, _slicedToArray3.default)(_ref, 2),
        name = _ref2[0],
        value = _ref2[1];

    return !!value.uri;
  }).map(function (_ref3) {
    var _ref4 = (0, _slicedToArray3.default)(_ref3, 2),
        name = _ref4[0],
        value = _ref4[1];

    // see what it looks like without params
    var uri = value.template ? value.template.render({}) : value.uri;
    var routeKey = _getRouteKey(value.code, '/' + (uri || ''));

    return [routeKey, name];
  }));

  this.raiseYourHandUrlGenerator = function (showSignal) {
    return function (message) {
      var buffer = new Buffer(1);
      buffer.writeUInt8(showSignal ? 1 : 0, 0);

      message.addOption(new _Option2.default(_h.Message.Option.URI_PATH, new Buffer('s')));
      message.addOption(new _Option2.default(_h.Message.Option.URI_QUERY, buffer));
      return message;
    };
  };

  this.getRequestType = function (message) {
    var uri = _getRouteKey(message.getCode(), message.getUriPath());
    return _this._routes.get(uri);
  };

  this.getResponseType = function (name) {
    var specification = _this._specifications.get(name);
    return specification ? specification.Response : null;
  };

  this.statusIsOkay = function (message) {
    return message.getCode() < _h.Message.Code.BAD_REQUEST;
  };

  this.isNonTypeMessage = function (messageName) {
    var specification = _this._specifications.get(messageName);
    if (!specification) {
      return false;
    }

    return specification.type === _h.Message.Type.NON;
  };

  this.wrap = function (messageName, messageCounterId, params, data, token) {
    var specification = _this._specifications.get(messageName);
    if (!specification) {
      _logger2.default.error('Unknown Message Type');
      return null;
    }

    // Setup the Message
    var message = new _h.Message();

    // Format our url
    var uri = specification.uri;
    if (params && params._writeCoapUri) {
      // for our messages that have nitty gritty urls that require raw bytes
      // and no strings.
      message = params._writeCoapUri(message);
      uri = null;
    } else if (params && specification.template) {
      uri = specification.template.render(params);
    }

    if (uri) {
      message.setUri(uri);
    }

    message.setId(messageCounterId);

    if (token !== null && token !== undefined) {
      var buffer = new Buffer(1);
      buffer.writeUInt8(token, 0);
      message.setToken(buffer);
    }

    message.setCode(specification.code);
    message.setType(specification.type);

    // Set our payload
    if (data) {
      message.setPayload(data);
    }

    if (params && params._raw) {
      params._raw(message);
    }

    return message.toBuffer();
  };

  this.unwrap = function (data) {
    if (!data) {
      return null;
    }

    try {
      return _h.Message.fromBuffer(data);
    } catch (error) {
      _logger2.default.error('Coap Error: ' + error);
    }

    return null;
  };

  this.translateIntTypes = function (varState) {
    if (!varState) {
      return null;
    }
    var translatedVarState = {};

    (0, _getOwnPropertyNames2.default)(varState).forEach(function (varName) {
      var intType = varState && varState[varName];
      if (typeof intType === 'number') {
        var str = _this.getNameFromTypeInt(intType);

        if (str !== null) {
          translatedVarState[varName] = str;
        }
      }
    });

    return (0, _extends3.default)({}, varState, translatedVarState);
  };

  this.getNameFromTypeInt = function (typeInt) {
    switch (typeInt) {
      case 1:
        {
          return 'bool';
        }

      case 2:
        {
          return 'int32';
        }

      case 4:
        {
          return 'string';
        }

      case 5:
        {
          return 'null';
        }

      case 9:
        {
          return 'double';
        }

      default:
        {
          _logger2.default.error('asked for unknown type: ' + typeInt);
          throw new Error('error getNameFromTypeInt: ' + typeInt);
        }
    }
  };

  this.tryFromBinary = function (buffer, typeName) {
    var result = null;
    try {
      result = this.fromBinary(buffer, typeName);
    } catch (error) {
      _logger2.default.error('Could not parse type: ' + typeName + ' ' + buffer.toString() + ' ' + error);
    }
    return result;
  };

  this.fromBinary = function (buffer, typeName) {
    var bufferReader = new _h2.BufferReader(buffer);

    switch (typeName) {
      case 'bool':
        {
          return !!bufferReader.shiftByte();
        }

      case 'byte':
        {
          return bufferReader.shiftByte();
        }

      case 'crc':
        {
          return bufferReader.shiftUInt32();
        }

      case 'uint32':
        {
          return bufferReader.shiftUInt32();
        }

      case 'uint16':
        {
          return bufferReader.shiftUInt16();
        }

      case 'int32':
      case 'number':
        {
          return bufferReader.shiftInt32();
        }

      case 'float':
        {
          return bufferReader.shiftFloat();
        }

      case 'double':
        {
          // doubles on the device are little-endian
          return bufferReader.shiftDouble(true);
        }

      case 'buffer':
        {
          return bufferReader.buffer;
        }

      case 'string':
      default:
        {
          return bufferReader.buffer.toString();
        }
    }
  };

  this.toBinary = function (value, typeName) {
    var bufferBuilder = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : new _h2.BufferBuilder();

    // eslint-disable-next-line no-param-reassign
    typeName = typeName || (typeof value === 'undefined' ? 'undefined' : (0, _typeof3.default)(value));

    if (value === null) {
      return bufferBuilder;
    }

    switch (typeName) {
      case 'uint16':
        {
          bufferBuilder.pushUInt16(value);
          break;
        }
      case 'uint32':
      case 'crc':
        {
          bufferBuilder.pushUInt32(value);
          break;
        }

      case 'int32':
        {
          bufferBuilder.pushInt32(value);
          break;
        }

      case 'number':
      case 'double':
        {
          bufferBuilder.pushDouble(value);
          break;
        }

      case 'buffer':
        {
          bufferBuilder.pushBuffer(value);
          break;
        }

      case 'string':
      default:
        {
          bufferBuilder.pushString(value || '');
          break;
        }
    }

    return bufferBuilder.toBuffer();
  };

  this.buildArguments = function (requestArgs, args) {
    try {
      var _ret = function () {
        var bufferBuilder = new _h2.BufferBuilder();
        var requestArgsKey = (0, _keys2.default)(requestArgs)[0];
        args.filter(function (arg) {
          return !!arg;
        }).forEach(function (arg, index) {
          if (index > 0) {
            _this.toBinary('&', 'string', bufferBuilder);
          }

          var name = arg[0] || requestArgsKey;
          var type = arg[1];
          var val = requestArgs[name];

          _this.toBinary(val, type, bufferBuilder);
        });

        return {
          v: bufferBuilder.toBuffer()
        };
      }();

      if ((typeof _ret === 'undefined' ? 'undefined' : (0, _typeof3.default)(_ret)) === "object") return _ret.v;
    } catch (error) {
      _logger2.default.error('buildArguments error: ' + error);
    }

    return null;
  };
}

// Maps CODE + URL to MessageNames as they appear in 'Spec'


/**
 * does the special URL writing needed directly to the COAP message object,
 * since the URI requires non-text values
 */


// http://en.wikipedia.org/wiki/X.690
// === TYPES: SUBSET OF ASN.1 TAGS ===
//
// 1: BOOLEAN (false=0, true=1)
// 2: INTEGER (int32)
// 4: OCTET STRING (arbitrary bytes)
// 5: NULL (void for return value only)
// 9: REAL (double)
// Translates the integer variable type enum to user friendly string types


// eslint-disable-next-line func-names


// eslint-disable-next-line func-names
;

exports.default = new Messages();