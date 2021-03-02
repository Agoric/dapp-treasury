// @ts-check
// Agoric Dapp api deployment script

import fs from 'fs';
import { E } from '@agoric/eventual-send';
import '@agoric/zoe/exported';
import bundleSource from '@agoric/bundle-source';
import { makeHelpers } from '@agoric/deploy-script-support';
import { assert } from '@agoric/assert';

import installationConstants from '../ui/src/generated/installationConstants';
import { makeAddCollateralType } from './addCollateralType';
import { makeLocalAmountMath } from '../../agoric-sdk/node_modules/@agoric/ertp/src';

const API_PORT = process.env.API_PORT || '8000';

export default async function deployApi(homePromise, endowments) {
  const {
    board,
    priceAuthority,
    zoe,
    wallet,
    http,
    spawner,
    scratch,
    priceAuthorityAdmin,
    localTimerService,
  } = E.G(homePromise);
  const helpers = await makeHelpers(homePromise, endowments);

  const {
    INSTALLATION_BOARD_ID,
    AMM_INSTALLATION_BOARD_ID,
    CONTRACT_NAME,
    DEPLOY_NAME,
    AMM_NAME,
  } = installationConstants;

  // use the board id to get the values, and save them to the
  // wallet.
  const autoswapInstall = await E(board).getValue(AMM_INSTALLATION_BOARD_ID);
  const stablecoinMachineInstallation = await E(board).getValue(
    INSTALLATION_BOARD_ID,
  );

  const terms = harden({ autoswapInstall, priceAuthority });

  console.log('Waiting for you to approve', DEPLOY_NAME, 'in your wallet...');
  const walletBridge = E(wallet).getScopedBridge(DEPLOY_NAME, 'deploy');
  await E(walletBridge).getBoard();
  console.log('Approved!');

  const startInstanceConfig = {
    instancePetname: [DEPLOY_NAME],
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
    brands: { Scones: moeBrand },
  } = await E(zoe).getTerms(instance);
  const walletAdmin = E(wallet).getAdminFacet();
  const issuerManager = E(walletAdmin).getIssuerManager();

  const GOVERNANCE_BRAND_PETNAME = [DEPLOY_NAME, 'Governance'];

  const [SCONE_ISSUER_BOARD_ID, SCONE_BRAND_BOARD_ID] = await Promise.all([
    E(board).getId(moeIssuer),
    E(board).getId(moeBrand),
    E(issuerManager).add(GOVERNANCE_BRAND_PETNAME, governanceIssuer),
  ]);
  console.log('-- SCONE_ISSUER_BOARD_ID', SCONE_ISSUER_BOARD_ID);
  console.log('-- SCONE_BRAND_BOARD_ID', SCONE_BRAND_BOARD_ID);

  // Try getting the vault manager params from what Pegasus dropped in our
  // scratch.
  let collateralIssuers = await E(scratch).get('treasuryCollateralIssuers');
  // Format is [{ issuer, amount, payment, symbol }]

  const backupCollateralIssuersConfig = [
    {
      issuerPetname: 'moola',
      amountValue: 1025,
      pursePetname: 'Fun budget',
      symbol: 'Moola',
    },
    {
      issuerPetname: 'simolean',
      amountValue: 1,
      pursePetname: 'Nest egg',
      symbol: 'Simolean',
    },
    {
      issuerPetname: 'Testnet.$USD',
      amountValue: 19000,
      pursePetname: 'Local currency',
      symbol: 'TestnetUSD',
    },
  ];

  const makeBackupCollateralIssuers = async config => {
    const resultPs = config.map(
      async ({ issuerPetname, amountValue, pursePetname, symbol }) => {
        const issuer = await E(issuerManager).get(issuerPetname);
        const purseP = E(walletAdmin).getPurse(pursePetname);
        const amountMath = await makeLocalAmountMath(issuer);
        const amount = amountMath.make(amountValue);
        const payment = await E(purseP).withdraw(amount);
        return {
          issuer,
          amount,
          payment,
          symbol,
        };
      },
    );
    const results = await Promise.all(resultPs);
    return results;
  };

  if (collateralIssuers === undefined) {
    collateralIssuers = await makeBackupCollateralIssuers(
      backupCollateralIssuersConfig,
    );
  }

  const additionalConfig = [
    {
      initialPrice: 125n,
      initialMargin: 150n,
      liquidationMargin: 125n,
      interestRateBPs: 250n,
      loanFeeBPs: 50n,
    },
    {
      initialPrice: 150n,
      initialMargin: 150n,
      liquidationMargin: 120n,
      interestRateBPs: 200n,
      loanFeeBPs: 150n,
    },
    {
      initialPrice: 110n,
      initialMargin: 120n,
      liquidationMargin: 105n,
      interestRateBPs: 100n,
      loanFeeBPs: 225n,
    },
  ];

  const trades = [
    {
      fakeTradesGivenCentral: [[1052600, 1000000]],
      fakeTradesGivenOther: [[1000000, 1052600]],
    },
    {
      fakeTradesGivenCentral: [[33732220, 1000000]],
      fakeTradesGivenOther: [[1000000, 33732220]],
    },
    {
      fakeTradesGivenCentral: [[1000, 1000]],
      fakeTradesGivenOther: [[1000, 1000]],
    },
  ];

  const treasuryVaultManagerParams = await Promise.all(
    additionalConfig.map(async (rates, i) => {
      const issuerBoardId = await E(board).getId(collateralIssuers[i].issuer);
      return {
        keyword: collateralIssuers[i].symbol,
        rates,
        issuer: collateralIssuers[i].issuer,
        issuerBoardId,
        amount: collateralIssuers[i].amount,
        payment: collateralIssuers[i].payment,
      };
    }),
  );

  // Formerly, "add keyword/symbol as the petname in the wallet".
  // Now, suggest the issuer, just to get the petname[1]
  // to match the symbols, and to have a purse.
  //
  // We can certainly add the issuers to the deployer.
  //
  // Relying on this for users of the Treasury UI is a hack.
  // We should not in any way depend on the petnames being semantic.
  // We should drive the user experience by suggesting issuerBoardId's
  // during the UI flow that the wallet bridge can look up in the board
  // and add to the user.
  await Promise.all(
    treasuryVaultManagerParams.map(({ keyword, issuerBoardId }) =>
      // E(issuerManager).add([DEPLOY_NAME, vmp.keyword], vmp.issuer),
      E(walletBridge).suggestIssuer(keyword, issuerBoardId),
    ),
  );

  const governanceAmountMath = await makeLocalAmountMath(governanceIssuer);
  const emptyGovernanceAmount = governanceAmountMath.getEmpty();

  const addCollateralType = makeAddCollateralType({
    stablecoinMachine: creatorFacet,
    zoe,
    emptyGovernanceAmount,
  });

  // Start the pools
  const vaultManagers = await Promise.all(
    treasuryVaultManagerParams.map(vmp => addCollateralType(vmp)),
  );
  // TODO: do something with the vaultManagers
  assert(vaultManagers);

  const installURLHandler = async () => {
    const handlerBundle = await bundleSource(
      helpers.resolvePathForLocalContract('./src/handler.js'),
    );

    // Install it on the spawner
    const handlerInstall = E(spawner).install(handlerBundle);

    // Spawn the installed code to create an URL handler.
    const handler = E(handlerInstall).spawn({
      treasuryFacet,
      ammFacet,
      board,
      http,
      invitationIssuer,
    });

    // Have our ag-solo wait on ws://localhost:8000/api for
    // websocket connections.
    await E(http).registerURLHandler(handler, '/api');
  };

  const issuerToTrades = trades.map((tradeSpecs, i) => {
    return {
      issuer: collateralIssuers[i].issuer,
      ...tradeSpecs,
    };
  });

  const FORCE_REGISTER = true;
  const registerPriceAuthority = async ({ pa, brandIn, brandOut }) => {
    const authority = await pa;
    return E(priceAuthorityAdmin).registerPriceAuthority(
      authority,
      brandIn,
      brandOut,
      FORCE_REGISTER,
    );
  };

  const priceAuthoritiesHandler = async () => {
    const priceAuthoritiesBundle = await bundleSource(
      helpers.resolvePathForLocalContract('./src/priceAuthorities.js'),
    );

    // Install it on the spawner
    const priceAuthoritiesInstall = E(spawner).install(priceAuthoritiesBundle);

    // Spawn the installed code to create priceAuthorities on the ag-solo
    const priceAuthorities = await E(priceAuthoritiesInstall).spawn(
      harden({
        sconesIssuer: moeIssuer,
        issuerToTrades,
        timer: localTimerService,
      }),
    );

    await Promise.all(priceAuthorities.map(registerPriceAuthority));
  };

  await installURLHandler();
  await priceAuthoritiesHandler();

  // Add MoeIssuer to scratch for dappCardStore
  await E(scratch).set('moeIssuer', moeIssuer);

  const invitationBrand = await invitationBrandP;
  const INVITE_BRAND_BOARD_ID = await E(board).getId(invitationBrand);

  const API_URL = process.env.API_URL || `http://127.0.0.1:${API_PORT || 8000}`;

  // Re-save the constants somewhere where the UI and api can find it.
  const dappConstants = {
    CONTRACT_NAME,
    INSTANCE_BOARD_ID,
    INSTALLATION_BOARD_ID,
    SCONE_ISSUER_BOARD_ID,
    SCONE_BRAND_BOARD_ID,
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
