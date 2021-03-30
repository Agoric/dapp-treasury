import { E } from '@agoric/captp';
import { getPublicFacet } from './getPublicFacet';

import dappConstants from '../generated/defaults.js';

const { AMM_INSTALLATION_BOARD_ID, AMM_INSTANCE_BOARD_ID } = dappConstants;

export const makeSwapOffer = async (
  walletP,
  dispatch,
  inputPurse,
  inputAmount,
  outputPurse,
  outputAmount,
) => {
  const id = `${Date.now()}`;

  const AMMPublicFacet = getPublicFacet(walletP, AMM_INSTANCE_BOARD_ID);
  const invitation = E(AMMPublicFacet).makeSwapInvitation();

  const offerConfig = {
    id,
    invitation,
    installationHandleBoardId: AMM_INSTALLATION_BOARD_ID,
    instanceHandleBoardId: AMM_INSTANCE_BOARD_ID,
    proposalTemplate: {
      give: {
        In: {
          // The pursePetname identifies which purse we want to use
          pursePetname: inputPurse.pursePetname,
          value: inputAmount,
        },
      },
      want: {
        Out: {
          pursePetname: outputPurse.pursePetname,
          value: outputAmount,
        },
      },
    },
  };

  await E(walletP).addOffer(offerConfig);
};
