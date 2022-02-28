import { E } from '@endo/captp';

import { dappConfig } from '../utils/config';

export const makeLoanOffer = async ({
  fundPurse,
  toLock,
  toBorrow,
  dstPurse,
  walletP,
  treasuryAPI,
  id,
}) => {
  const { INSTALLATION_BOARD_ID, INSTANCE_BOARD_ID } = dappConfig;

  const invitation = E(treasuryAPI).makeLoanInvitation();

  const offerConfig = {
    id,
    invitation,
    installationHandleBoardId: INSTALLATION_BOARD_ID,
    instanceHandleBoardId: INSTANCE_BOARD_ID,
    proposalTemplate: {
      give: {
        Collateral: {
          // The pursePetname identifies which purse we want to use
          pursePetname: fundPurse.pursePetname,
          value: toLock.value,
        },
      },
      want: {
        RUN: {
          pursePetname: dstPurse.pursePetname,
          value: toBorrow.value,
        },
      },
    },
  };

  return E(walletP).addOffer(offerConfig);
};
