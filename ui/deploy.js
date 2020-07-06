// @ts-check
// Agoric Dapp UI deployment script

// NOTE: In the future, this will take place via the wallet UI.
// Until that time, this allows contract developers to add their
// issuer and purse to an individual wallet.

import dappConstants from './public/conf/defaults.js';
import { E } from '@agoric/eventual-send';

// deploy.js runs in an ephemeral Node.js outside of swingset. The
// spawner runs within ag-solo, so is persistent.  Once the deploy.js
// script ends, connections to any of its objects are severed.

const ASSURANCE_ISSUER_PETNAME = 'encouragement';
const ASSURANCE_PURSE_PETNAME = 'Emotional bank account';

// The contract's registry key for the assurance issuer.
const {
  issuerRegKeys: { Assurance: ASSURANCE_ISSUER_REGKEY },
  brandRegKeys: { Assurance: ASSURANCE_BRAND_REGKEY },
} = dappConstants;

/**
 * @typedef {Object} DeployPowers The special powers that `agoric deploy` gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

/**
 * @param {any} homePromise A promise for the references
 * available from REPL home
 * @param {DeployPowers} powers
 */
export default async function deployWallet(homePromise, { bundleSource, pathResolve }) {

  // Let's wait for the promise to resolve.
  const home = await homePromise;

  // Unpack the home references.
  const { 

    // *** LOCAL REFERENCES ***

    // This wallet only exists on this machine, and only you have
    // access to it. The wallet stores purses and handles transactions.
    wallet, 

    // *** ON-CHAIN REFERENCES ***

    // The registry lives on-chain, and is used to make private
    // objects public to everyone else on-chain. These objects get
    // assigned a unique string key. Given the key, other people can
    // access the object through the registry.
    registry,

  } = home;

  // Install this Dapp's issuer and empty purse in the wallet.
  const assuranceIssuer = await E(registry).get(ASSURANCE_ISSUER_REGKEY);
  if (!assuranceIssuer) {
    throw Error(`The ${ASSURANCE_ISSUER_REGKEY} registry key was not found; first:
agoric deploy contract/deploy.js api/deploy.js`);
  }

  // Associate the issuer with a petname.
  await E(wallet).addIssuer(ASSURANCE_ISSUER_PETNAME, assuranceIssuer, ASSURANCE_BRAND_REGKEY);

  // Create an empty purse for that issuer, and give it a petname.
  await E(wallet).makeEmptyPurse(ASSURANCE_ISSUER_PETNAME, ASSURANCE_PURSE_PETNAME);

  // We are done!
  console.log('INSTALLED in local wallet');
  console.log(`Encouragement issuer:`, ASSURANCE_ISSUER_PETNAME);
  console.log(`Encouragement purse:`, ASSURANCE_PURSE_PETNAME);
}
