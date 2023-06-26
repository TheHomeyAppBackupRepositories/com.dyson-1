'use strict';

const Homey = require('homey');

module.exports = class DysonAmDevice extends Homey.Device {

  async onInit() {
    this.signal = this.homey.rf.getSignalInfrared('dyson_am');

    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));
    this.registerCapabilityListener('oscillate', this.onCapabilityOscillate.bind(this));
    this.registerCapabilityListener('more_air', this.onCapabilityMoreAir.bind(this));
    this.registerCapabilityListener('less_air', this.onCapabilityLessAir.bind(this));
  }

  /*
   * Flow
   */
  async toggleOscillate() {
    if (this.getCapabilityValue('oscillate')) {
      await this.triggerCapabilityListener('oscillate', false);
    } else {
      await this.triggerCapabilityListener('oscillate', true);
    }
  }

  /*
   * Capabilities
   */
  async onCapabilityOnoff(value) {
    if (value) {
      await this.signal.cmd('ON');
    } else {
      await this.signal.cmd('OFF');
    }
  }

  async onCapabilityOscillate(value) {
    await this.setCapabilityValue('onoff', true);

    if (value) {
      await this.signal.cmd('OSCILLATE_ON');
    } else {
      await this.signal.cmd('OSCILLATE_OFF');
    }
  }

  async onCapabilityMoreAir() {
    await this.setCapabilityValue('onoff', true);
    await this.signal.cmd('MORE_AIR');
  }

  async onCapabilityLessAir() {
    await this.setCapabilityValue('onoff', true);
    await this.signal.cmd('LESS_AIR');
  }

}