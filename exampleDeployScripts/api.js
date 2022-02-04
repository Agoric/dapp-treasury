/* global process */
// @ts-check
/// <reference types="ses"/>
// Agoric Dapp api deployment script

import fs from 'fs';
import { E } from '@endo/eventual-send';
import '@agoric/zoe/exported';
import { makeHelpers } from '@agoric/deploy-script-support';

import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio';
import { amountMath } from '@agoric/ertp';
import installationConstants from '../ui/src/generated/installationConstants';
import { makeAddCollateralType } from './addCollateralType';

const API_PORT = process.env.API_PORT || '8000';

const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

export default async function deployApi(homePromise, endowments) {
  const {
    board,
    priceAuthority,
    zoe,
    wallet,
    scratch,
    priceAuthorityAdmin,
    localTimerService,
  } = E.get(homePromise);
  const helpers = await makeHelpers(homePromise, endowments);
  const timer = await localTimerService;

  const {
    INSTALLATION_BOARD_ID,
    AMM_INSTALLATION_BOARD_ID,
    LIQ_INSTALLATION_BOARD_ID,
    CONTRACT_NAME,
    DEPLOY_NAME,
    AMM_NAME,
  } = installationConstants;

  console.log('Waiting for you to approve', DEPLOY_NAME, 'in your wallet...');
  const walletBridge = E(wallet).getScopedBridge(DEPLOY_NAME, 'deploy');
  const approvalP = E(walletBridge).getBoard();

  // the walletBridge access was approved
  console.log('Approved!');

  console.log('Retrieving Board IDs for issuers and brands');
  const invitationIssuerP = E(zoe).getInvitationIssuer();
  const invitationBrandP = E(invitationIssuerP).getBrand();

  const INSTANCE_BOARD_ID = await E(board).getId(instance);
  const ammInstance = await E(creatorFacet).getAMM();
  const AMM_INSTANCE_BOARD_ID = await E(board).getId(ammInstance);

  console.log(`-- Contract Name: ${CONTRACT_NAME}`);
  console.log(`-- INSTANCE_BOARD_ID: ${INSTANCE_BOARD_ID}`);
  console.log(`-- AMM Name: ${AMM_NAME}`);
  console.log(`-- AMM_INSTANCE_BOARD_ID: ${AMM_INSTANCE_BOARD_ID}`);

  const {
    issuers: { Governance: governanceIssuer, RUN: runIssuer },
    brands: { Governance: governanceBrand, RUN: runBrand },
  } = await E(zoe).getTerms(instance);
  const walletAdmin = E(wallet).getAdminFacet();
  const issuerManager = E(walletAdmin).getIssuerManager();

  const GOVERNANCE_BRAND_PETNAME = [DEPLOY_NAME, 'Governance'];

  const [RUN_ISSUER_BOARD_ID, RUN_BRAND_BOARD_ID] = await Promise.all([
    E(board).getId(runIssuer),
    E(board).getId(runBrand),
    E(issuerManager).add(GOVERNANCE_BRAND_PETNAME, governanceIssuer),
  ]);
  console.log('-- RUN_ISSUER_BOARD_ID', RUN_ISSUER_BOARD_ID);
  console.log('-- RUN_BRAND_BOARD_ID', RUN_BRAND_BOARD_ID);

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
      issuerPetname: '$LINK',
      amountValue: 19000,
      pursePetname: 'Oracle fee',
      symbol: 'LINK',
    },
  ];

  const makeBackupCollateralIssuers = async config => {
    const resultPs = config.map(
      async ({ issuerPetname, amountValue, pursePetname, symbol }) => {
        const issuer = await E(issuerManager).get(issuerPetname);
        const brand = await E(issuer).getBrand();
        const purseP = E(walletAdmin).getPurse(pursePetname);
        const amount = amountMath.make(amountValue, brand);
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
  const BASIS_POINTS = 10000n;
  const PERCENT = 100n;

  const additionalConfig = [
    {
      initialPrice: 125n,
      initialMargin: 150n,
      liquidationMargin: 125n,
      interestRate: 250n,
      loanFee: 50n,
    },
    {
      initialPrice: 150n,
      initialMargin: 150n,
      liquidationMargin: 120n,
      interestRate: 200n,
      loanFee: 150n,
    },
    {
      initialPrice: 110n,
      initialMargin: 120n,
      liquidationMargin: 105n,
      interestRate: 100n,
      loanFee: 225n,
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
    additionalConfig.map(async (rateValues, i) => {
      const rates = {
        initialPrice: makeRatio(
          rateValues.initialPrice,
          runBrand,
          PERCENT,
          collateralIssuers[i].amount.brand,
        ),
        initialMargin: makeRatio(150n, runBrand),
        liquidationMargin: makeRatio(125n, runBrand),
        interestRate: makeRatio(250n, runBrand, BASIS_POINTS),
        loanFee: makeRatio(50n, runBrand, BASIS_POINTS),
      };
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

  const emptyGovernanceAmount = amountMath.makeEmpty(governanceBrand);

  const addCollateralType = makeAddCollateralType({
    stablecoinMachine: creatorFacet,
    zoe,
    emptyGovernanceAmount,
    amm
  });

  // Start the pools
  const vaultManagers = await Promise.all(
    treasuryVaultManagerParams.map(vmp => addCollateralType(vmp)),
  );
  // TODO: do something with the vaultManagers
  assert(vaultManagers);

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
    const priceAuthoritiesPath = endowments.pathResolve(
      './src/priceAuthorities.js',
    );
    const PA_NAME = 'PriceAuthorities';
    const { installation } = await helpers.install(
      priceAuthoritiesPath,
      PA_NAME,
    );
    const paInstanceConfig = {
      instancePetname: PA_NAME,
      installation,
      terms: {
        runBrand,
        issuerToTrades,
        timer,
      },
      issuerKeywordRecord: {},
    };
    // Install the priceAuthorities as a Zoe contract on the ag-solo
    const { creatorFacet: pa } = await helpers.startInstance(paInstanceConfig);
    const priceAuthorities = await E(pa).getPriceAuthorities();
    await Promise.all(priceAuthorities.map(registerPriceAuthority));
  };

  await priceAuthoritiesHandler();

  // Add runIssuer to scratch for dappCardStore
  await E(scratch).set('runIssuer', runIssuer);

  const invitationBrand = await invitationBrandP;
  const INVITE_BRAND_BOARD_ID = await E(board).getId(invitationBrand);

  const API_URL = process.env.API_URL || `http://127.0.0.1:${API_PORT || 8000}`;

  // Re-save the constants somewhere where the UI and api can find it.
  const dappConstants = {
    CONTRACT_NAME,
    INSTANCE_BOARD_ID,
    INSTALLATION_BOARD_ID,
    RUN_ISSUER_BOARD_ID,
    RUN_BRAND_BOARD_ID,
    AMM_NAME,
    AMM_INSTALLATION_BOARD_ID,
    LIQ_INSTALLATION_BOARD_ID,
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
