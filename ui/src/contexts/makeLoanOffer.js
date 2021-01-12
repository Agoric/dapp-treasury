import { doFetch } from '../utils/fetch-websocket';

import { resetVault, createVault, setVaultCreated } from '../store';

import dappConstants from '../generated/defaults.js';

const { INSTALLATION_BOARD_ID, INSTANCE_BOARD_ID } = dappConstants;

export const makeLoanOffer = (
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
  invitationDepositId,
) => {
  const id = `${Date.now()}`;

  const offer = {
    id,
    installationHandleBoardId: INSTALLATION_BOARD_ID,
    instanceHandleBoardId: INSTANCE_BOARD_ID,
    proposalTemplate: {
      give: {
        Collateral: {
          // The pursePetname identifies which purse we want to use
          pursePetname: fundPurse.pursePetname,
          value: parseInt(toLock, 10),
        },
      },
      want: {
        Scones: {
          pursePetname: dstPurse.pursePetname,
          value: parseInt(toBorrow, 10),
        },
      },
      exit: { onDemand: null },
    },
  };

  console.error('-------DEPOSIT ID', invitationDepositId);

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
    liquidationPenalty: 3,
  };
  dispatch(createVault({ id, vault }));
  dispatch(setVaultCreated(true));
  dispatch(resetVault());
};
