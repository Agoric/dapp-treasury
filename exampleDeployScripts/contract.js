// @ts-check
import fs from 'fs';
import { makeHelpers } from '@agoric/deploy-script-support';
import { E } from '@agoric/eventual-send';

import '@agoric/deploy-script-support/exported';

export default async function deployContract(homePromise, endowments) {
  const { wallet } = E.G(homePromise);

  // This installs the contract code on Zoe and adds the installation
  // to the contract developer's wallet and the board
  const helpers = await makeHelpers(homePromise, endowments);
  const CONTRACT_NAME = 'VaultFactory';

  const DEPLOY_NAME = `${CONTRACT_NAME}Deploy`;
  console.log('Waiting for you to approve', DEPLOY_NAME, 'in your wallet...');
  await E(E(wallet).getScopedBridge(DEPLOY_NAME, 'deploy')).getBoard();
  console.log('Approved!');

  // Install vaultFactory
  const vaultFactoryInstallP = helpers.install(
    helpers.resolvePathForPackagedContract(
      '@agoric/run-protocol/src/vaultFactory/vaultFactory.js',
    ),
    DEPLOY_NAME,
  );

  // Install Autoswap
  // TODO: install autoswap already in bootstrap.js in cosmic-swingset
  const AMM_NAME = 'autoswap';
  const ammInstallP = helpers.install(
    helpers.resolvePathForPackagedContract(
      '@agoric/run-protocol/src/vpool-xyx-amm/multipoolMarketMaker.js',
    ),
    [DEPLOY_NAME, AMM_NAME],
  );

  // Install LiquidateMinimum contract
  // TODO: install this in bootstrap.js in cosmic-swingset
  const LIQ_NAME = 'liquidate';
  const liqInstallP = helpers.install(
    helpers.resolvePathForPackagedContract(
      '@agoric/run-protocol/src/vaultFactory/liquidateMinimum.js',
    ),
    [DEPLOY_NAME, LIQ_NAME],
  );

  const [
    { id: INSTALLATION_BOARD_ID },
    { id: AMM_INSTALLATION_BOARD_ID },
    { id: LIQ_INSTALLATION_BOARD_ID },
  ] = await Promise.all([vaultFactoryInstallP, ammInstallP, liqInstallP]);

  // Save the constants somewhere where the UI and api can find it.
  const dappConstants = {
    CONTRACT_NAME,
    DEPLOY_NAME,
    AMM_NAME,
    LIQ_NAME,
    INSTALLATION_BOARD_ID,
    AMM_INSTALLATION_BOARD_ID,
    LIQ_INSTALLATION_BOARD_ID,
  };
  const defaultsFolder = endowments.pathResolve(`../ui/src/generated`);
  const defaultsFile = endowments.pathResolve(
    `../ui/src/generated/installationConstants.js`,
  );
  console.log('writing', defaultsFile);
  const defaultsContents = `\
// GENERATED FROM ${endowments.pathResolve('./deploy.js')}
export default ${JSON.stringify(dappConstants, undefined, 2)};
`;
  await fs.promises.mkdir(defaultsFolder, { recursive: true });
  await fs.promises.writeFile(defaultsFile, defaultsContents);
}
