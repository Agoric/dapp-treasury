import React, {
  createContext,
  useContext,
  useCallback,
  useReducer,
  useEffect,
} from 'react';

import { makeCapTP, E } from '@agoric/captp';
import { makeAsyncIterableFromNotifier } from '@agoric/notifier';

import {
  activateWebSocket,
  deactivateWebSocket,
  getActiveSocket,
  doFetch,
} from '../utils/fetch-websocket';
import {
  reducer,
  defaultState,
  setPurses,
  updateInvitationDepositId,
  setConnected,
  setActive,
  changeAmount,
  resetState,
} from '../store';
import dappConstants from '../generated/defaults.js';

const {
  INVITATION_BRAND_BOARD_ID,
  INSTALLATION_BOARD_ID,
  INSTANCE_BOARD_ID,
  AMM_NAME,
  AMM_INSTALLATION_BOARD_ID,
  AMM_INSTANCE_BOARD_ID,
} = dappConstants;

export const ApplicationContext = createContext();

export function useApplicationContext() {
  return useContext(ApplicationContext);
}

/* eslint-disable complexity, react/prop-types */
export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, defaultState);
  const {
    active,
    inputPurse,
    outputPurse,
    inputAmount,
    outputAmount,
    freeVariable,
  } = state;

  useEffect(() => {
    function messageHandler(message) {
      if (!message) return;
      const { type, data } = message;
      if (type === 'walletUpdatePurses') {
        dispatch(setPurses(JSON.parse(data)));
      } else if (type === 'walletDepositFacetIdResponse') {
        dispatch(updateInvitationDepositId(data));
      }
    }

    // Receive callbacks from the wallet connection.
    const otherSide = harden({
      needDappApproval(_dappOrigin, _suggestedDappPetname) {},
      dappApproved(_dappOrigin) {},
    });

    let walletAbort;
    let walletDispatch;
    activateWebSocket({
      async onConnect() {
        dispatch(setConnected(true));
        const socket = getActiveSocket();
        const {
          abort: ctpAbort,
          dispatch: ctpDispatch,
          getBootstrap,
        } = makeCapTP(
          'Treasury',
          obj => socket.send(JSON.stringify(obj)),
          otherSide,
        );
        walletAbort = ctpAbort;
        walletDispatch = ctpDispatch;
        const walletP = getBootstrap();

        // TODO: The moral equivalent of walletGetPurses()
        async function watchPurses() {
          const pn = E(walletP).getPursesNotifier();
          for await (const purses of makeAsyncIterableFromNotifier(pn)) {
            dispatch(setPurses(purses));
          }
        }
        watchPurses().catch(err =>
          console.error('FIGME: got watchPurses err', err),
        );
        await Promise.all([
          E(walletP).getDepositFacetId(INVITATION_BRAND_BOARD_ID),
          E(walletP).suggestInstallation('Installation', INSTALLATION_BOARD_ID),
          E(walletP).suggestInstance('Instance', INSTANCE_BOARD_ID),
          E(walletP).suggestInstallation(
            `${AMM_NAME}Installation`,
            AMM_INSTALLATION_BOARD_ID,
          ),
          E(walletP).suggestInstance(
            `${AMM_NAME}Instance`,
            AMM_INSTANCE_BOARD_ID,
          ),
        ]);
      },
      onDisconnect() {
        dispatch(setConnected(false));
        dispatch(setActive(false));
        walletAbort && walletAbort();
        dispatch(resetState());
      },
      onMessage(data) {
        const obj = JSON.parse(data);
        (walletDispatch && walletDispatch(obj)) || messageHandler(obj);
      },
    });
    return deactivateWebSocket;
  }, []);

  const apiMessageHandler = useCallback(
    message => {
      if (!message) {
        return;
      }
      const { type, data } = message;
      switch (type) {
        case 'autoswap/getInputPriceResponse': {
          dispatch(changeAmount(data, 1 - freeVariable));
          return;
        }
        case 'autoswap/sendSwapInvitationResponse': {
          // Once the invitation has been sent to the user, we update the
          // offer to include the invitationHandleBoardId. Then we make a
          // request to the user's wallet to send the proposed offer for
          // acceptance/rejection.
          const { offer } = data;
          doFetch({
            type: 'walletAddOffer',
            data: offer,
          });
          return;
        }
        default: {
          console.log('Unexpected response', message);
        }
      }
    },
    [freeVariable],
  );

  useEffect(() => {
    if (active) {
      activateWebSocket(
        {
          onConnect() {
            console.log('connected to API');
          },
          onDisconnect() {
            console.log('disconnected from API');
          },
          onMessage(message) {
            apiMessageHandler(JSON.parse(message));
          },
        },
        '/api',
      );
    } else {
      deactivateWebSocket('/api');
    }
  }, [active, apiMessageHandler]);

  useEffect(() => {
    if (inputPurse && outputPurse && freeVariable === 0 && inputAmount > 0) {
      doFetch(
        {
          type: 'autoswap/getInputPrice',
          data: {
            amountIn: { brand: inputPurse.brandBoardId, value: inputAmount },
            brandOut: outputPurse.brandBoardId,
          },
        },
        '/api',
      ).then(apiMessageHandler);
    }

    if (inputPurse && outputPurse && freeVariable === 1 && outputAmount > 0) {
      doFetch(
        {
          type: 'autoswap/getInputPrice',
          data: {
            amountIn: { brand: outputPurse.brandBoardId, value: outputAmount },
            brandOut: inputPurse.brandBoardId,
          },
        },
        '/api',
      ).then(apiMessageHandler);
    }
  }, [
    inputPurse,
    outputPurse,
    inputAmount,
    outputAmount,
    apiMessageHandler,
    freeVariable,
  ]);

  return (
    <ApplicationContext.Provider value={{ state, dispatch }}>
      {children}
    </ApplicationContext.Provider>
  );
}
/* eslint-enable complexity, react/prop-types */
