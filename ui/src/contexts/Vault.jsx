import { doFetch } from '../utils/fetch-websocket';

export const createVault = state => {
  const { invitationDepositId, vaultParams } = state;

  const offer = {
    id: `${Date.now()}`,

    proposalTemplate: {
      give: {
        Collateral: {
          // The pursePetname identifies which purse we want to use
          pursePetname: vaultParams.fundPurse.pursePetname,
          value: vaultParams.toLock,
        },
      },
      want: {
        Scones: {
          pursePetname: vaultParams.dstPurse.pursePetname,
          value: vaultParams.toBorrow,
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
    vaultParams: null,
  };
};

export const updateVault = ({ vaults, ...state }, { id, vault }) => {
  console.log('-------VAULT', id, vault);
  return { ...state, vaults: { ...vaults, [id]: vault } };
};
