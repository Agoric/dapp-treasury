/**
 * @typedef {Object} DeployPowers The special powers that `agoric deploy` gives us
 * @property {(path: string) => { moduleFormat: string, source: string }} bundleSource
 * @property {(path: string) => string} pathResolve
 */

import { E } from "@agoric/eventual-send";

/**
 * @param {any} referencesPromise A promise for the references
 * available from REPL home
 * @param {DeployPowers} powers
 */
export default async function deployShutdown(referencesPromise, { bundleSource, pathResolve }) {
  
  // TODO: ensure this works
  
  const { uploads: scratch, wallet } = await referencesPromise;
  const adminPayoutP = E(scratch).get('adminPayoutP');
  const completeObj = E(scratch).get('completeObj');

  const moolaPurse = await E(wallet).getPurse('Fun budget');
  adminPayoutP.then(async payout => {
    const moolaPayment = await payout.Tip;
    console.log('tip payment in moola received. Depositing now.');
    try {
      await E(moolaPurse).deposit(moolaPayment);
    } catch (e) {
      console.error(e);
    } finally {
      console.log('deposit successful.');
    }
  });

  await E(completeObj).complete();

  console.log('Contract is shut down.');
}
