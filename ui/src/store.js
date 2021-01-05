// The code in this file requires an understanding of Autodux.
// See: https://github.com/ericelliott/autodux
import autodux from 'autodux';
import { doFetch } from './utils/fetch-websocket';

export const {
  reducer,
  initial: defaultState,
  actions: {
    activateConnection,
    deactivateConnection,
    serverConnected,
    serverDisconnected,
    updatePurses,
    changePurse,
    swapInputs,
    changeAmount,
    createOffer,
    resetState,
    updateInvitationDepositId,
  },
} = autodux({
  slice: 'autoswap',
  initial: {
    active: false,
    connected: false,
    account: null,
    purses: null,
    inputPurse: null,
    outputPurse: null,
    inputAmount: null,
    outputAmount: null,
    freeVariable: null,
    invitationDepositId: null,
  },
  actions: {
    activateConnection: state => ({ ...state, active: true }),
    deactivateConnection: state => ({ ...state, active: false }),
    serverConnected: state => ({ ...state, connected: true }),
    serverDisconnected: state => ({ ...state, connected: false }),
    updatePurses: (state, purses) => ({ ...state, purses }),
    changePurse: {
      // Map positional arguments.
      create: (purse, fieldNumber, freeVariable = null) => ({
        purse,
        fieldNumber,
        freeVariable,
      }),
      reducer: (state, { purse, fieldNumber, freeVariable }) => {
        let { inputPurse, outputPurse } = state;
        if (fieldNumber === 0) {
          inputPurse = purse;
          if (inputPurse === outputPurse) {
            outputPurse = null;
          }
        }
        if (fieldNumber === 1) {
          outputPurse = purse;
          if (outputPurse === inputPurse) {
            inputPurse = null;
          }
        }
        return { ...state, inputPurse, outputPurse, freeVariable };
      },
    },
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
    changeAmount: {
      // Map positional arguments.
      create: (amount, fieldNumber, freeVariable = null) => ({
        amount,
        fieldNumber,
        freeVariable,
      }),
      reducer(state, { amount, fieldNumber, freeVariable }) {
        let { inputAmount, outputAmount } = state;
        if (fieldNumber === 0) {
          inputAmount = amount;
        }
        if (fieldNumber === 1) {
          outputAmount = amount;
        }
        return { ...state, inputAmount, outputAmount, freeVariable };
      },
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
          id: Date.now(),

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
              depositFacetId: invitationDepositId,
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
    updateInvitationDepositId: (state, invitationDepositId) => ({
      ...state,
      invitationDepositId,
    }),
    resetState: state => ({
      ...state,
      purses: null,
      inputPurse: null,
      outputPurse: null,
      inputAmount: null,
      outputAmount: null,
    }),
  },
});
