/* eslint-disable no-unused-vars */
import React, { createContext, useContext, useEffect, useReducer } from 'react';

import { E } from '@endo/captp';
import { makeAsyncIterableFromNotifier as iterateNotifier } from '@agoric/notifier';

import { dappConfig, refreshConfigFromWallet } from '../utils/config';

import {
  initial,
  reducer,
  defaultState,
  setPurses,
  initVaults,
  updateVault,
  setCollaterals,
  setRunLoCTerms,
  setGetRunHistory,
  setTreasury,
  setAutoswap,
  setGetRun,
  mergeBrandToInfo,
  setUseGetRUN,
  setLoadTreasuryError,
} from '../store';
import { updateBrandPetnames, storeAllBrandsFromTerms } from './storeBrandInfo';
import WalletConnection from '../components/WalletConnection';
import { getRunLoCTerms, makeGetRunNotifer } from '../runLoCStub';

// eslint-disable-next-line import/no-mutable-exports
let walletP;
export { walletP };

export const ApplicationContext = createContext({
  state: initial,
  // TODO: type for dispatch
  dispatch: /** @type { any } */ (undefined),
  // TODO: type for walletP
  walletP: /** @type { any } */ (undefined),
  retrySetup: /** @type { any } */ (undefined),
});

export function useApplicationContext() {
  return useContext(ApplicationContext);
}

/**
 * @param {string} id
 * @param {TreasuryDispatch} dispatch
 */
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

/** @type { (d: TreasuryDispatch, id: string) => void } */
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
      if (!watchedVaults.size) {
        dispatch(initVaults());
      }
      console.log('======== OFFERS', offers);
    }
  }
  offersUpdater().catch(err => console.error('Offers watcher exception', err));
}

/**
 * @param {TreasuryDispatch} dispatch
 * @param {Array<[Brand, BrandInfo]>} brandToInfo
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<Board>} board
 * @param {string} instanceID
 *
 * @typedef {{ getId: (value: unknown) => string, getValue: (id: string) => any }} Board */
const setupTreasury = async (dispatch, brandToInfo, zoe, board, instanceID) => {
  /** @type { Instance } */
  const instance = await E(board).getValue(instanceID);
  /** @type { ERef<VaultFactory> } */
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

/**
 * @param {TreasuryDispatch} dispatch
 * @param {Array<[Brand, BrandInfo]>} brandToInfo
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<Board>} board
 * @param {string} instanceID
 */
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

const setupGetRun = async (dispatch, instance, zoe, brandToInfo) => {
  const getRunApi = await E(zoe).getPublicFacet(instance);
  const governedParams = await E(getRunApi).getGovernedParams();

  const collateralPriceValue = governedParams.CollateralPrice.value;
  const brands = [
    collateralPriceValue.numerator.brand,
    collateralPriceValue.denominator.brand,
  ];
  const keywords = ['RUN', 'BLD'];
  const displayInfos = await Promise.all(
    brands.map(b => E(b).getDisplayInfo()),
  );
  const newBrandToInfo = brands.map((brand, i) => {
    const decimalPlaces = displayInfos[i] && displayInfos[i].decimalPlaces;
    /** @type { [Brand, BrandInfo]} */
    const entry = [
      brand,
      {
        assetKind: displayInfos[i].assetKind,
        decimalPlaces,
        petname: keywords[i],
        brand,
      },
    ];
    return entry;
  });
  dispatch(mergeBrandToInfo(newBrandToInfo));
  // TODO: Get notifier for governedParams.
  dispatch(setGetRun({ getRunApi, governedParams }));
};

const watchGetRun = dispatch => {
  makeGetRunNotifer(history => {
    dispatch(setGetRunHistory(history));
  });
};

/* eslint-disable complexity, react/prop-types */
export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, defaultState);
  const { brandToInfo } = state;

  const urlParams = new URLSearchParams(window.location.search);
  const useGetRun = urlParams.get('gr') === 'true';

  useEffect(() => {
    dispatch(setUseGetRUN(useGetRun));
  }, []);

  const retrySetup = async () => {
    await refreshConfigFromWallet(walletP, useGetRun);
    const {
      INSTALLATION_BOARD_ID,
      INSTANCE_BOARD_ID,
      RUN_ISSUER_BOARD_ID,
      AMM_INSTALLATION_BOARD_ID,
      AMM_INSTANCE_BOARD_ID,
      AMM_NAME,
      getRunInstance,
    } = dappConfig;
    const zoe = E(walletP).getZoe();
    const board = E(walletP).getBoard();
    try {
      if (useGetRun) {
        await Promise.all([
          setupTreasury(dispatch, brandToInfo, zoe, board, INSTANCE_BOARD_ID),
          setupAMM(dispatch, brandToInfo, zoe, board, AMM_INSTANCE_BOARD_ID),
          setupGetRun(dispatch, getRunInstance, zoe, brandToInfo),
        ]);
      } else {
        await Promise.all([
          setupTreasury(dispatch, brandToInfo, zoe, board, INSTANCE_BOARD_ID),
          setupAMM(dispatch, brandToInfo, zoe, board, AMM_INSTANCE_BOARD_ID),
        ]);
      }
    } catch (e) {
      console.log('Couldnt load collaterals');
      dispatch(setLoadTreasuryError(e));
      return;
    }

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
        const { brandInfo, terms: runLoCTerms } = await getRunLoCTerms(issuers);
        dispatch(mergeBrandToInfo([[brandInfo.brand, brandInfo]]));
        dispatch(setRunLoCTerms(runLoCTerms));

        watchGetRun(dispatch);
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
      E(walletP).suggestInstance(`${AMM_NAME}Instance`, AMM_INSTANCE_BOARD_ID),
      E(walletP).suggestIssuer('RUN', RUN_ISSUER_BOARD_ID),
    ]);

    watchOffers(dispatch, INSTANCE_BOARD_ID);
  };

  const setWalletP = async bridge => {
    walletP = bridge;

    await retrySetup();
  };

  return (
    <ApplicationContext.Provider
      value={{ state, dispatch, walletP, retrySetup }}
    >
      {children}
      <WalletConnection setWalletP={setWalletP} dispatch={dispatch} />
    </ApplicationContext.Provider>
  );
}
