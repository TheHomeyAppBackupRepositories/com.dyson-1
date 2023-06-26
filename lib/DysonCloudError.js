'use strict';

module.exports = class DysonCloudError extends Error {

  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }

};
