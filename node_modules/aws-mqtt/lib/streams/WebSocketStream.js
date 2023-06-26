'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _stream = require('stream');

var _utils = require('./utils');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var WebSocketStream = function (_Duplex) {
  _inherits(WebSocketStream, _Duplex);

  function WebSocketStream(socketOrFactory) {
    _classCallCheck(this, WebSocketStream);

    var _this = _possibleConstructorReturn(this, (WebSocketStream.__proto__ || Object.getPrototypeOf(WebSocketStream)).call(this));

    _this.socket = null;
    var asyncSocketFactory = (0, _utils.toAsyncFactory)(socketOrFactory);
    asyncSocketFactory(function (err, socket) {
      if (err) {
        (0, _utils.closeStreamWithError)(_this, err);
      } else {
        _this.socket = (0, _utils.initWebSocket)(_this, socket);
      }
    });
    return _this;
  }

  // mqtt.js calls write with these values (examples):
  // chunk = [16], enc = "buffer"
  // chunk = "MQTT", enc = "utf8"


  _createClass(WebSocketStream, [{
    key: '_write',
    value: function _write(chunk, encoding, callback) {
      sendBufferTask(this, (0, _utils.concatChunks)([{ chunk: chunk, encoding: encoding }]), callback)(); // NOTE () to execute task now
    }

    // mqtt.js uses stream.cork(), then writes bunch of small buffers, then stream.uncork()
    // Define _writev to receive all those buffers and send them all at once in one WebSocket frame

  }, {
    key: '_writev',
    value: function _writev(chunks, callback) {
      sendBufferTask(this, (0, _utils.concatChunks)(chunks), callback)(); // NOTE () to execute task now
    }
  }, {
    key: '_read',
    value: function _read(size) {
      // anything to do here?
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      // noop, but MQTT calls it on forced close
    }
  }]);

  return WebSocketStream;
}(_stream.Duplex);

exports.default = WebSocketStream;


var A_BIT_LATER = 100;
// Only one sendBufferTask should be running at a time. It either re-schedules itself or completes and calls callback to resume the flow
var sendBufferTask = function sendBufferTask(stream, buffer, callback) {
  return function () {
    if (!stream.socket) {
      // still getting URL to connect to...
      setTimeout(sendBufferTask(stream, buffer, callback), A_BIT_LATER);
      return;
    }
    var socket = stream.socket;
    switch (socket.readyState) {
      case socket.CONNECTING:
        // queue up until socket is opened and flushed
        setTimeout(sendBufferTask(stream, buffer, callback), A_BIT_LATER);
        break;
      case socket.OPEN:
        // we are in a browser
        if (socket.bufferedAmount === 0) {
          // only send data when nothing is buffered. All buffering is handled by the stream.
          // Until callback is called, all data written to the stream will be buffered internally
          try {
            // socket.send() will sync append data to an internal socket buffer and increment socket.bufferedAmount
            socket.send(buffer);
            // We are done here. The data will either be sent over the network, or onerror event raised
            return callback();
          } catch (err) {
            // Oops, rare but possible error writing to internal socket buffer
            return callback(err);
          }
        } else {
          // queue up until socket is opened and flushed
          setTimeout(sendBufferTask(stream, buffer, callback), A_BIT_LATER);
        }
        break;
      case socket.CLOSING:
        // Oops, can't write to closing socket. Discard the buffer.
        callback(new Error('Socket is closing'));
        break;
      case socket.CLOSED:
        // Oops, can't write to closed socket. Discard the buffer.
        callback(new Error('Socket is closed'));
        break;
      default:
      //
    }
  };
};