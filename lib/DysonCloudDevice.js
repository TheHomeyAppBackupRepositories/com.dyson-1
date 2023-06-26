'use strict';

const { EventEmitter } = require('events');
const AWSMQTT = require('aws-mqtt/lib/NodeClient');

module.exports = class DysonCloudDevice extends EventEmitter {

  constructor({
    homey,

    serial,
    productType,

    region,
    endpoint,
    credentials,
    clientId,

    statusEndpoint
  }) {
    super();

    this.homey = homey;
    this.productType = productType;
    this.serial = serial;
    this.region = region;
    this.endpoint = endpoint;
    this.clientId = clientId;
    this.credentials = credentials;
    this.statusEndpoint = statusEndpoint;
  }

  async getClient() {
    if (!this.client) {
      this.client = Promise.resolve().then(async () => {

        const options = {
          region: this.region,
          endpoint: this.endpoint,
          clientId: this.clientId,
          clean: true,
          credentials: {
            get: cb => cb(null), // shim for AWS.Credentials
            ...this.credentials,
          },
        };

        this.__client = new AWSMQTT(options);

        this.homey.log('Created new client', this.__client.options.clientId + ", status endpoint: " + this.statusEndpoint);

        return new Promise((resolve, reject) => {
          this.__client.on('connect', () => {
            this.homey.log('AWSMQTT connected');
            this.__client.subscribe(`${this.productType}/${this.serial}/${this.statusEndpoint}`, {
              qos: 1,
            });
            this.emit('socket:connected');
            resolve(this.__client);
          });
          this.__client.on('reconnect', () => {
            this.homey.log('AWSMQTT Reconnect');
            this.emit('socket:reconnect');
          });
          this.__client.on('close', err => {
            this.homey.error('AWSMQTT Close:', err);
            this.emit('socket:close');
            reject(err || 'Closed');
          });
          this.__client.on('offline', err => {
            this.homey.error('AWSMQTT Offline:', err);
            this.emit('socket:offline');
            reject(err || 'Offline');
          });
          this.__client.on('error', err => {
            this.homey.error('AWSMQTT Error:', err);
            reject(err || 'Unknown Error');
          });
          this.__client.on('message', (topic, message) => {
            try {
              message = JSON.parse(message);
              this.emit('message', {
                topic,
                message,
              });
              this.emit(`message:${message.msg}`, {
                topic,
                message,
              });
            } catch (err) {
              this.homey.error('Error parsing message', err);
            }
          });
        });
      });
    }

    return this.client;
  }

  /**
   * Deletes MQTT socket and sets new credentials used for the next connect
   *
   * @param serial
   * @param region
   * @param endpoint
   * @param credentials
   * @param clientId
   */
  deleteClientAndSetNewCredentials({
    serial, region, endpoint, credentials, clientId,
  }) {
    this.serial = serial;
    this.region = region;
    this.endpoint = endpoint;
    this.clientId = clientId;
    this.credentials = credentials;

    if (this.__client) {
      this.__client.end(true);
      this.__client.removeAllListeners();

      delete this.client;
      this.homey.log('Deleted the client');
    }
  }

  /**
   * End the client and remove all listeners
   *
   * @returns {Promise<void>}
   */
  async disconnectAndExit() {
    this.homey.log('disconnectAndExit');
    if (this.__client) {
      this.__client.removeAllListeners();
      this.__client.end();
    }

    this.removeAllListeners();
  }

  async publish({ topic, message }) {
    const client = await this.getClient();

    return new Promise((resolve, reject) => {
      client.publish(topic, JSON.stringify(message), {
        qos: 1,
      }, (err, result) => {
        if (err) return reject(err);
        return resolve(result);
      });
    });
  }

  async command({ command, data }) {
    this.homey.log(`Command: ${command}`, data);
    return this.publish({
      topic: `${this.productType}/${this.serial}/command`,
      message: {
        data,
        msg: command,
        time: (new Date()).toISOString(),
      },
    });
  }

  async getState() {
    return this.command({
      command: 'REQUEST-CURRENT-STATE',
    });
  }

  async setState(data) {
    await this.command({
      command: 'STATE-SET',
      data,
    });
  }

};
