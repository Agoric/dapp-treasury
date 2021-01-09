// @ts-check
import fs from 'fs';
import { makeHelpers } from '@agoric/deploy-script-support';

import '@agoric/deploy-script-support/exported';

export default async function deployContract(homePromise, endowments) {
  // This installs the contract code on Zoe and adds the installation
  // to the contract developer's wallet and the board
  const helpers = await makeHelpers(homePromise, endowments);
  const resolvedPath = helpers.resolvePathForLocalContract(
    './src/stablecoinMachine',
  );
  const CONTRACT_NAME = 'Treasury';
  const { id: INSTALLATION_BOARD_ID } = await helpers.install(
    resolvedPath,
    CONTRACT_NAME,
  );

  // Install Autoswap
  // TODO: install autoswap already in bootstrap.js in cosmic-swingset
  const { id: AMM_INSTALLATION_BOARD_ID } = await helpers.install(
    helpers.resolvePathForPackagedContract(
      '@agoric/zoe/src/contracts/multipoolAutoswap/multipoolAutoswap',
    ),
    'multipoolAutoswap',
  );
  const AMM_NAME = 'autoswap';

  // Save the constants somewhere where the UI and api can find it.
  const dappConstants = {
    CONTRACT_NAME,
    AMM_NAME,
    INSTALLATION_BOARD_ID,
    AMM_INSTALLATION_BOARD_ID,
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
