// @ts-check
// Agoric Dapp api deployment script

import fs from 'fs';
import installationConstants from '../ui/public/conf/installationConstants.js';
import { E } from '@agoric/eventual-send';
import harden from '@agoric/harden';

// deploy.js runs in an ephemeral Node.js outside of swingset. The
// spawner runs within ag-solo, so is persistent.  Once the deploy.js
// script ends, connections to any of its objects are severed.

// The deployer's wallet's petname for the tip issuer.
const TIP_ISSUER_PETNAME = process.env.TIP_ISSUER_PETNAME || 'moola';

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
export default async function deployApi(homePromise, { bundleSource, pathResolve }) {

  // Let's wait for the promise to resolve.
  const home = await homePromise;

  // Unpack the references.
  const { 

    // *** LOCAL REFERENCES ***

    // This wallet only exists on this machine, and only you have
    // access to it. The wallet stores purses and handles transactions.
    wallet, 

    // Scratch is a map only on this machine, and can be used for
    // communication in objects between processes/scripts on this
    // machine.
    uploads: scratch,  

    // The spawner persistently runs scripts within ag-solo, off-chain.
    spawner,

    // *** ON-CHAIN REFERENCES ***

    // Zoe lives on-chain and is shared by everyone who has access to
    // the chain. In this demo, that's just you, but on our testnet,
    // everyone has access to the same Zoe.
    zoe, 

    // The registry also lives on-chain, and is used to make private
    // objects public to everyone else on-chain. These objects get
    // assigned a unique string key. Given the key, other people can
    // access the object through the registry
    registry,

    // The http request handler.
    // TODO: add more explanation
    http,


  } = home;

  // To get the backend of our dapp up and running, first we need to
  // grab the installationHandle that our contract deploy script put
  // in the public registry.
  const { 
    INSTALLATION_REG_KEY,
    CONTRACT_NAME,
  } = installationConstants;
  const encouragementContractInstallationHandle = await E(registry).get(INSTALLATION_REG_KEY);
  
  // Second, we can use the installationHandle to create a new
  // instance of our contract code on Zoe. A contract instance is a running
  // program that can take offers through Zoe. Creating a contract
  // instance gives you an invite to the contract. In this case, it is
  // an admin invite with special authority - whoever redeems this
  // admin invite will get all of the tips from the encouragement
  // contract instance.

  // At the time that we make the contract instance, we need to tell
  // Zoe what kind of token to accept as tip money. In this instance,
  // we will only accept moola. (If we wanted to accept other kinds of
  // tips, we could create other instances or edit the contract code
  // and redeploy.) We need to put this information in the form of a
  // keyword (a string that the contract determines, in this case,
  // 'Tip') plus an issuer for the token kind, the moolaIssuer.

  // In our example, moola is a widely used token. Someone has already
  // registered the moolaIssuer in the registry. We could also get it
  // from our wallet.

  // getIssuers returns an array, because we currently cannot
  // serialize maps. We can immediately create a map using the array,
  // though. https://github.com/Agoric/agoric-sdk/issues/838
  const issuersArray = await E(wallet).getIssuers();
  const issuers = new Map(issuersArray);
  const tipIssuer = issuers.get(TIP_ISSUER_PETNAME);

  if (tipIssuer === undefined) {
    console.error('Cannot find TIP_ISSUER_PETNAME', TIP_ISSUER_PETNAME, 'in home.wallet');
    console.error('Have issuers:', [...issuers.keys()].join(', '));
    process.exit(1);
  }

  // Find its brand registry key so we can communicate the issuer to other wallets.
  // Equivalent to: await wallet~.getIssuerNames(tipIssuer)~.brandRegKey
  const TIP_BRAND_REGKEY = await E.G(E(wallet).getIssuerNames(tipIssuer)).brandRegKey;

  const issuerKeywordRecord = harden({ Tip: tipIssuer });
  const {
    invite: adminInvite,
    instanceRecord: { publicAPI, handle: instanceHandle },
  } = await E(zoe)
    .makeInstance(encouragementContractInstallationHandle, issuerKeywordRecord);
  console.log('- SUCCESS! contract instance is running on Zoe');

  // An instanceHandle is an opaque identifier like an installationHandle.
  // instanceHandle identifies an instance of a running contract.
  if (!instanceHandle) {
    console.log('- FAILURE! contract instance NOT retrieved.');
    throw new Error('Unable to create contract instance');
  }

  // Let's use the adminInvite to make an offer. Note that we aren't
  // specifying any proposal, and we aren't escrowing any assets with
  // Zoe in this offer. We are doing this so that Zoe will eventually
  // give us a payout of all of the tips. We can trigger this payout
  // by calling the `complete` function on the `completeObj`.
  const {
    payout: adminPayoutP,
    outcome: adminOutcomeP, 
    completeObj,
  } = await E(zoe).offer(adminInvite);

  const outcome = await adminOutcomeP;
  console.log(`-- ${outcome}`);

  // When the promise for a payout resolves, we want to deposit the
  // payments in our purses. We will put the adminPayoutP and
  // completeObj in our scratch location so that we can share the
  // live objects with the shutdown.js script. 
  E(scratch).set('adminPayoutP', adminPayoutP);
  E(scratch).set('completeObj', completeObj);

  // Now that we've done all the admin work, let's share this
  // instanceHandle by adding it to the registry. Any users of our
  // contract will use this instanceHandle to get invites to the
  // contract in order to make an offer.
  const INSTANCE_REG_KEY = await E(registry).register(`${CONTRACT_NAME}instance`, instanceHandle);
  const assuranceIssuer = await E(publicAPI).getAssuranceIssuer();
  const ASSURANCE_ISSUER_REGKEY = await E(registry).register(`${CONTRACT_NAME}assurance`, assuranceIssuer);
  const ASSURANCE_BRAND_REGKEY = await E(registry).register(`assurance`, await E(assuranceIssuer).getBrand());

  console.log(`-- Contract Name: ${CONTRACT_NAME}`);
  console.log(`-- InstanceHandle Register Key: ${INSTANCE_REG_KEY}`);
  console.log(`-- ASSURANCE_ISSUER_REGKEY: ${ASSURANCE_ISSUER_REGKEY}`);
  console.log(`-- ASSURANCE_BRAND_REGKEY: ${ASSURANCE_BRAND_REGKEY}`);
  console.log(`-- TIP_BRAND_REGKEY: ${TIP_BRAND_REGKEY}`);

  // We want the handler to run persistently. (Scripts such as this
  // deploy.js script are ephemeral and all connections to objects
  // within this script are severed when the script is done running.)
  // To run the handler persistently, we must use the spawner to run
  // the code on this machine even when the script is done running.

  // Bundle up the handler code
  const bundle = await bundleSource(pathResolve('./src/handler.js'));
  
  // Install it on the spawner
  const handlerInstall = E(spawner).install(bundle);

  // Spawn the running code
  const handler = E(handlerInstall).spawn({ publicAPI, http });
  await E(http).registerAPIHandler(handler);


  // Re-save the constants somewhere where the UI and api can find it.
  const dappConstants = {
    INSTANCE_REG_KEY,
    // BRIDGE_URL: 'agoric-lookup:https://local.agoric.com?append=/bridge',
    brandRegKeys: { Tip: TIP_BRAND_REGKEY, Assurance: ASSURANCE_BRAND_REGKEY },
    issuerRegKeys: { Assurance: ASSURANCE_ISSUER_REGKEY },
    BRIDGE_URL: 'http://127.0.0.1:8000',
    API_URL: 'http://127.0.0.1:8000',
  };
  const defaultsFile = pathResolve(`../ui/public/conf/defaults.js`);
  console.log('writing', defaultsFile);
  const defaultsContents = `\
// GENERATED FROM ${pathResolve('./deploy.js')}
export default ${JSON.stringify(dappConstants, undefined, 2)};
`;
  await fs.promises.writeFile(defaultsFile, defaultsContents);
}
