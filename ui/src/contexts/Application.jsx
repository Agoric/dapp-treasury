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
  setAutoswap,
  setApproved,
} from '../store';
import { updateBrandPetnames, storeAllBrandsFromTerms } from './storeBrandInfo';

// eslint-disable-next-line import/no-mutable-exports
let walletP;
export { walletP };

export const ApplicationContext = createContext();

export function useApplicationContext() {
  return useContext(ApplicationContext);
}

function watchVault(id, dispatch) {
  console.log('vaultWatched', id);

  // There is no UINotifier for offers that haven't been accepted, but
  // we still want to show that the offer exists

  const status = 'Pending Wallet Acceptance';
  dispatch(
    updateVault({
      id,
      vault: { status },
    }),
  );

  async function vaultUpdater() {
    const uiNotifier = E(walletP).getUINotifier(id);
    for await (const value of iterateNotifier(uiNotifier)) {
      console.log('======== VAULT', id, value);
      dispatch(
        updateVault({ id, vault: { ...value, status: 'Loan Initiated' } }),
      );
    }
  }

  vaultUpdater().catch(err => {
    console.error('Vault watcher exception', id, err);
    dispatch(updateVault({ id, vault: { status: 'Error in offer', err } }));
  });
}

function watchOffers(dispatch, INSTANCE_BOARD_ID) {
  const watchedVaults = new Set();
  async function offersUpdater() {
    const offerNotifier = E(walletP).getOffersNotifier();
    for await (const offers of iterateNotifier(offerNotifier)) {
      for (const {
        id,
        instanceHandleBoardId,
        continuingInvitation,
      } of offers) {
        if (
          instanceHandleBoardId === INSTANCE_BOARD_ID &&
          !watchedVaults.has(id) &&
          continuingInvitation === undefined // AdjustBalances and CloseVault offers use continuingInvitation
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

const setupTreasury = async (dispatch, brandToInfo, zoe, board, instanceID) => {
  const instance = await E(board).getValue(instanceID);
  const treasuryAPIP = E(zoe).getPublicFacet(instance);
  const [treasuryAPI, terms, collaterals] = await Promise.all([
    treasuryAPIP,
    E(zoe).getTerms(instance),
    E(treasuryAPIP).getCollaterals(),
  ]);
  const {
    issuers: { RUN: runIssuer },
    brands: { RUN: runBrand },
  } = terms;
  dispatch(setTreasury({ instance, treasuryAPI, runIssuer, runBrand }));
  await storeAllBrandsFromTerms({
    dispatch,
    terms,
    brandToInfo,
  });
  console.log('SET COLLATERALS', collaterals);
  dispatch(setCollaterals(collaterals));
  return { terms, collaterals };
};
const setupAMM = async (dispatch, brandToInfo, zoe, board, instanceID) => {
  const instance = await E(board).getValue(instanceID);
  const [ammAPI, terms] = await Promise.all([
    E(zoe).getPublicFacet(instance),
    E(zoe).getTerms(instance),
  ]);
  // TODO this uses getTerms.brands, but that includes utility tokens, etc.
  // We need a query/notifier for what are the pools supported
  const {
    brands: { Central: centralBrand, ...otherBrands },
  } = terms;
  console.log('AMM brands retrieved', otherBrands);
  dispatch(setAutoswap({ instance, ammAPI, centralBrand, otherBrands }));
  await storeAllBrandsFromTerms({
    dispatch,
    terms,
    brandToInfo,
  });
};

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
          RUN_ISSUER_BOARD_ID,
          AMM_INSTALLATION_BOARD_ID,
          AMM_INSTANCE_BOARD_ID,
        } = dappConfig;

        const zoe = E(walletP).getZoe();
        const board = E(walletP).getBoard();

        await Promise.all([
          setupTreasury(dispatch, brandToInfo, zoe, board, INSTANCE_BOARD_ID),
          setupAMM(dispatch, brandToInfo, zoe, board, AMM_INSTANCE_BOARD_ID),
        ]);

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
          console.log('BRANDS REQUESTED');
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
          E(walletP).suggestIssuer('RUN', RUN_ISSUER_BOARD_ID),
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
    <ApplicationContext.Provider value={{ state, dispatch, walletP }}>
      {children}
    </ApplicationContext.Provider>
  );
}
