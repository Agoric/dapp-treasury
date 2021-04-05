import { E } from '@agoric/captp';
import { getPublicFacet } from './getPublicFacet';

import { dappConfig } from '../utils/config.js';

export const makeSwapOffer = async (
  walletP,
  dispatch,
  inputPurse,
  inputAmount,
  outputPurse,
  outputAmount,
  isSwapIn,
) => {
  const id = `${Date.now()}`;

  const { AMM_INSTALLATION_BOARD_ID, AMM_INSTANCE_BOARD_ID } = dappConfig;

  const AMMPublicFacet = getPublicFacet(walletP, AMM_INSTANCE_BOARD_ID);
  const invitation = isSwapIn
    ? E(AMMPublicFacet).makeSwapInInvitation()
    : E(AMMPublicFacet).makeSwapOutInvitation();

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
