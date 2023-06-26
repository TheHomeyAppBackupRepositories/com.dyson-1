'use strict';

const MyDysonDriver = require("../../lib/MyDysonDriver");

const VacuumProductTypes = [
  // Note: maybe the Dyson 360 Eye (N223) could be used here too.
  '276', // Dyson 360 Heuristic
]

module.exports = class Dyson360HeuristicDriver extends MyDysonDriver {
  filterProductType(type) {
    return VacuumProductTypes.indexOf(type) > -1;
  }

  async onInit() {
    this.homey.flow.getActionCard("dyson_heuristic_abort")
      .registerRunListener(({ device }) => {
          return device.abort();
      });
    this.homey.flow.getActionCard("dyson_heuristic_pause")
      .registerRunListener(({ device }) => {
        return device.pause();
      });
    this.homey.flow.getActionCard("dyson_heuristic_resume")
      .registerRunListener(({ device }) => {
        return device.resume();
      });
    this.homey.flow.getActionCard("dyson_heuristic_start_all")
      .registerRunListener(({ device }) => {
        return device.startAll();
      });
    this.homey.flow.getActionCard("dyson_heuristic_set_default_power_mode")
      .registerRunListener(({ device, mode }) => {
          return device.setDefaultPowerMode(mode);
      });
  }
};
