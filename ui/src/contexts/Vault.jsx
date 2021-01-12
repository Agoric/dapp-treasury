import { doFetch } from '../utils/fetch-websocket';

export const createVault = state => {
  const {
    invitationDepositId,
    vaultParams: { fundPurse, toLock, toBorrow, dstPurse },
  } = state;

  const offer = {
    id: `${Date.now()}`,

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

  // TODO: dispatch(resetVault) instead?
  return {
    ...state,
    collateralBrand: null,
    vaultParams: {
      fundPurse: null,
      dstPurse: null,
      toBorrow: 0,
      collateralPercent: 150,
      toLock: 0,
    },
  };
};

export const updateVault = ({ vaults, ...state }, { id, vault }) => {
  console.log('-------VAULT', id, vault);
  return { ...state, vaults: { ...vaults, [id]: vault } };
};
