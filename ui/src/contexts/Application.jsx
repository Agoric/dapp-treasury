import React, { createContext, useContext, useReducer } from 'react';

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
  mergeVaultHistory,
  setCollaterals,
  setTreasury,
  mergeBrandToInfo,
  setLoadTreasuryError,
  mergeRUNStakeHistory,
  setRUNStake,
  setLoan,
  setLoanAsset,
  mergeVaultAssets,
  mergeGovernedParams,
  setPSM,
} from '../store';
import { updateBrandPetnames, storeAllBrandsFromTerms } from './storeBrandInfo';
import WalletConnection from '../components/WalletConnection';
import { LoanStatus, VaultStatus } from '../constants';

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
 * @param {string} offerStatus
 */
function watchVault(id, dispatch, offerStatus) {
  console.log('vaultWatched', id);

  // There is no UINotifier for offers that haven't been accepted, but
  // we still want to show that the offer exists
  if (offerStatus !== 'accept') {
    dispatch(
      updateVault({
        id,
        vault: { status: VaultStatus.PENDING },
      }),
    );
  } else {
    dispatch(
      updateVault({
        id,
        vault: {
          status: VaultStatus.LOADING,
        },
      }),
    );
  }

  async function vaultUpdater(vault) {
    for await (const vaultState of iterateNotifier(vault)) {
      console.log('======== VAULT', id, vaultState);
      dispatch(
        updateVault({
          id,
          vault: { ...vaultState, status: VaultStatus.INITIATED },
        }),
      );
    }
    dispatch(updateVault({ id, vault: { status: VaultStatus.CLOSED } }));
    window.localStorage.setItem(id, VaultStatus.CLOSED);
  }

  async function watch() {
    let vault;
    try {
      const notifiers = await E(walletP).getPublicNotifiers(id);
      ({ vault } = notifiers);
    } catch (err) {
      console.error('Could not get notifiers', id, err);
      dispatch(updateVault({ id, vault: { status: VaultStatus.ERROR, err } }));
      return;
    }

    vaultUpdater(vault).catch(err => {
      console.error('Vault watcher exception', id, err);
      dispatch(updateVault({ id, vault: { status: VaultStatus.ERROR, err } }));
    });
  }

  watch();
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
        status,
        proposalForDisplay,
        meta,
      } of offers) {
        dispatch(
          mergeVaultHistory({
            id,
            continuingInvitation,
            status,
            proposalForDisplay,
            meta,
          }),
        );
        if (
          instanceHandleBoardId === INSTANCE_BOARD_ID &&
          continuingInvitation === undefined // AdjustBalances and CloseVault offers use continuingInvitation
        ) {
          if (status === 'decline') {
            // We don't care about declined offers, still update the vault so
            // the UI can hide it if needed.
            dispatch(
              updateVault({
                id,
                vault: { status: VaultStatus.DECLINED },
              }),
            );
          } else if (window.localStorage.getItem(id) === VaultStatus.CLOSED) {
            // We can cache closed vaults since their notifiers cannot update
            // anymore.
            dispatch(
              updateVault({
                id,
                vault: { status: VaultStatus.CLOSED },
              }),
            );
            watchedVaults.add(id);
          } else if (!watchedVaults.has(id)) {
            watchedVaults.add(id);
            watchVault(id, dispatch, status);
          }
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

const watchCollateral = async (dispatch, collateral, treasuryAPI) => {
  const [manager, governedParams] = await Promise.all([
    E(treasuryAPI).getCollateralManager(collateral.brand),
    E(treasuryAPI).getGovernedParams({ collateralBrand: collateral.brand }),
  ]);
  dispatch(mergeGovernedParams([[collateral.brand, governedParams]]));

  const notifier = await E(manager).getNotifier();
  for await (const state of iterateNotifier(notifier)) {
    console.log('asset state', collateral.brand, state);
    dispatch(mergeVaultAssets([[collateral.brand, state]]));
  }
};

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
  const termsP = E(zoe).getTerms(instance);
  const [treasuryAPI, terms, collaterals, priceAuthority] = await Promise.all([
    treasuryAPIP,
    termsP,
    E(treasuryAPIP).getCollaterals(),
    E.get(termsP).priceAuthority,
  ]);
  for (const collateral of collaterals) {
    watchCollateral(dispatch, collateral, treasuryAPI);
  }

  const {
    issuers: { RUN: runIssuer },
    brands: { RUN: runBrand },
    governedParams: {
      MinInitialDebt: { value: minInitialDebt },
    },
    loanParams: {
      DebtLimit: { value: debtLimit },
    },
  } = terms;
  console.log('VaultFactory terms:', terms);
  dispatch(
    setTreasury({
      instance,
      treasuryAPI,
      runIssuer,
      runBrand,
      priceAuthority,
      minInitialDebt,
      debtLimit,
    }),
  );
  await storeAllBrandsFromTerms({
    dispatch,
    terms,
    brandToInfo,
  });
  console.log('SET COLLATERALS', collaterals);
  dispatch(setCollaterals(collaterals));
  return { terms, collaterals };
};

// We don't know if the loan is still open or not until we get its notifier
// data, so return a promise that resolves after we find out.
//
// If the notifier throws an error, or is finished, the loan is closed.
const watchLoan = (status, id, dispatch, watchedLoans) =>
  new Promise(resolve => {
    const cached = window.localStorage.getItem(id);
    if (cached !== null) {
      watchedLoans[id] = cached;
      resolve();
      return;
    }

    if (status === undefined) {
      status = LoanStatus.PROPOSED;
    }

    // If the loan is active, don't show it until we get its data.
    if (status !== 'accept') {
      watchedLoans[id] = status;
      dispatch(setLoan({ id, status }));
      resolve();
    }

    async function watchLoanAsset(asset) {
      for await (const value of iterateNotifier(asset)) {
        dispatch(setLoanAsset(value));
      }
    }

    async function loanUpdater() {
      const { vault, asset } = await E(walletP).getPublicNotifiers(id);

      watchLoanAsset(asset);

      let isOpen;
      for await (const value of iterateNotifier(vault)) {
        console.log('======== LOAN', id, value);
        isOpen = true;
        watchedLoans[id] = LoanStatus.OPEN;
        resolve();
        dispatch(setLoan({ id, status: LoanStatus.OPEN, data: value }));
      }
      console.log('Loan closed', id);
      watchedLoans[id] = LoanStatus.CLOSED;
      window.localStorage.setItem(id, LoanStatus.CLOSED);
      if (isOpen) {
        // The loan was open before, which means it was set as the open loan,
        // so we want to reset back to the no-loans-open state.
        dispatch(setLoan({}));
      } else {
        resolve();
      }
    }

    loanUpdater().catch(err => {
      console.error('Loan watcher exception', id, err);
      watchedLoans[id] = LoanStatus.ERROR;
      window.localStorage.setItem(id, LoanStatus.ERROR);
      resolve();
    });
  });

const processLoanOffers = (dispatch, instanceBoardId, watchedLoans, offers) =>
  offers.map(
    async ({
      id,
      instanceHandleBoardId,
      continuingInvitation,
      status,
      proposalForDisplay,
      meta,
    }) => {
      if (
        instanceHandleBoardId === instanceBoardId &&
        continuingInvitation === undefined
      ) {
        if (status === 'decline' && id in watchedLoans) {
          dispatch(setLoan({}));
          delete watchedLoans[id];
        }
        if (['accept', 'pending', 'complete', undefined].includes(status)) {
          if (!(id in watchedLoans)) {
            await watchLoan(status, id, dispatch, watchedLoans);
          }
          const loanStatus = watchedLoans[id];

          if ([LoanStatus.OPEN, LoanStatus.CLOSED].includes(loanStatus)) {
            dispatch(
              mergeRUNStakeHistory({ [id]: { meta, proposalForDisplay } }),
            );
          }
          return loanStatus;
        }
      } else if (
        instanceHandleBoardId === instanceBoardId &&
        continuingInvitation &&
        status === 'accept'
      ) {
        // AdjustBalances and CloseVault offers use continuingInvitation
        dispatch(
          mergeRUNStakeHistory({
            [id]: { meta, proposalForDisplay, continuingInvitation },
          }),
        );
      }
      return null;
    },
  );

const watchLoans = async (dispatch, instanceBoardId) => {
  const watchedLoans = {};

  async function offersUpdater() {
    const offerNotifier = E(walletP).getOffersNotifier();
    for await (const offers of iterateNotifier(offerNotifier)) {
      const loans = await Promise.all(
        processLoanOffers(dispatch, instanceBoardId, watchedLoans, offers),
      );
      const hasLoan =
        loans.includes(LoanStatus.OPEN) || loans.includes(LoanStatus.PROPOSED);
      // Set loan to empty object indicating data is loaded but no loan exists.
      if (!hasLoan) {
        dispatch(setLoan({}));
      }
    }
  }
  offersUpdater().catch(err =>
    console.error('runStake offers watcher exception', err),
  );
};

const setupRUNStake = async (
  dispatch,
  RUNStakeMethod,
  RUNStakeArgs,
  board,
  zoe,
  RUN_STAKE_NAME,
) => {
  const instance = await E(walletP)[RUNStakeMethod](...RUNStakeArgs);
  const [RUNStakeAPI, RUNStakeTerms, RUNStakeInstallation] = await Promise.all([
    E(zoe).getPublicFacet(instance),
    E(zoe).getTerms(instance),
    E(zoe).getInstallationForInstance(instance),
  ]);
  // Get brands.
  const brands = [
    RUNStakeTerms.brands.Attestation,
    RUNStakeTerms.brands.Debt,
    RUNStakeTerms.brands.Stake,
  ];
  const keywords = ['LIEN', 'RUN', 'BLD'];
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

  // Suggest instance/installation
  const [instanceBoardId, installationBoardId] = await Promise.all([
    E(board).getId(instance),
    E(board).getId(RUNStakeInstallation),
  ]);
  await Promise.all([
    E(walletP).suggestInstallation(
      `${RUN_STAKE_NAME}Installation`,
      installationBoardId,
    ),
    E(walletP).suggestInstance(`${RUN_STAKE_NAME}Instance`, instanceBoardId),
  ]);

  // Watch for loan invitations.
  watchLoans(dispatch, instanceBoardId);

  // TODO: Get notifier for governedParams.
  dispatch(
    setRUNStake({
      RUNStakeAPI,
      RUNStakeTerms,
      instanceBoardId,
      installationBoardId,
    }),
  );
};

const setupPSM = async (dispatch, PSMMethod, PSMArgs, board, zoe, PSM_NAME) => {
  const instance = await E(walletP)[PSMMethod](...PSMArgs);
  const [PSMAPI, PSMTerms, PSMInstallation] = await Promise.all([
    E(zoe).getPublicFacet(instance),
    E(zoe).getTerms(instance),
    E(zoe).getInstallationForInstance(instance),
  ]);
  // Get brands.
  const brands = Object.entries(PSMTerms.brands);
  const displayInfos = await Promise.all(
    brands.map(([_name, brand]) => E(brand).getDisplayInfo()),
  );

  const newBrandToInfo = brands.map(([petname, brand], i) => {
    /** @type { [Brand, BrandInfo]} */
    const entry = [
      brand,
      {
        assetKind: displayInfos[i].assetKind,
        decimalPlaces: displayInfos[i].decimalPlaces,
        petname,
        brand,
      },
    ];
    return entry;
  });
  dispatch(mergeBrandToInfo(newBrandToInfo));

  // Suggest instance/installation
  const [instanceBoardId, installationBoardId, PSMParams] = await Promise.all([
    E(board).getId(instance),
    E(board).getId(PSMInstallation),
    E(PSMAPI).getGovernedParams(),
  ]);
  await Promise.all([
    E(walletP).suggestInstallation(
      `${PSM_NAME}Installation`,
      installationBoardId,
    ),
    E(walletP).suggestInstance(`${PSM_NAME}Instance`, instanceBoardId),
  ]);

  dispatch(
    setPSM({
      PSMAPI,
      PSMTerms,
      PSMParams,
      instanceBoardId,
      installationBoardId,
    }),
  );
};

/* eslint-disable complexity, react/prop-types */
export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, defaultState);
  const { brandToInfo } = state;

  const retrySetup = async () => {
    await refreshConfigFromWallet(walletP);
    const {
      INSTALLATION_BOARD_ID,
      INSTANCE_BOARD_ID,
      RUN_ISSUER_BOARD_ID,
      RUN_STAKE_NAME,
      RUN_STAKE_ON_CHAIN_CONFIG: [RUNStakeMethod, RUNStakeArgs],
      PSM_NAME,
      PSM_ON_CHAIN_CONFIG: [PSMMethod, PSMArgs],
    } = dappConfig;

    const zoe = E(walletP).getZoe();
    const board = E(walletP).getBoard();

    setupRUNStake(
      dispatch,
      RUNStakeMethod,
      RUNStakeArgs,
      board,
      zoe,
      RUN_STAKE_NAME,
    );

    const psmParam = new URLSearchParams(window.location.search).get('psm');
    if (psmParam === 'true') {
      setupPSM(dispatch, PSMMethod, PSMArgs, board, zoe, PSM_NAME);
    }

    try {
      await setupTreasury(dispatch, brandToInfo, zoe, board, INSTANCE_BOARD_ID);
    } catch (e) {
      console.error('Couldnt load collaterals', e);
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
      }
    }
    watchBrands().catch(err => {
      console.error('got watchBrands err', err);
    });

    await Promise.all([
      E(walletP).suggestInstallation('Installation', INSTALLATION_BOARD_ID),
      E(walletP).suggestInstance('Instance', INSTANCE_BOARD_ID),
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
