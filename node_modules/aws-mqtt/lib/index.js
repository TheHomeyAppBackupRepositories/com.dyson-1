'use strict';

var _BrowserClient = require('./BrowserClient');

var _BrowserClient2 = _interopRequireDefault(_BrowserClient);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = _BrowserClient2.default; // Only importing and exporting a browser version of client.
// For the node version, need to import the class not from index.js
// but directly from the file, e.g. require('aws-mqtt/NodeClient')