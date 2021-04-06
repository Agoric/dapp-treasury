import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio';

import { E } from '@agoric/captp';

import { resetVault, createVault, setVaultCreated } from '../store';

import { dappConfig } from '../utils/config';

export const makeLoanOffer = async (
  dispatch,
  {
    fundPurse,
    toLock,
    toBorrow,
    dstPurse,
    collateralPercent,
    liquidationMargin,
    stabilityFee,
    interestRate,
  },
  walletP,
  treasuryAPI,
) => {
  const id = `${Date.now()}`;

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

  await E(walletP).addOffer(offerConfig);

  const vault = {
    id,
    collateralPercent,
    debt: toBorrow,
    interestRate,
    liquidated: false,
    liquidationMargin,
    locked: toLock,
    stabilityFee,
    status: 'Pending Wallet Acceptance',
    liquidationPenalty: makeRatio(3n, toBorrow.brand),
  };
  dispatch(createVault({ id, vault }));
  dispatch(setVaultCreated(true));
  dispatch(resetVault());
};
