'use strict';

const Homey = require('homey');
const DysonCloudAPI = require('./DysonCloudAPI');

module.exports = class MyDysonDriver extends Homey.Driver {
  /**
   * @param string type
   * @return boolean
   */
  filterProductType(type) {
    throw "Subclasses should override filterProductType";
  }

  async onPair(session) {
    let api;
    let email;
    let password;
    let challengeId;
    let account;
    let token;
    let tokenType;

    session.setHandler('login', async data => {
      this.log(`E-mail: ${data.username}`);

      email = data.username;
      password = data.password;

      api = new DysonCloudAPI({
        email,
        password,
        homey: this.homey,
      });

      await api.iOSProvisioning()
        .catch(this.error);

      const userStatus = await api.getUserStatus();
      if (userStatus.accountStatus === 'UNREGISTERED') {
        throw new Error('Unknown e-mail address.');
      }

      if (userStatus.accountStatus !== 'ACTIVE') {
        throw new Error(`Invalid Account Status: ${userStatus.accountStatus}`);
      }

      const userChallenge = await api.getUserChallenge();
      challengeId = userChallenge.challengeId;

      return true;
    });

    session.setHandler('pincode', async pincode => {
      this.log(`Pincode: ${pincode}`);

      const userChallengeResult = await api.verifyUserChallenge({
        challengeId,
        otpCode: pincode.join(''),
      });

      account = userChallengeResult.account;
      token = userChallengeResult.token;
      tokenType = userChallengeResult.tokenType;

      return true;
    });

    session.setHandler('list_devices', async () => {
      const devices = await api.getDevices();

      return devices
        .filter(device => this.filterProductType(device['ProductType']))
        .map(device => ({
          name: device['Name'],
          data: {
            serial: device['Serial'],
          },
          store: {
            account,
            token,
            tokenType,
            productType: device['ProductType'],
            connectionType: device['ConnectionType'],
            credentials: device['LocalCredentials'],
          },
          settings: {
            email,
            password,
          },
        }));
    });
  }

  onRepair(session, device) {
    let api;
    let email;
    let password;
    let challengeId;
    let account;
    let token;
    let tokenType;

    session.setHandler('login', async data => {
      this.log(`E-mail: ${data.username}`);

      email = data.username;
      password = data.password;

      api = new DysonCloudAPI({
        email,
        password,
        homey: this.homey,
      });

      await api.iOSProvisioning()
        .catch(this.error);

      const userStatus = await api.getUserStatus();
      if (userStatus.accountStatus === 'UNREGISTERED') {
        throw new Error('Unknown e-mail address.');
      }

      if (userStatus.accountStatus !== 'ACTIVE') {
        throw new Error(`Invalid Account Status: ${userStatus.accountStatus}`);
      }

      const userChallenge = await api.getUserChallenge();
      challengeId = userChallenge.challengeId;

      return true;
    });

    session.setHandler('pincode', async pincode => {
      this.log(`Pincode: ${pincode}`);

      const userChallengeResult = await api.verifyUserChallenge({
        challengeId,
        otpCode: pincode.join(''),
      });

      account = userChallengeResult.account;
      token = userChallengeResult.token;
      tokenType = userChallengeResult.tokenType;

      const { serial } = device.getData();
      const {
        ProductType: productType,
      } = await api.getDevice({ serial });

      await device.setSettings({
        email,
        password,
      });

      await device.setStoreValue('account', account);
      await device.setStoreValue('token', token);
      await device.setStoreValue('tokenType', tokenType);
      await device.setStoreValue('productType', productType);

      await device.onUninit();
      await device.onInit();

      return true;
    });
  }
}
