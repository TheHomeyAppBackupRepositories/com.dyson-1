'use strict';

const MyDysonDevice = require("../../lib/MyDysonDevice");

module.exports = class DysonLinkDevice extends MyDysonDevice {
  getStatusEndpoint() {
    return "status/current";
  }

  /*
   * Lifecycle
   */
  async onInit() {
    await super.onInit();

    if (!this.hasCapability('night_mode')) {
      await this.addCapability('night_mode')
        .catch(this.error);
    }

    if (!this.hasCapability("airflow_direction")) {
      await this.addCapability("airflow_direction")
        .catch(this.error);
    }

    this.device.on('message:CURRENT-STATE', ({ message }) => {
      this.onState(message['product-state']);
    });

    this.device.on('message:ENVIRONMENTAL-CURRENT-SENSOR-DATA', ({ message }) => {
      this.onEnvironment(message['data']);
    });

    // Initialize Capabilities
    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
    this.registerCapabilityListener('airflow_direction', this.onCapabilityAirflowDirection.bind(this));
    this.registerCapabilityListener('fan_speed', this.onCapabilityFanSpeed.bind(this));
    this.registerCapabilityListener('oscillate', this.onCapabilityOscillate.bind(this));
    this.registerCapabilityListener('auto', this.onCapabilityAuto.bind(this));

    // Because this capability is added on migration, make sure it is correctly added before registering
    if (this.hasCapability('night_mode')) {
      this.registerCapabilityListener('night_mode', this.onCapabilityNightMode.bind(this));
    }
  }

  async onUninit() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    if (this.device) {
      this.device.disconnectAndExit().catch(this.error);
    }
  }

  async onDeleted() {
    await this.onUninit();
  }

  /*
   * Events
  */
  onState(data) {
    // Turned On
    Promise.resolve().then(async () => {
      let value = null;
      const { fpwr, fmod } = data;

      if (typeof fpwr === 'string') {
        value = fpwr === 'ON';
      } else {
        value = fmod !== 'OFF';
      }

      await this.setCapabilityValue('onoff', value);
    }).catch(this.error);

    // Airflow Direction
    Promise.resolve().then(async () => {
      const { fdir } = data;
      const capabilityValue = fdir === 'ON' ? 'FORWARD' : 'BACKWARD';
      await this.setCapabilityValue("airflow_direction", capabilityValue);
    }).catch(this.error);

    // Fan Speed
    Promise.resolve().then(async () => {
      let value = null;
      const { fnsp } = data;

      if (fnsp !== 'AUTO') {
        value = Number.parseInt(fnsp, 10);
      }

      await this.setCapabilityValue('fan_speed', value);
    }).catch(this.error);

    // Oscillate
    Promise.resolve().then(async () => {
      let value = null;
      const { oson } = data;

      value = oson === 'ON';

      await this.setCapabilityValue('oscillate', value);
    }).catch(this.error);

    // Auto
    Promise.resolve().then(async () => {
      let value = null;
      const { auto, fmod } = data;

      if (typeof auto === 'string') {
        value = auto === 'ON';
      } else {
        value = fmod === 'AUTO';
      }

      await this.setCapabilityValue('auto', value);
    }).catch(this.error);

    // Night mode
    Promise.resolve().then(async () => {
      let value = null;
      const { nmod } = data;

      value = nmod === 'ON';
      await this.setCapabilityValue('night_mode', value);
    }).catch(this.error);
  }

  onEnvironment(data) {
    // Temperature
    Promise.resolve().then(async () => {
      let value = null;
      const { tact } = data;

      if (tact !== 'OFF' && !Number.isNaN(Number.parseInt(tact, 10))) {
        value = Number.parseFloat(((Number.parseInt(tact, 10) / 10) - 273.15).toFixed(2));
      }

      await this.setCapabilityValue('measure_temperature', value);
    }).catch(this.error);

    // Humidity
    Promise.resolve().then(async () => {
      let value = null;
      const { hact } = data;

      if (hact !== 'OFF' && !Number.isNaN(Number.parseInt(hact, 10))) {
        value = Number.parseInt(hact, 10);
      }

      await this.setCapabilityValue('measure_humidity', value);
    }).catch(this.error);
  }

  /*
   * Capability
   */

  async onCapabilityOnoff(value) {
    if (!this.device) {
      throw new Error('Not Connected');
    }

    await this.device.setState({
      fmod: value ? 'FAN' : 'OFF',
      fpwr: value ? 'ON' : 'OFF',
    });
  }

  async onCapabilityAirflowDirection(value) {
    if (!this.device) {
      throw new Error('Not Connected');
    }

    await this.device.setState({
      fdir: value === 'FORWARD' ? 'ON' : 'OFF'
    });
  }

  async onCapabilityFanSpeed(value) {
    if (!this.device) {
      throw new Error('Not Connected');
    }

    await this.device.setState({
      fpwr: 'ON',
      fnsp: `${value}`,
    });
    await this.setCapabilityValue('onoff', true);
  }

  async onCapabilityOscillate(value) {
    if (!this.device) {
      throw new Error('Not Connected');
    }

    await this.device.setState({
      oson: value ? 'ON' : 'OFF',
    });
  }

  async onCapabilityAuto(value) {
    if (!this.device) {
      throw new Error('Not Connected');
    }

    await this.device.setState({
      auto: value ? 'ON' : 'OFF',
      fmod: value ? 'AUTO' : 'FAN',
    });
  }

  /**
   * Turns night mode on/off
   *
   * @param value
   * @returns {Promise<void>}
   */
  async onCapabilityNightMode(value) {
    if (!this.device) {
      throw new Error('Not Connected');
    }

    await this.device.setState({
      nmod: value ? 'ON' : 'OFF',
    });
  }

  /**
   * Sets a sleep timer for x minutes
   *
   * @param value
   * @returns {Promise<void>}
   */
  async setSleepTimer(value) {
    if (!this.device) {
      throw new Error('Not Connected');
    }

    await this.device.setState({
      sltm: value,
    });
  }

};
