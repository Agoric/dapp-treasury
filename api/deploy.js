// @ts-check
// Agoric Dapp api deployment script

import fs from 'fs';
import { E } from '@agoric/eventual-send';
import '@agoric/zoe/exported';
import bundleSource from '@agoric/bundle-source';
import { makeHelpers } from '@agoric/deploy-script-support';

import installationConstants from '../ui/src/generated/installationConstants';
import { makeAddCollateralType } from './addCollateralType';

const API_PORT = process.env.API_PORT || '8000';

const MOOLA_BRAND_PETNAME = 'moola';
const MOOLA_PURSE_PETNAME = 'Fun budget';

// TODO: actually hook up to an on-chain ETHA brand from pegasus
const ETHA_BRAND_PETNAME = 'Testnet.$USD';
const ETHA_PURSE_PETNAME = 'Local currency';

export default async function deployApi(homePromise, endowments) {
  const { board, priceAuthority, zoe, wallet, http, spawner } = E.G(
    homePromise,
  );
  const helpers = await makeHelpers(homePromise, endowments);

  const {
    INSTALLATION_BOARD_ID,
    AMM_INSTALLATION_BOARD_ID,
    CONTRACT_NAME,
    AMM_NAME,
  } = installationConstants;

  // use the board id to get the values, and save them to the
  // wallet.
  const autoswapInstall = await E(board).getValue(AMM_INSTALLATION_BOARD_ID);
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

  const {
    instance,
    creatorFacet,
    publicFacet: treasuryFacet,
  } = await helpers.startInstance(startInstanceConfig);

  console.log('- SUCCESS! contract instance is running on Zoe');

  console.log('Retrieving Board IDs for issuers and brands');
  const invitationIssuerP = E(zoe).getInvitationIssuer();
  const invitationBrandP = E(invitationIssuerP).getBrand();

  const invitationIssuer = await invitationIssuerP;

  const INSTANCE_BOARD_ID = await E(board).getId(instance);
  const ammInstance = await E(creatorFacet).getAMM();
  const ammFacet = await E(zoe).getPublicFacet(ammInstance);
  const AMM_INSTANCE_BOARD_ID = await E(board).getId(ammInstance);

  console.log(`-- Contract Name: ${CONTRACT_NAME}`);
  console.log(`-- INSTANCE_BOARD_ID: ${INSTANCE_BOARD_ID}`);
  console.log(`-- AMM Name: ${AMM_NAME}`);
  console.log(`-- AMM_INSTANCE_BOARD_ID: ${AMM_INSTANCE_BOARD_ID}`);

  const {
    issuers: { Governance: governanceIssuer, Scones: moeIssuer },
  } = await E(zoe).getTerms(instance);

  const walletAdmin = E(wallet).getAdminFacet();
  const issuerManager = E(walletAdmin).getIssuerManager();

  const GOVERNANCE_BRAND_PETNAME = 'governance';
  const MOE_BRAND_PETNAME = 'moe';

  const GOVERNANCE_PURSE_PETNAME = 'Default governance token';

  const [SCONE_ISSUER_BOARD_ID] = await Promise.all([
    E(board).getId(moeIssuer),
    E(issuerManager).add(GOVERNANCE_BRAND_PETNAME, governanceIssuer),
    // E(issuerManager).add(MOE_BRAND_PETNAME, moeIssuer),
  ]);

  await helpers.saveLocalAmountMaths([
    GOVERNANCE_BRAND_PETNAME,
    ETHA_BRAND_PETNAME,
    MOOLA_BRAND_PETNAME,
  ]);

  await E(walletAdmin).makeEmptyPurse(
    GOVERNANCE_BRAND_PETNAME,
    GOVERNANCE_PURSE_PETNAME,
  );

  const addCollateralType = makeAddCollateralType({
    stablecoinMachine: creatorFacet,
    issuerManager,
    helpers,
    GOVERNANCE_BRAND_PETNAME,
    GOVERNANCE_PURSE_PETNAME,
  });

  // Start the pools
  // EthA
  // TODO: decide on keyword and rate

  const ethAVaultManager = await addCollateralType({
    collateralKeyword: 'ETHA',
    rate: 201,
    collateralBrandPetname: ETHA_BRAND_PETNAME,
    collateralValueToGive: 99,
    collateralPursePetname: ETHA_PURSE_PETNAME,
  });

  // moola

  const moolaVaultManager = await addCollateralType({
    collateralKeyword: 'Moola',
    rate: 201,
    collateralBrandPetname: MOOLA_BRAND_PETNAME,
    collateralValueToGive: 99,
    collateralPursePetname: MOOLA_PURSE_PETNAME,
  });

  const installURLHandler = async () => {
    const bundle = await bundleSource(
      helpers.resolvePathForLocalContract('./src/handler.js'),
    );

    // Install it on the spawner
    const handlerInstall = E(spawner).install(bundle);

    // Spawn the installed code to create an URL handler.
    const handler = E(handlerInstall).spawn({
      treasuryFacet,
      ammFacet,
      board,
      http,
      invitationIssuer,
      ethAVaultManager,
      moolaVaultManager,
    });

    // Have our ag-solo wait on ws://localhost:8000/api for
    // websocket connections.
    await E(http).registerURLHandler(handler, '/api');
  };

  await installURLHandler();

  const invitationBrand = await invitationBrandP;
  const INVITE_BRAND_BOARD_ID = await E(board).getId(invitationBrand);

  const API_URL = process.env.API_URL || `http://127.0.0.1:${API_PORT || 8000}`;

  // Re-save the constants somewhere where the UI and api can find it.
  const dappConstants = {
    CONTRACT_NAME,
    INSTANCE_BOARD_ID,
    INSTALLATION_BOARD_ID,
    SCONE_ISSUER_BOARD_ID,
    AMM_NAME,
    AMM_INSTALLATION_BOARD_ID,
    AMM_INSTANCE_BOARD_ID,
    INVITE_BRAND_BOARD_ID,
    // BRIDGE_URL: 'agoric-lookup:https://local.agoric.com?append=/bridge',
    BRIDGE_URL: 'http://127.0.0.1:8000',
    API_URL,
  };
  const defaultsFile = endowments.pathResolve(
    `../ui/src/generated/defaults.js`,
  );
  console.log('writing', defaultsFile);
  const defaultsContents = `\
// GENERATED FROM ${endowments.pathResolve('./deploy.js')}
export default ${JSON.stringify(dappConstants, undefined, 2)};
`;
  await fs.promises.writeFile(defaultsFile, defaultsContents);
}
