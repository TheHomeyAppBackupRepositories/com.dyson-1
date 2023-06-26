'use strict';

const MyDysonDevice = require("../../lib/MyDysonDevice");

const ChargingStates = [
  'INACTIVE_CHARGING',
  'INACTIVE_CHARGED',
  'FULL_CLEAN_CHARGING',
  'MAPPING_CHARGING'
];

const PowerModes = ['quiet', 'high', 'max'];

const Settings = {
  DefaultPowerMode: 'default_power_mode'
};

// Reference: https://github.com/shenxn/libdyson/blob/main/libdyson/dyson_vacuum_device.py
module.exports = class Dyson360HeuristicDevice extends MyDysonDevice {
  getStatusEndpoint() {
    return "status";
  }

  /*
   * Lifecycle
   */
  async onInit() {
    await super.onInit();

    // The point of the program state capability is to allow the user to either pause
    // or resume the vacuum by using the ui quick action.
    this.registerCapabilityListener("vacuum_program_state", async (value) => {
      if (value) {
        await this.resume();
      } else {
        await this.pause();
      }
    });

    this.registerCapabilityListener("heuristic_vacuum_abort", async () => {
        await this.abort();
    });

    this.registerCapabilityListener("heuristic_vacuum_clean_all", async () => {
      await this.startAll();
    });

    this.registerCapabilityListener("heuristic_vacuum_pause", async () => {
      await this.pause();
    });

    this.registerCapabilityListener("heuristic_vacuum_resume", async () => {
      await this.resume();
    });

    this.device.on('message:CURRENT-STATE', ({ message: state }) => {
      // this.log('Current state', state);
      this.onState(state);
    });
  }

  async onUninit() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    if (this.device) {
      this.device.disconnectAndExit()
        .catch(this.error);
    }
  }

  async onDeleted() {
    await this.onUninit();
  }

  async onSettings({ oldSettings, newSettings, changedKeys}) {
    for (const key of changedKeys) {
      if (key === Settings.DefaultPowerMode) {
        const newPowerMode = this.settingToPowerMode(newSettings[Settings.DefaultPowerMode]);
        this.log(`Setting new power mode to ${newSettings[Settings.DefaultPowerMode]} (${newPowerMode})`);
        await this.setDefaultVacuumPowerMode(newPowerMode);
      }
    }
  }

  /*
   * Events
  */
  onState(state) {
    this.setCapabilityValue('vacuum_program_state', state.state.indexOf('PAUSED') === -1)
      .catch(this.error);
    this.setCapabilityValue('measure_battery', state.batteryChargeLevel)
      .catch(this.error);
    this.setCapabilityValue('heuristic_vacuum_state', state.state)
      .catch(this.error);
    this.setCapabilityValue('heuristic_vacuum_power_mode', this.powerModeToSetting(state.currentVacuumPowerMode))
      .catch(this.error);
    this.setCapabilityValue('vacuum_charging', ChargingStates.indexOf(state.state) > -1)
      .catch(this.error);

    this.setSettings({
      [Settings.DefaultPowerMode]: this.powerModeToSetting(state.defaultVacuumPowerMode)
    }).catch(this.error);
  }

  async abort() {
    await this.device.command({ command: 'ABORT' });
  }

  async pause() {
    await this.device.command({ command: 'PAUSE' });
  }

  async resume() {
    await this.device.command({ command: 'RESUME' });
  }

  async setDefaultPowerMode(mode) {
    await this.setDefaultVacuumPowerMode(
      this.settingToPowerMode(mode)
    );
  }

  async startAll() {
    await this.device.command({
      command: 'START',
      data: {
        cleaningMode: 'global',
        fullCleanType: 'immediate'
      }
    });
  }

  async setDefaultVacuumPowerMode(value) {
    await this.device.command({
      command: 'STATE-SET',
      data: {
        defaultVacuumPowerMode: value
      }
    });
  }

  powerModeToSetting(value) {
    value = parseInt(value);

    if (value < 1 || value > 3) {
      throw `Invalid power mode ${value} received.`;
    }

    return PowerModes[value - 1];
  }

  settingToPowerMode(value) {
    const index = PowerModes.indexOf(value);

    if (index < 0) {
      throw `Invalid power setting ${value} received.`;
    }

    return (index + 1).toString();
  }
};
