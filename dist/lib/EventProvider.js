'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _EventPublisher = require('../lib/EventPublisher');

var _EventPublisher2 = _interopRequireDefault(_EventPublisher);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var EventProvider = function EventProvider(eventPublisher) {
  var _this = this;

  (0, _classCallCheck3.default)(this, EventProvider);

  this.onNewEvent = function (callback) {
    var eventNamePrefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '*';

    _this._eventPublisher.subscribe(eventNamePrefix, _this._onNewEvent(callback), {
      filterOptions: {
        listenToBroadcastedEvents: false,
        listenToInternalEvents: false
      }
    });
  };

  this._onNewEvent = function (callback) {
    return function (event) {
      var eventToBroadcast = (0, _extends3.default)({}, event);

      callback(eventToBroadcast);
    };
  };

  this._eventPublisher = eventPublisher;
};

exports.default = EventProvider;