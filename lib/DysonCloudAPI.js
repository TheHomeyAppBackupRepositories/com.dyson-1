'use strict';

const https = require('https');
const fetch = require('node-fetch');

const DysonCloudError = require('./DysonCloudError');

const agent = new https.Agent({
  rejectUnauthorized: false,
});
module.exports = class DysonCloudAPI {

  static API_URL = 'https://appapi.cp.dyson.com';

  constructor({
    homey,
    token = null,
    email,
    password,
  }) {
    this.homey = homey;
    this.token = token;

    if (!email) throw new Error('Missing E-mail');
    this.email = email;

    if (!password) throw new Error('Missing Password');
    this.password = password;
  }

  async call({
    method,
    path,
    queryParams,
    body,
    headers,
  }) {
    let url = `${this.constructor.API_URL}${path}`;

    if (queryParams) {
      url = `${url}?${queryParams}`;
    }

    const res = await fetch(url, {
      agent,
      method,
      headers: {
        'User-Agent': 'DysonLink/34277 CFNetwork/1331.0.7 Darwin/21.4.0',
        'Content-Type': 'application/json',

        ...(this.token
          ? { Authorization: `Bearer ${this.token}` }
          : {}),

        ...headers,
      },
      body: body
        ? JSON.stringify(body)
        : undefined,
    });

    if (res.status === 204) {
      return undefined;
    }

    const text = await res.text();

    let json;
    try {
      json = JSON.parse(text);
    } catch (err) {
      this.homey.error(err, text);
      throw new DysonCloudError(text || 'Unknown Error', res.status);
    }

    if (!res.ok) {
      throw new DysonCloudError(json['Message'] || res.statusText || res.status);
    }

    return json;
  }

  /**
   * This call is (possibly) needed to whitelist the IP address for login
   * @returns {Promise<void>}
   */
  async iOSProvisioning() {
    return this.call({
      method: 'GET',
      path: '/v1/provisioningservice/application/ios/version',
    });
  }

  async getUserStatus() {
    const {
      accountStatus,
      authenticationMethod,
    } = await this.call({
      method: 'POST',
      path: '/v3/userregistration/email/userstatus',
      queryParams: 'country=GB',
      body: {
        email: this.email,
      },
    });

    return {
      accountStatus,
      authenticationMethod,
    };
  }

  async getUserChallenge() {
    const {
      challengeId,
    } = await this.call({
      method: 'POST',
      path: '/v3/userregistration/email/auth',
      queryParams: 'country=GB&culture=en-GB',
      body: {
        email: this.email,
      },
    });

    return {
      challengeId,
    };
  }

  async verifyUserChallenge({ challengeId, otpCode }) {
    const {
      account,
      token,
      tokenType,
    } = await this.call({
      method: 'POST',
      path: '/v3/userregistration/email/verify',
      queryParams: 'country=GB',
      body: {
        challengeId,
        otpCode,
        email: this.email,
        password: this.password,
      },
    }).catch(err => {
      this.homey.error(err);
      throw new Error('Invalid Password or 2FA Token');
    });

    this.token = token;

    return {
      account,
      token,
      tokenType,
    };
  }

  async requireToken() {
    if (!this.token) {
      throw new DysonCloudError('Not Logged In');
    }
  }

  async getDevices() {
    await this.requireToken();

    return this.call({
      method: 'GET',
      path: '/v2/provisioningservice/manifest',
    });
  }

  async getDevice({ serial }) {
    await this.requireToken();

    const devices = await this.getDevices();
    const device = devices.find(device => device['Serial'] === serial);
    if (!device) {
      throw new DysonCloudError(`Device Not Found: ${serial}`, 404);
    }
    return device;
  }

  async getIOTRoleCredentials({ serial, guid }) {
    await this.requireToken();

    return this.call({
      method: 'POST',
      path: '/v1/authorize/iot-role-credentials',
      body: { serial, guid },
    });
  }

};
