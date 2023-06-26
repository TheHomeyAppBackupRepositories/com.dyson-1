'use strict';

const Homey = require('homey');

module.exports = class DysonApp extends Homey.App {

  async onInit() {
    this.log('DysonApp is running...');
  }

};
