import React, { createContext, useContext, useReducer, useEffect } from 'react';

import { makeCapTP, E } from '@agoric/captp';
import { makeAsyncIterableFromNotifier as iterateNotifier } from '@agoric/notifier';

import {
  activateWebSocket,
  deactivateWebSocket,
  getActiveSocket,
} from '../utils/fetch-websocket';

import { dappConfig, refreshConfigFromWallet } from '../utils/config';

import {
  reducer,
  defaultState,
  setPurses,
  setConnected,
  resetState,
  updateVault,
  setCollaterals,
  setTreasury,
  setApproved,
} from '../store';
import { getPublicFacet } from './getPublicFacet';
import { updateBrandPetnames, initializeBrandToInfo } from './storeBrandInfo';

// eslint-disable-next-line import/no-mutable-exports
let walletP;
export { walletP };
let ammPublicFacet;

export const ApplicationContext = createContext();

export function useApplicationContext() {
  return useContext(ApplicationContext);
}

function watchVault(id, dispatch) {
  console.log('vaultWatched', id);
  async function vaultUpdater() {
    const uiNotifier = E(walletP).getUINotifier(id);
    for await (const value of iterateNotifier(uiNotifier)) {
      console.log('======== VAULT', id, value);
      dispatch(updateVault({ id, vault: value }));
    }
  }

  vaultUpdater().catch(err =>
    console.error('Vault watcher exception', id, err),
  );
}

function watchOffers(dispatch, INSTANCE_BOARD_ID) {
  const watchedVaults = new Set();
  async function offersUpdater() {
    const offerNotifier = E(walletP).getOffersNotifier();
    for await (const offers of iterateNotifier(offerNotifier)) {
      for (const { id, instanceHandleBoardId } of offers) {
        if (
          instanceHandleBoardId === INSTANCE_BOARD_ID &&
          !watchedVaults.has(id)
        ) {
          watchedVaults.add(id);
          watchVault(id, dispatch);
        }
      }
      console.log('======== OFFERS', offers);
    }
  }
  offersUpdater().catch(err => console.error('Offers watcher exception', err));
}

/* eslint-disable complexity, react/prop-types */
export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, defaultState);
  const { brandToInfo } = state;

  useEffect(() => {
    // Receive callbacks from the wallet connection.
    const otherSide = harden({
      needDappApproval(_dappOrigin, _suggestedDappPetname) {
        dispatch(setApproved(false));
      },
      dappApproved(_dappOrigin) {
        dispatch(setApproved(true));
      },
    });

    let walletAbort;
    let walletDispatch;
    activateWebSocket({
      async onConnect() {
        const { CONTRACT_NAME, AMM_NAME } = dappConfig;

        dispatch(setConnected(true));
        const socket = getActiveSocket();
        const {
          abort: ctpAbort,
          dispatch: ctpDispatch,
          getBootstrap,
        } = makeCapTP(
          CONTRACT_NAME,
          obj => socket.send(JSON.stringify(obj)),
          otherSide,
        );
        walletAbort = ctpAbort;
        walletDispatch = ctpDispatch;
        walletP = getBootstrap();

        await refreshConfigFromWallet(walletP);
        const {
          INSTALLATION_BOARD_ID,
          INSTANCE_BOARD_ID,
          SCONE_ISSUER_BOARD_ID,
          AMM_INSTALLATION_BOARD_ID,
          AMM_INSTANCE_BOARD_ID,
        } = dappConfig;

        ammPublicFacet = getPublicFacet(walletP, AMM_INSTANCE_BOARD_ID);

        const zoe = E(walletP).getZoe();
        const board = E(walletP).getBoard();

        const instance = await E(board).getValue(INSTANCE_BOARD_ID);
        const treasuryAPI = E(zoe).getPublicFacet(instance);
        const [terms, collaterals] = await Promise.all([
          E(zoe).getTerms(instance),
          E(treasuryAPI).getCollaterals(),
        ]);
        const {
          issuers: { Scones: sconeIssuer },
          brands: { Scones: sconeBrand },
        } = terms;

        dispatch(
          setTreasury({ instance, treasuryAPI, sconeIssuer, sconeBrand }),
        );

        await initializeBrandToInfo({
          dispatch,
          issuerKeywordRecord: terms.issuers,
          brandKeywordRecord: terms.brands,
        });

        console.log('SET COLLATERALS', collaterals);
        dispatch(setCollaterals(collaterals));

        // The moral equivalent of walletGetPurses()
        async function watchPurses() {
          const pn = E(walletP).getPursesNotifier();
          for await (const purses of iterateNotifier(pn)) {
            dispatch(setPurses(purses));
          }
        }
        watchPurses().catch(err =>
          console.error('FIGME: got watchPurses err', err),
        );

        async function watchBrands() {
          const issuersN = E(walletP).getIssuersNotifier();
          for await (const issuers of iterateNotifier(issuersN)) {
            updateBrandPetnames({
              dispatch,
              brandToInfo,
              issuersFromNotifier: issuers,
            });
          }
        }
        watchBrands().catch(err => {
          console.error('got watchBrands err', err);
        });
        await Promise.all([
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
          E(walletP).suggestIssuer('MoE', SCONE_ISSUER_BOARD_ID),
        ]);

        watchOffers(dispatch, INSTANCE_BOARD_ID);
      },
      onDisconnect() {
        dispatch(setConnected(false));
        walletAbort && walletAbort();
        dispatch(resetState());
      },
      onMessage(data) {
        const obj = JSON.parse(data);
        walletDispatch && walletDispatch(obj);
      },
    });
    return deactivateWebSocket;
  }, []);

  return (
    <ApplicationContext.Provider
      value={{ state, dispatch, walletP, ammPublicFacet }}
    >
      {children}
    </ApplicationContext.Provider>
  );
}
