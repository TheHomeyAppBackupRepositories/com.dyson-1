const Homey = require("homey");
const DysonCloudAPI = require('./DysonCloudAPI');
const DysonCloudDevice = require('./DysonCloudDevice');
const DysonUtil = require('./DysonUtil');

module.exports = class MyDysonDevice extends Homey.Device {
  static SYNC_INTERVAL = 30000;

  async onInit() {
    await this.setUnavailable();

    // Initialize Store
    const { token } = this.getStore();

    // Initialize Settings
    const { email, password } = this.getSettings();

    if (!email || !password) {
      throw new Error('Missing E-mail & Password. Please log in again.');
    }

    // Initialize API
    this.api = new DysonCloudAPI({
      homey: this.homey,
      token,
      email,
      password,
    });

    // Initialize MQTT
    try {
      await this._initializeMqtt();
    } catch (err) {
      this.error(err);
      this.setUnavailable(err);
    }
  }

  async _initializeMqtt() {
    this.device = await this._createDysonCloudDevice();
    this.log('Getting state');
    const state = await this.device.getState();
    this.log('State:', state);

    await this.setAvailable();

    this.log('Ready:', this.getName(), this.serial);
  }

  async _createDysonCloudDevice() {
    const {
      serial,
      region,
      endpoint,
      credentials,
      clientId,
    } = await this._getDeviceCredentials();

    const {
      productType,
    } = this.getStore();

    const device = new DysonCloudDevice({
      region,
      endpoint,
      credentials,
      clientId,

      serial,
      productType,

      homey: this.homey,
      statusEndpoint: this.getStatusEndpoint()
    });

    device.on('socket:offline', () => {
      this.log('socket:offline');
      this._onConnectionClosed();
    });

    device.on('socket:close', () => {
      this.log('socket:close');
    });

    device.on('socket:connected', () => {
      this._startPollingInterval();
    });

    return device;
  }

  /**
   * Polling for status data
   *
   * @private
   */
  _startPollingInterval() {
    if (this.syncInterval) {
      this.homey.clearInterval(this.syncInterval);
    }
    this.syncInterval = this.homey.setInterval(() => {
      this.device.getState().catch(this.error);
    }, this.constructor.SYNC_INTERVAL);
  }

  /**
   * Get new credentials and reconnect the Dyson Cloud Device
   *
   * @returns {Promise<void>}
   * @private
   */
  async _onConnectionClosed() {
    if (this.syncInterval) {
      this.homey.clearInterval(this.syncInterval);
    }

    const {
      serial,
      region,
      endpoint,
      credentials,
      clientId,
    } = await this._getDeviceCredentials();

    if (this.device) {
      this.device.deleteClientAndSetNewCredentials({
        serial,
        region,
        endpoint,
        credentials,
        clientId,
      });

      await this.device.getState();
    }
  }

  /**
   * Returns the credentials needed to authorise the Dyson Cloud Device
   *
   * @returns {Promise<{endpoint: *, credentials: *, region: *}>}
   * @private
   */
  async _getDeviceCredentials() {
    const {
      serial,
    } = this.getData();

    this.serial = serial;
    const guid = DysonUtil.uuid();

    const { region, endpoint, iamCredentials: credentials } = await this.api.getIOTRoleCredentials({
      serial,
      guid,
    });

    return {
      serial, region, endpoint, credentials, clientId: guid,
    };
  }

  /**
   * Different device types have different status endpoints.
   * The device should inform the DysonCloudDevice of the correct endpoint
   * through this function.
   */
  getStatusEndpoint() {
    throw "Please override getStatusEndpoint";
  }
}
