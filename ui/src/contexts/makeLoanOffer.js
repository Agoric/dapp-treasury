import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio';

import { E } from '@agoric/captp';
import { getPublicFacet } from './getPublicFacet';

import { resetVault, createVault, setVaultCreated } from '../store';

import dappConstants from '../generated/defaults.js';

const { INSTALLATION_BOARD_ID, INSTANCE_BOARD_ID } = dappConstants;

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
  },
  walletP,
) => {
  const id = `${Date.now()}`;

  const loanPublicFacet = getPublicFacet(walletP, INSTANCE_BOARD_ID);
  const invitation = E(loanPublicFacet).makeLoanInvitation();

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
        Scones: {
          pursePetname: dstPurse.pursePetname,
          value: toBorrow.value,
        },
      },
    },
  };

  await E(walletP).addOffer(offerConfig);

  const vault = {
    id,
    collateralizationRatio: collateralPercent,
    debt: toBorrow,
    interestRate: 0,
    lockedBrandPetname: fundPurse.brandPetname,
    debtBrandPetname: dstPurse.brandPetname,
    lockedDisplayInfo: fundPurse.displayInfo,
    debtDisplayInfo: dstPurse.displayInfo,
    liquidated: false,
    liquidationRatio: liquidationMargin,
    locked: toLock,
    stabilityFee,
    status: 'Pending Wallet Acceptance',
    liquidationPenalty: makeRatio(3n, toBorrow.brand),
  };
  dispatch(createVault({ id, vault }));
  dispatch(setVaultCreated(true));
  dispatch(resetVault());
};
