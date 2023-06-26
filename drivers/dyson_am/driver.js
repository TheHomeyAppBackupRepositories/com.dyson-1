'use strict';

const Homey = require('homey');

module.exports = class DysonAmDriver extends Homey.Driver {

  async onInit() {
    this.homey.flow.getActionCard('dyson_am_oscillate').registerRunListener(({ device }) => {
      return device.toggleOscillate();
    });

    this.homey.flow.getActionCard('dyson_am_more_air').registerRunListener(({ device, amount }) => {
      for (let i = 0; i < amount; i++) {
        this.homey.setTimeout(() => {
          device.triggerCapabilityListener('more_air').catch(() => { });;
        }, i * 750);
      }
    });

    this.homey.flow.getActionCard('dyson_am_less_air').registerRunListener(({ device, amount }) => {
      for (let i = 0; i < amount; i++) {
        this.homey.setTimeout(() => {
          device.triggerCapabilityListener('less_air').catch(() => { });
        }, i * 750);
      }
    });
  }

}