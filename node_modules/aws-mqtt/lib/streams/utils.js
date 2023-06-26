'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var toAsyncFactory = exports.toAsyncFactory = function toAsyncFactory(socketOrFactory) {
  var continueWithError = function continueWithError(error) {
    return function (callback) {
      return process.nextTick(function () {
        return callback(error);
      });
    };
  };
  var continueWithValue = function continueWithValue(value) {
    return function (callback) {
      return process.nextTick(function () {
        return callback(null, value);
      });
    };
  };
  var invalidArgsError = new Error('Must call createStream with a socket or factory function');
  if (!socketOrFactory) return continueWithError(invalidArgsError);
  if ((typeof socketOrFactory === 'undefined' ? 'undefined' : _typeof(socketOrFactory)) === 'object') return continueWithValue(socketOrFactory);
  if (typeof socketOrFactory === 'function' && socketOrFactory.length === 0) return continueWithValue(socketOrFactory()); // for sync functions
  if (typeof socketOrFactory === 'function' && socketOrFactory.length > 0) return socketOrFactory;
  return continueWithError(invalidArgsError);
};

var concatChunks = exports.concatChunks = function concatChunks(chunks) {
  //chunks ::  [{ chunk: ..., encoding: ... }]
  var toBuffer = function toBuffer(chunk, encoding) {
    return encoding === 'utf8' ? Buffer.from(chunk, 'utf8') : chunk;
  };
  var buffers = chunks.map(function (c) {
    return toBuffer(c.chunk, c.encoding);
  });
  return Buffer.concat(buffers);
};

var initWebSocket = exports.initWebSocket = function initWebSocket(stream, socket) {
  socket.binaryType = 'arraybuffer';
  socket.onopen = openHandler(stream, socket);
  socket.onclose = closeHandler(stream);
  socket.onerror = noopHandler();
  socket.onmessage = messageHandler(stream);

  // This event is only used for WS socket not the native WebSocket
  socket.addEventListener('unexpected-response', function (req, res) {
    var data = '';
    res.on('data', function (chunk) {
      data = data + chunk;
    });
    res.on('end', function () {
      var err = new Error('Unexpected server response: ' + res.statusCode);
      err.body = data;
      // console.log('unexpected-response handler', res.statusCode, data)
      stream.emit('error', err);
      // IMPORTANT: first emit error, THEN socket.close, otherwise socket.close will emit its own generic error
      // and our more informative err will never be seen
      socket.close();
    });
  });

  stream.on('finish', streamFinishHandler(socket));
  stream.on('close', streamCloseHandler(socket));
  return socket;
};

var closeStreamWithError = exports.closeStreamWithError = function closeStreamWithError(stream, err) {
  stream.emit('error', err);
  stream.emit('close');
};

var openHandler = function openHandler(stream, socket) {
  return function (evt) {
    socket.onerror = errorHandler(stream);
    stream.emit('connect');
  };
};

// See https://tools.ietf.org/html/rfc6455#section-7.4.1
var statusCodes = {
  1006: 'Connection was closed abnormally'
};

var closeHandler = function closeHandler(stream) {
  return function (evt) {
    var code = evt.code,
        reason = evt.reason,
        wasClean = evt.wasClean;
    // console.log('WebSocketStream closeHandler:', code, reason, wasClean)

    if (!wasClean) {
      var message = reason || statusCodes[code] || 'Connection closed with code ' + code;
      var err = new Error(message);
      err.code = code;
      err.msg = message;
      stream.emit('error', err);
    }
    stream.emit('close'); // as a Readable, when socket is closed, indicate to consumers no more data is coming
  };
};

var noopHandler = function noopHandler() {
  return function (evt) {};
};

var errorHandler = function errorHandler(stream) {
  return function (evt) {
    var err = evt.error || evt; // ws.WebSocket has evt.error, native WebSocket emits an error
    // console.log('WebSocketStream onerror', err, evt.error, evt.message)
    // stream.emit('error', err)
  };
};

var messageHandler = function messageHandler(stream) {
  var toBuffer = function toBuffer(b) {
    return Buffer.isBuffer(b) ? b : Buffer.from(b);
  };

  return function (evt) {
    stream.push(toBuffer(evt.data));
  };
};
var streamFinishHandler = function streamFinishHandler(socket) {
  return function () {
    if (socket.readyState === socket.OPEN) {
      socket.close();
    }
  };
};
var streamCloseHandler = function streamCloseHandler(socket) {
  return function () {
    if (socket.readyState === socket.OPEN) {
      socket.close();
    }
  };
};