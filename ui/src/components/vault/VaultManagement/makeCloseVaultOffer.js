import { E } from '@agoric/eventual-send';
import { dappConfig } from '../../../utils/config';

export const makeCloseVaultOffer = ({
  vaultToManageId,
  walletP,
  moePurseSelected,
  moeValue,
  collateralPurseSelected,
  collateralValue,
}) => {
  const id = `${Date.now()}`;
  const { INSTALLATION_BOARD_ID, INSTANCE_BOARD_ID } = dappConfig;

  // give: { RUN: null },
  // want: { Collateral: null },

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
    want = { ...want, ...collateral };
  }

  if (moePurseSelected && moeValue) {
    const scones = {
      RUN: {
        pursePetname: moePurseSelected.pursePetname,
        value: moeValue,
      },
    };
    give = { ...give, ...scones };
  }

  if (want === empty && give === empty) {
    return;
  }

  const offerConfig = {
    id,
    continuingInvitation: {
      priorOfferId: vaultToManageId,
      description: 'pay off entire loan and close Vault',
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
