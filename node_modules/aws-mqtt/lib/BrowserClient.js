'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _client = require('mqtt/lib/client');

var _client2 = _interopRequireDefault(_client);

var _urlSigner = require('./urlSigner');

var _WebSocketStream = require('./streams/WebSocketStream');

var _WebSocketStream2 = _interopRequireDefault(_WebSocketStream);

var _processOptions2 = require('./processOptions');

var _processOptions3 = _interopRequireDefault(_processOptions2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var createStreamBuilder = function createStreamBuilder(aws) {
  return function (client) {
    var stream = new _WebSocketStream2.default(function (callback) {
      // console.log('In webSocketFactory')

      (0, _urlSigner.signUrl)(aws, function (err, url) {
        if (err) return callback(err);
        // MUST include 'mqtt' in the list of supported protocols.
        // See http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html#_Toc398718127
        // 'mqttv3.1' is still supported, but it is an old informal sub-protocol
        // AWS IoT message broker now supports 3.1.1, see https://docs.aws.amazon.com/iot/latest/developerguide/protocols.html
        try {
          var socket = new window.WebSocket(url, ['mqtt']);
          return callback(null, socket);
        } catch (err) {
          return callback(err, null);
        }
      });
    });
    // MQTT.js Client suppresses connection errors (?!), loosing the original error
    // This makes it very difficult to debug what went wrong.
    // Here we setup a once error handler to propagate stream error to client's error
    var propagateConnectionErrors = function propagateConnectionErrors(err) {
      return client.emit('error', err);
    };
    stream.once('error', propagateConnectionErrors);
    return stream;
  };
};

var BrowserClient = function (_MqttClient) {
  _inherits(BrowserClient, _MqttClient);

  function BrowserClient(options) {
    _classCallCheck(this, BrowserClient);

    var _processOptions = (0, _processOptions3.default)(options),
        aws = _processOptions.aws,
        mqttOptions = _processOptions.mqttOptions;

    return _possibleConstructorReturn(this, (BrowserClient.__proto__ || Object.getPrototypeOf(BrowserClient)).call(this, createStreamBuilder(aws), mqttOptions));
  }

  return BrowserClient;
}(_client2.default);

exports.default = BrowserClient;