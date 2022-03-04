/* global process */
import { E } from '@agoric/eventual-send';

// Taken from window.DAPP_CONSTANTS_JSON in index.html, defaulting to .env.local.
import defaults from '../generated/defaults';

// eslint-disable-next-line import/no-mutable-exports
let dappConfig;
export { dappConfig };

dappConfig = process.env.REACT_APP_DAPP_CONSTANTS_JSON
  ? JSON.parse(process.env.REACT_APP_DAPP_CONSTANTS_JSON)
  : defaults;

export async function refreshConfigFromWallet(walletP, useGetRUN = false) {
  if (!dappConfig.ON_CHAIN_CONFIG) {
    // No refresh required.
    return;
  }

  const [method, args] = dappConfig.ON_CHAIN_CONFIG;
  if (useGetRUN) {
    const [getRunMethod, getRunArgs] = dappConfig.GET_RUN_ON_CHAIN_CONFIG;
    const [
      getRunInstallationMethod,
      getRunInstallationArgs,
    ] = dappConfig.GET_RUN_INSTALLATION_ON_CHAIN_CONFIG;

    const [
      overrideConfig,
      getRunInstance,
      getRunInstallation,
    ] = await Promise.all([
      E(walletP)[method](...args),
      E(walletP)[getRunMethod](...getRunArgs),
      E(walletP)[getRunInstallationMethod](...getRunInstallationArgs),
    ]);
    console.log('overriding with', {
      ...dappConfig,
      ...overrideConfig,
      getRunInstance,
      getRunInstallation,
    });
    dappConfig = {
      ...dappConfig,
      ...overrideConfig,
      getRunInstance,
      getRunInstallation,
    };
  } else {
    console.log('have methods', method, 'args', args);
    const overrideConfig = await E(walletP)[method](...args);
    console.log('overriding with', {
      ...overrideConfig,
    });
    dappConfig = { ...dappConfig, ...overrideConfig };
  }
}
