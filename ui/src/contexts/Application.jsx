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
import dappConstants from '../utils/constants';

const {
  INVITATION_BRAND_BOARD_ID,
  INSTALLATION_BOARD_ID,
  INSTANCE_BOARD_ID,
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

    function walletGetPurses() {
      return doFetch({ type: 'walletGetPurses' }).then(messageHandler);
    }

    function walletGetInvitationDepositId() {
      return doFetch({
        type: 'walletGetDepositFacetId',
        brandBoardId: INVITATION_BRAND_BOARD_ID,
      });
    }

    function walletSuggestInstallation() {
      console.log('Installation', INSTALLATION_BOARD_ID);
      return doFetch({
        type: 'walletSuggestInstallation',
        petname: 'Installation',
        boardId: INSTALLATION_BOARD_ID,
      });
    }

    function walletSuggestInstance() {
      console.log('Instance', INSTANCE_BOARD_ID);
      return doFetch({
        type: 'walletSuggestInstance',
        petname: 'Instance',
        boardId: INSTANCE_BOARD_ID,
      });
    }

    // Receive callbacks from the wallet connection.
    const otherSide = harden({
      needDappApproval(_dappOrigin, _suggestedDappPetname) {},
      dappApproved(_dappOrigin) {},
    });

    let walletAbort;
    let walletDispatch;
    activateWebSocket({
      onConnect() {
        dispatch(setConnected(true));
        const socket = getActiveSocket();
        const {
          abort: ctpAbort,
          dispatch: ctpDispatch,
          getBootstrap,
        } = makeCapTP(
          'autoswap',
          obj => socket.send(JSON.stringify(obj)),
          otherSide,
        );
        walletAbort = ctpAbort;
        walletDispatch = ctpDispatch;

        // TODO: The moral equivalent of walletGetPurses()
        async function watchPurses() {
          const pn = E(getBootstrap()).getPursesNotifier();
          for await (const purses of makeAsyncIterableFromNotifier(pn)) {
            console.log('FIGME: purse ai', purses);
          }
        }
        watchPurses().catch(err =>
          console.error('FIGME: got watchPurses err', err),
        );

        walletGetPurses();
        walletGetInvitationDepositId();
        walletSuggestInstallation();
        walletSuggestInstance();
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
      if (!message) return;
      const { type, data } = message;
      if (type === 'autoswap/getInputPriceResponse') {
        dispatch(changeAmount(data, 1 - freeVariable));
      } else if (type === 'autoswap/sendSwapInvitationResponse') {
        // Once the invitation has been sent to the user, we update the
        // offer to include the invitationHandleBoardId. Then we make a
        // request to the user's wallet to send the proposed offer for
        // acceptance/rejection.
        const { offer } = data;
        doFetch({
          type: 'walletAddOffer',
          data: offer,
        });
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
