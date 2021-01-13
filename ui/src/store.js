// The code in this file requires an understanding of Autodux.
// See: https://github.com/ericelliott/autodux
import autodux from 'autodux';
import { doFetch } from './utils/fetch-websocket';

export const {
  reducer,
  initial: defaultState,
  actions: {
    setActive,
    setConnected,
    setPurses,
    setCollaterals,
    setInvitationDepositId,
    setInputPurse,
    setOutputPurse,
    setInputAmount,
    setOutputAmount,
    setInputChanged,
    setOutputChanged,
    swapInputs,
    createOffer,
    resetState,
    setVaultCollateral,
    setVaultParams,
    setVaultConfigured,
    setVaultCreated,
    createVault,
    updateVault,
    resetVault,
  },
} = autodux({
  slice: 'treasury',
  initial: {
    active: false,
    connected: false,
    account: null,
    purses: null,
    invitationDepositId: null,
    // Autoswap state
    inputPurse: null,
    outputPurse: null,
    inputAmount: null,
    outputAmount: null,
    inputChanged: false,
    outputChanged: false,
    // Vault state
    vaultCollateral: null,
    vaultParams: {
      fundPurse: null,
      dstPurse: null,
      toBorrow: 0,
      collateralPercent: 150,
      toLock: 0,
    },
    vaultConfigured: false,
    vaultCreated: false,
    vaults: {},
    collaterals: null,
  },
  actions: {
    createVault: (state, { id, vault }) => {
      return {
        ...state,
        vaults: {
          ...state.vaults,
          [id]: vault,
        },
      };
    },
    updateVault: ({ vaults, ...state }, { id, vault }) => {
      const oldVaultData = vaults[id];
      const status = vault.liquidated ? 'Liquidated' : 'Loan Initiated';
      return {
        ...state,
        vaults: { ...vaults, [id]: { ...oldVaultData, ...vault, status } },
      };
    },
    resetVault: state => ({
      ...state,
      vaultCollateral: null,
      vaultParams: {
        fundPurse: null,
        dstPurse: null,
        toBorrow: 0,
        collateralPercent: 150,
        toLock: 0,
      },
    }),
    swapInputs(state) {
      const { inputPurse, outputPurse, inputAmount, outputAmount } = state;
      return {
        ...state,
        inputPurse: outputPurse,
        outputPurse: inputPurse,
        inputAmount: outputAmount,
        outputAmount: inputAmount,
      };
    },
    createOffer: {
      // Map positional arguments.
      create: (
        instanceHandleBoardId,
        installationHandleBoardId,
        invitationDepositId,
        inputAmount,
        outputAmount,
        inputPurse,
        outputPurse,
      ) => ({
        instanceHandleBoardId,
        installationHandleBoardId,
        invitationDepositId,
        inputAmount,
        outputAmount,
        inputPurse,
        outputPurse,
      }),
      reducer(
        state,
        {
          instanceHandleBoardId,
          installationHandleBoardId,
          invitationDepositId,
          inputAmount,
          outputAmount,
          inputPurse,
          outputPurse,
        },
      ) {
        const offer = {
          // JSONable ID for this offer.  Eventually this will be scoped to
          // the current site.
          id: `${Date.now()}`,

          // TODO: get this from the invitation instead in the wallet. We
          // don't want to trust the dapp on this.
          instanceHandleBoardId,
          installationHandleBoardId,

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
            exit: { onDemand: null },
          },
        };

        // Create an invitation for the offer and on response (in
        // `contexts/Application.jsx`),
        // send the proposed offer to the wallet.
        doFetch(
          {
            type: 'autoswap/sendSwapInvitation',
            data: {
              invitationDepositId,
              offer,
            },
          },
          '/api',
        );

        return {
          ...state,
          inputPurse: null,
          outputPurse: null,
          inputAmount: null,
          outputAmount: null,
        };
      },
    },
    resetState: state => ({
      ...state,
      purses: null,
      collaterals: null,
      inputPurse: null,
      outputPurse: null,
      inputAmount: null,
      outputAmount: null,
    }),
  },
});
