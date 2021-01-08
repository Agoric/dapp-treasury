// @ts-check
// Agoric Dapp api deployment script

import fs from 'fs';
import { E } from '@agoric/eventual-send';
import '@agoric/zoe/exported';
import bundleSource from '@agoric/bundle-source';
import { makeHelpers } from '@agoric/deploy-script-support';

import installationConstants from '../ui/public/conf/installationConstants';

const API_PORT = process.env.API_PORT || '8000';

export default async function deployApi(homePromise, endowments) {
  const { board, priceAuthority, zoe, http, spawner } = E.G(homePromise);
  const helpers = await makeHelpers(homePromise, endowments);

  const {
    INSTALLATION_BOARD_ID,
    AUTOSWAP_INSTALLATION_BOARD_ID,
    CONTRACT_NAME,
  } = installationConstants;

  // use the board id to get the values, and save them to the
  // wallet.
  const autoswapInstall = await E(board).getValue(
    AUTOSWAP_INSTALLATION_BOARD_ID,
  );
  const stablecoinMachineInstallation = await E(board).getValue(
    INSTALLATION_BOARD_ID,
  );

  const terms = harden({
    autoswapInstall,
    priceAuthoritySource: priceAuthority,
  });

  const startInstanceConfig = {
    instancePetname: CONTRACT_NAME,
    installation: stablecoinMachineInstallation,
    terms,
    issuerKeywordRecord: {},
  };

  const { instance, creatorFacet } = await helpers.startInstance(
    startInstanceConfig,
  );

  console.log('- SUCCESS! contract instance is running on Zoe');

  console.log('Retrieving Board IDs for issuers and brands');
  const invitationIssuerP = E(zoe).getInvitationIssuer();
  const invitationBrandP = E(invitationIssuerP).getBrand();

  const invitationIssuer = await invitationIssuerP;

  const INSTANCE_BOARD_ID = await E(board).getId(instance);

  console.log(`-- Contract Name: ${CONTRACT_NAME}`);
  console.log(`-- INSTANCE_BOARD_ID: ${INSTANCE_BOARD_ID}`);

  const installURLHandler = async () => {
    const bundle = await bundleSource(
      helpers.resolvePathForLocalContract('./src/handler.js'),
    );

    // Install it on the spawner
    const handlerInstall = E(spawner).install(bundle);

    // Spawn the installed code to create an URL handler.
    const handler = E(handlerInstall).spawn({
      creatorFacet,
      board,
      http,
      invitationIssuer,
    });

    // Have our ag-solo wait on ws://localhost:8000/api/card-store for
    // websocket connections.
    await E(http).registerURLHandler(handler, '/api/card-store');
  };

  await installURLHandler();

  const invitationBrand = await invitationBrandP;
  const INVITE_BRAND_BOARD_ID = await E(board).getId(invitationBrand);

  const API_URL = process.env.API_URL || `http://127.0.0.1:${API_PORT || 8000}`;

  // Re-save the constants somewhere where the UI and api can find it.
  const dappConstants = {
    INSTANCE_BOARD_ID,
    INSTALLATION_BOARD_ID,
    INVITE_BRAND_BOARD_ID,
    // BRIDGE_URL: 'agoric-lookup:https://local.agoric.com?append=/bridge',
    BRIDGE_URL: 'http://127.0.0.1:8000',
    API_URL,
  };
  const defaultsFile = endowments.pathResolve(`../ui/public/conf/defaults.js`);
  console.log('writing', defaultsFile);
  const defaultsContents = `\
// GENERATED FROM ${endowments.pathResolve('./deploy.js')}
export default ${JSON.stringify(dappConstants, undefined, 2)};
`;
  await fs.promises.writeFile(defaultsFile, defaultsContents);
}
