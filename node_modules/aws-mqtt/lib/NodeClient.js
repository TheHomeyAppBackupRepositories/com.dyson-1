'use strict';

var _client = require('mqtt/lib/client');

var _client2 = _interopRequireDefault(_client);

var _urlSigner = require('./urlSigner');

var _WSStream = require('./streams/WSStream');

var _WSStream2 = _interopRequireDefault(_WSStream);

var _https = require('https');

var _https2 = _interopRequireDefault(_https);

var _ws = require('ws');

var _ws2 = _interopRequireDefault(_ws);

var _processOptions2 = require('./processOptions');

var _processOptions3 = _interopRequireDefault(_processOptions2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var createStreamBuilder = function createStreamBuilder(aws) {
  return function (client) {
    var stream = new _WSStream2.default(function (callback) {
      // Need to refresh AWS credentials, which expire after initial creation.
      // For example CognitoIdentity credentials expire after an hour
      (0, _urlSigner.signUrl)(aws, function (err, url) {
        if (err) return callback(err);
        // MUST include 'mqtt' in the list of supported protocols.
        // See http://docs.oasis-open.org/mqtt/mqtt/v3.1.1/os/mqtt-v3.1.1-os.html#_Toc398718127
        // 'mqttv3.1' is still supported, but it is an old informal sub-protocol
        // AWS IoT message broker now supports 3.1.1, see https://docs.aws.amazon.com/iot/latest/developerguide/protocols.html
        try {
          var agent = new _https2.default.Agent();
          var socket = new _ws2.default(url, ['mqtt'], { agent: agent }); // somehow without an agent WS struggles to make connection to AWS wss url
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

var NodeClient = function (_MqttClient) {
  _inherits(NodeClient, _MqttClient);

  function NodeClient(options) {
    _classCallCheck(this, NodeClient);

    var _processOptions = (0, _processOptions3.default)(options),
        aws = _processOptions.aws,
        mqttOptions = _processOptions.mqttOptions;

    return _possibleConstructorReturn(this, (NodeClient.__proto__ || Object.getPrototypeOf(NodeClient)).call(this, createStreamBuilder(aws), mqttOptions));
  }

  return NodeClient;
}(_client2.default);

module.exports = NodeClient;