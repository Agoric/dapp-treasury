import { E } from '@agoric/eventual-send';
import { dappConfig } from '../../../utils/config';

export const makeAdjustVaultOffer = ({
  vaultToManageId,
  walletP,
  moePurseSelected,
  moeValue,
  collateralPurseSelected,
  collateralValue,
  collateralAction,
  debtAction,
}) => {
  const id = `${Date.now()}`;
  const { INSTALLATION_BOARD_ID, INSTANCE_BOARD_ID } = dappConfig;

  const empty = harden({});
  let want = empty;
  let give = empty;

  if (collateralPurseSelected && collateralValue) {
    const collateral = {
      Collateral: {
        // The pursePetname identifies which purse we want to use
        pursePetname: collateralPurseSelected.pursePetname,
        value: collateralValue,
      },
    };
    if (collateralAction === 'deposit') {
      give = { ...give, ...collateral };
    }

    if (collateralAction === 'withdraw') {
      want = { ...want, ...collateral };
    }
  }

  if (moePurseSelected && moeValue) {
    const scones = {
      Scones: {
        pursePetname: moePurseSelected.pursePetname,
        value: moeValue,
      },
    };

    if (debtAction === 'borrow') {
      want = { ...want, ...scones };
    }

    if (debtAction === 'repay') {
      give = { ...give, ...scones };
    }
  }

  if (want === empty && give === empty) {
    return;
  }

  const offerConfig = {
    id,
    continuingInvitation: {
      priorOfferId: vaultToManageId,
      description: 'adjustBalances',
    },
    installationHandleBoardId: INSTALLATION_BOARD_ID,
    instanceHandleBoardId: INSTANCE_BOARD_ID,
    proposalTemplate: {
      give,
      want,
    },
  };
  console.log('OFFER MADE', offerConfig);
  E(walletP).addOffer(offerConfig);
};
