import React, { createContext, useContext, useCallback, useReducer, useEffect } from 'react';

import {
  activateWebSocket,
  deactivateWebSocket,
  doFetch,
} from '../utils/fetch-websocket';
import {
  updatePurses,
  serverConnected,
  serverDisconnected,
  deactivateConnection,
  changeAmount,
  resetState,
} from '../store/actions';
import { reducer, createDefaultState } from '../store/reducer';
import dappConstants from '../utils/constants';

export const ApplicationContext = createContext();

export function useApplicationContext() {
  return useContext(ApplicationContext);
}

/* eslint-disable complexity, react/prop-types */
export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, createDefaultState());
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
        dispatch(updatePurses(JSON.parse(data)));
      }
    }

    function walletGetPurses() {
      return doFetch({ type: 'walletGetPurses' }).then(messageHandler);
    }

    activateWebSocket({
      onConnect() {
        dispatch(serverConnected());
        walletGetPurses();
      },
      onDisconnect() {
        dispatch(serverDisconnected());
        dispatch(deactivateConnection());
        dispatch(resetState());
      },
      onMessage(data) {
        messageHandler(JSON.parse(data));
      },
    });
    return deactivateWebSocket;
  }, []);

  const apiMessageHandler = useCallback((message) => {
    if (!message) return;
    const { type, data } = message;
    if (type === 'autoswapGetCurrentPriceResponse') {
      dispatch(changeAmount(data, 1 - freeVariable));
    }
  }, [freeVariable]);

  useEffect(() => {
    if (active) {
      activateWebSocket({
        onConnect() {
          console.log('connected to API');
        },
        onDisconnect() {
          console.log('disconnected from API');
        },
        onMessage(message) {
          apiMessageHandler(JSON.parse(message));
        },
      }, '/api');
    } else {
      deactivateWebSocket('/api');
    }
  }, [active, apiMessageHandler]);

  useEffect(() => {
    if (inputPurse && outputPurse && freeVariable === 0 && inputAmount > 0) {
      doFetch({
        type: 'autoswapGetCurrentPrice',
        data: {
          amountIn: { brand: inputPurse.brandRegKey, extent: inputAmount },
          brandOut: outputPurse.brandRegKey,
        },
      },
      '/api').then(apiMessageHandler);
    }

    if (inputPurse && outputPurse && freeVariable === 1 && outputAmount > 0) {
      doFetch({
        type: 'autoswapGetCurrentPrice',
        data: {
          amountIn: { brand: outputPurse.brandRegKey, extent: outputAmount },
          brandOut: inputPurse.brandRegKey,
        },
      },
      '/api').then(apiMessageHandler);
    }
  }, [inputPurse, outputPurse, inputAmount, outputAmount, apiMessageHandler, freeVariable]);

  return (
    <ApplicationContext.Provider value={{ state, dispatch }}>
      {children}
    </ApplicationContext.Provider>
  );
}
/* eslint-enable complexity, react/prop-types */
