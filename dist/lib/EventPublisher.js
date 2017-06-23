'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getRequestEventName = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _setImmediate2 = require('babel-runtime/core-js/set-immediate');

var _setImmediate3 = _interopRequireDefault(_setImmediate2);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _map = require('babel-runtime/core-js/map');

var _map2 = _interopRequireDefault(_map);

var _getPrototypeOf = require('babel-runtime/core-js/object/get-prototype-of');

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _possibleConstructorReturn2 = require('babel-runtime/helpers/possibleConstructorReturn');

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = require('babel-runtime/helpers/inherits');

var _inherits3 = _interopRequireDefault(_inherits2);

var _events = require('events');

var _events2 = _interopRequireDefault(_events);

var _nullthrows = require('nullthrows');

var _nullthrows2 = _interopRequireDefault(_nullthrows);

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _settings = require('../settings');

var _settings2 = _interopRequireDefault(_settings);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var getRequestEventName = exports.getRequestEventName = function getRequestEventName(eventName) {
  return eventName + '/request';
}; /*
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

var LISTEN_FOR_RESPONSE_TIMEOUT = 15000;

var EventPublisher = function (_EventEmitter) {
  (0, _inherits3.default)(EventPublisher, _EventEmitter);

  function EventPublisher() {
    var _ref,
        _this2 = this;

    var _temp, _this, _ret;

    (0, _classCallCheck3.default)(this, EventPublisher);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = (0, _possibleConstructorReturn3.default)(this, (_ref = EventPublisher.__proto__ || (0, _getPrototypeOf2.default)(EventPublisher)).call.apply(_ref, [this].concat(args))), _this), _this._subscriptionsByID = new _map2.default(), _this.publish = function (eventData, options) {
      var _ref2 = options || {},
          isInternal = _ref2.isInternal,
          isPublic = _ref2.isPublic;

      var ttl = eventData.ttl && eventData.ttl > 0 ? eventData.ttl : _settings2.default.DEFAULT_EVENT_TTL;

      var event = (0, _extends3.default)({}, eventData, {
        isInternal: isInternal,
        isPublic: isPublic,
        publishedAt: new Date(),
        ttl: ttl
      });

      (0, _setImmediate3.default)(function () {
        _this._emitWithPrefix(eventData.name, event);
        _this.emit('*', event);
      });
    }, _this.publishAndListenForResponse = function () {
      var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(eventData) {
        var eventID, requestEventName, responseEventName;
        return _regenerator2.default.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                eventID = (0, _uuid2.default)();
                requestEventName = getRequestEventName(eventData.name) + '/' + eventID;
                responseEventName = eventData.name + '/response/' + eventID;
                return _context.abrupt('return', new _promise2.default(function (resolve, reject) {
                  var responseListener = function responseListener(event) {
                    return resolve((0, _nullthrows2.default)(event.context));
                  };

                  _this.subscribe(responseEventName, responseListener, {
                    once: true,
                    subscriptionTimeout: LISTEN_FOR_RESPONSE_TIMEOUT,
                    timeoutHandler: function timeoutHandler() {
                      return reject(new Error('Response timeout for event: ' + eventData.name));
                    }
                  });

                  _this.publish((0, _extends3.default)({}, eventData, {
                    context: (0, _extends3.default)({}, eventData.context, {
                      responseEventName: responseEventName
                    }),
                    name: requestEventName
                  }), {
                    isInternal: true,
                    isPublic: false
                  });
                }));

              case 4:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, _this2);
      }));

      return function (_x) {
        return _ref3.apply(this, arguments);
      };
    }(), _this.subscribe = function () {
      var eventNamePrefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '*';
      var eventHandler = arguments[1];
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      var filterOptions = options.filterOptions,
          once = options.once,
          subscriptionTimeout = options.subscriptionTimeout,
          timeoutHandler = options.timeoutHandler;


      var subscriptionID = (0, _uuid2.default)();
      while (_this._subscriptionsByID.has(subscriptionID)) {
        subscriptionID = (0, _uuid2.default)();
      }

      var listener = filterOptions ? _this._filterEvents(eventHandler, filterOptions) : eventHandler;

      _this._subscriptionsByID.set(subscriptionID, {
        eventNamePrefix: eventNamePrefix,
        id: subscriptionID,
        listener: listener,
        options: options
      });

      if (subscriptionTimeout) {
        var timeout = setTimeout(function () {
          _this.unsubscribe(subscriptionID);
          if (timeoutHandler) {
            timeoutHandler();
          }
        }, subscriptionTimeout);
        _this.once(eventNamePrefix, function () {
          clearTimeout(timeout);
        });
      }

      if (once) {
        _this.once(eventNamePrefix, listener);
        _this.once(eventNamePrefix, function () {
          _this._subscriptionsByID.delete(subscriptionID);
        });
      } else {
        _this.on(eventNamePrefix, listener);
      }
      return subscriptionID;
    }, _this.unsubscribe = function (subscriptionID) {
      var subscription = _this._subscriptionsByID.get(subscriptionID);
      if (!subscription) {
        return;
      }
      _this.removeListener(subscription.eventNamePrefix, subscription.listener);
      _this._subscriptionsByID.delete(subscriptionID);
    }, _this.unsubscribeBySubscriberID = function (subscriberID) {
      _this._subscriptionsByID.forEach(function (subscription) {
        if (subscription.options.subscriberID === subscriberID) {
          _this.unsubscribe(subscription.id);
        }
      });
    }, _this._emitWithPrefix = function (eventName, event) {
      _this.eventNames().filter(function (eventNamePrefix) {
        return eventName.startsWith(eventNamePrefix);
      }).forEach(function (eventNamePrefix) {
        return _this.emit(eventNamePrefix, event);
      });
    }, _this._filterEvents = function (eventHandler, filterOptions) {
      return function (event) {
        if (event.isInternal && filterOptions.listenToInternalEvents === false) {
          return;
        }
        // filter private events from another devices
        if (filterOptions.userID && !event.isPublic && filterOptions.userID !== event.userID) {
          return;
        }

        // filter private events with wrong connectionID
        if (!event.isPublic && filterOptions.connectionID && event.connectionID !== filterOptions.connectionID) {
          return;
        }

        // filter mydevices events
        if (filterOptions.mydevices && filterOptions.userID !== event.userID) {
          return;
        }

        // filter event by deviceID
        if (filterOptions.deviceID && event.deviceID !== filterOptions.deviceID) {
          return;
        }

        // filter broadcasted events
        if (filterOptions.listenToBroadcastedEvents === false && event.broadcasted) {
          return;
        }

        process.nextTick(function () {
          return eventHandler(event);
        });
      };
    }, _temp), (0, _possibleConstructorReturn3.default)(_this, _ret);
  }

  return EventPublisher;
}(_events2.default);

exports.default = EventPublisher;