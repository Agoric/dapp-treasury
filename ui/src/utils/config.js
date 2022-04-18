/* global process */
import { E } from '@endo/eventual-send';

// Taken from window.DAPP_CONSTANTS_JSON in index.html, defaulting to .env.local.
import defaults from '../generated/defaults';

// eslint-disable-next-line import/no-mutable-exports
let dappConfig;
export { dappConfig };

dappConfig = process.env.REACT_APP_DAPP_CONSTANTS_JSON
  ? JSON.parse(process.env.REACT_APP_DAPP_CONSTANTS_JSON)
  : defaults;

export async function refreshConfigFromWallet(walletP, useGetRUN) {
  if (!dappConfig.ON_CHAIN_CONFIG && !dappConfig.RUN_STAKE_ON_CHAIN_CONFIG) {
    // No refresh required.
    return;
  }

  if (useGetRUN) {
    const [RUNStakeMethod, RUNStakeArgs] = dappConfig.RUN_STAKE_ON_CHAIN_CONFIG;

    console.log('should say overriding with', RUNStakeMethod, RUNStakeArgs);
    const RUNStakeInstance = await E(walletP)[RUNStakeMethod](...RUNStakeArgs);
    console.log('overriding with', {
      ...dappConfig,
      RUNStakeInstance,
    });
    dappConfig = {
      ...dappConfig,
      RUNStakeInstance,
    };
  } else {
    const [method, args] = dappConfig.ON_CHAIN_CONFIG;
    console.log('have methods', method, 'args', args);
    const overrideConfig = await E(walletP)[method](...args);
    console.log('overriding with', {
      ...overrideConfig,
    });
    dappConfig = { ...dappConfig, ...overrideConfig };
  }
}
