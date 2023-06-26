'use strict';

var NodeClient = require('./NodeClient');

// Connect to broker, publish message to a topic and then disconnect
var publishMessage = function publishMessage(options, topic, message) {
  return new Promise(function (resolve, reject) {
    var client = new NodeClient(options);

    client.once('connect', function () {
      client.publish(topic, message, {}, function (err) {
        if (err) {
          client.end();
          reject(err);
        } else {
          client.end();
          resolve();
        }
      });
    });
    client.once('error', function (err) {
      client.end();
      reject(err);
    });
    client.once('offline', function () {
      client.end();
      reject(new Error('MQTT went offline'));
    });
  });
};

module.exports = publishMessage;