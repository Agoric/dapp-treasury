import { E } from '@endo/captp';
import { dappConfig } from '../utils/config.js';

export const makeSwapOffer = async (
  walletP,
  ammAPI,
  inputPurse,
  inputAmount,
  outputPurse,
  outputAmount,
  isSwapIn,
) => {
  const id = `${Date.now()}`;

  const { AMM_INSTALLATION_BOARD_ID, AMM_INSTANCE_BOARD_ID } = dappConfig;

  const invitation = isSwapIn
    ? E(ammAPI).makeSwapInInvitation()
    : E(ammAPI).makeSwapOutInvitation();

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
