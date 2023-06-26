'use strict';

const MyDysonDriver = require("../../lib/MyDysonDriver");

const FanProductTypes = [
  "475", // DYSON_PURE_COOL_LINK_TOUR
  "469", // DYSON_PURE_COOL_LINK_DESK
  "455", // DYSON_PURE_HOT_COOL_LINK_TOUR
  "438", // DYSON_PURE_COOL
  "358", // DYSON_PURE_COOL_HUMIDIFY
  "520", // DYSON_PURE_COOL_DESKTOP
  "527", // DYSON_PURE_HOT_COOL
];

module.exports = class DysonLinkDriver extends MyDysonDriver {
  filterProductType(type) {
    this.log("Fan type: " + type);
    return FanProductTypes.indexOf(type) > -1;
  }

  onInit() {
    this.homey.flow.getActionCard('dyson_link_oscillate_true')
      .registerRunListener(({ device }) => {
        return device.triggerCapabilityListener('oscillate', true);
      });

    this.homey.flow.getActionCard('dyson_link_oscillate_false')
      .registerRunListener(({ device }) => {
        return device.triggerCapabilityListener('oscillate', false);
      });

    this.homey.flow.getActionCard('dyson_link_auto_true')
      .registerRunListener(({ device }) => {
        return device.triggerCapabilityListener('auto', true);
      });

    this.homey.flow.getActionCard('dyson_link_auto_false')
      .registerRunListener(({ device }) => {
        return device.triggerCapabilityListener('auto', false);
      });

    this.homey.flow.getActionCard('dyson_link_airflow_direction')
      .registerRunListener(({ device, airflow_direction }) => {
          return device.triggerCapabilityListener('airflow_direction', airflow_direction);
      });

    // eslint-disable-next-line camelcase
    this.homey.flow.getActionCard('dyson_link_fan_speed')
      .registerRunListener(({ device, fan_speed }) => {
        return device.triggerCapabilityListener('fan_speed', fan_speed);
      });

    this.homey.flow.getActionCard('dyson_link_night_mode_true')
      .registerRunListener(({ device }) => {
        return device.triggerCapabilityListener('night_mode', true);
      });

    this.homey.flow.getActionCard('dyson_link_night_mode_false')
      .registerRunListener(({ device }) => {
        return device.triggerCapabilityListener('night_mode', false);
      });

    this.homey.flow.getActionCard('dyson_link_sleep_timer')
      .registerRunListener(({ time, device }) => {
        return device.setSleepTimer(time);
      });
  }
};
