import { doFetch } from '../utils/fetch-websocket';

import dappConstants from '../generated/defaults.js';

const { INSTALLATION_BOARD_ID, INSTANCE_BOARD_ID } = dappConstants;

// createOffer(
//   INSTANCE_BOARD_ID,
//   INSTALLATION_BOARD_ID,
//   invitationDepositId,
//   inputAmount,
//   outputAmount,
//   inputPurse,
//   outputPurse,
// ),
export const createVault = state => {
  // const { dispatch, invitationDepositId, collateralBrand, workingVaultParams } = state;
  const { invitationDepositId } = state;
  // const { dstPurseIndex = 0, fundPurseIndex = 0 } = workingVaultParams;
  // let { toBorrow, collateralPercent, toLock } = workingVaultParams;

  const offer = {
    // JSONable ID for this offer.  Eventually this will be scoped to
    // the current site.
    id: `${Date.now()}`,

    // TODO: get this from the invitation instead in the wallet. We
    // don't want to trust the dapp on this.
    installationHandleBoardId: INSTALLATION_BOARD_ID,
    instanceHandleBoardId: INSTANCE_BOARD_ID,

    proposalTemplate: {
      give: {
        Collateral: {
          // The pursePetname identifies which purse we want to use
          pursePetname: 'Fun budget', // TODO inputPurse.pursePetname,
          value: 100,
        },
      },
      want: {
        Scones: {
          pursePetname: ['Treasury', 'MoE'], // TODO outputPurse.pursePetname,
          value: 20,
        },
      },
      exit: { onDemand: null },
    },
  };

  console.error('-------DEPOSIT ID', invitationDepositId, state);

  // Create an invitation for the offer and on response (in
  // `contexts/Application.jsx`),
  // send the proposed offer to the wallet.
  doFetch(
    {
      type: 'treasury/makeLoanInvitation',
      data: {
        invitationDepositId,
        offer,
      },
    },
    '/api',
  );

  return {
    ...state,
    vaultParams: null,
    workingVaultParams: {},
  };
};

export const updateVault = ({ vaults, ...state }, { id, vault }) => {
  console.log('-------VAULT', id, vault);
  return { ...state, vaults: { ...vaults, [id]: vault } };
};
