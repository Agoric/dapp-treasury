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
  setTreasury,
  setAutoswap,
  mergeBrandToInfo,
  setUseGetRUN,
  setLoadTreasuryError,
  mergeRUNStakeHistory,
  setRUNStake,
  setLoan,
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

  async function assetUpdater(asset) {
    for await (const assetState of iterateNotifier(asset)) {
      console.log('======== ASSET', id, assetState);
      dispatch(
        updateVault({
          id,
          vault: { asset: assetState },
        }),
      );
    }
  }

  async function watch() {
    let vault;
    let asset;
    try {
      const notifiers = await E(walletP).getPublicNotifiers(id);
      ({ vault, asset } = notifiers);
    } catch (err) {
      console.error('Could not get notifiers', id, err);
      dispatch(updateVault({ id, vault: { status: VaultStatus.ERROR, err } }));
      return;
    }

    assetUpdater(asset).catch(err => {
      console.error('Asset watcher exception', id, err);
    });

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
      } of offers) {
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
  const {
    issuers: { RUN: runIssuer },
    brands: { RUN: runBrand },
  } = terms;
  dispatch(
    setTreasury({ instance, treasuryAPI, runIssuer, runBrand, priceAuthority }),
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

function watchLoan(status, id, dispatch, watchedLoans) {
  watchedLoans.add(id);
  console.log('loan watched', id, status);

  const cached = window.localStorage.getItem(id);
  if (cached !== null) {
    console.log(`loan ${cached}`, id);
    return cached;
  }

  if (status === undefined) {
    status = LoanStatus.PROPOSED;
  }

  // If the loan is active, don't show it until we get its data.
  if (status !== LoanStatus.ACCEPT) {
    dispatch(setLoan({ status }));
  }

  // We don't know if the loan is still open or not until we get its notifier
  // data.
  //
  // If the notifier throws an error, or is finished, the loan is closed.
  return new Promise(resolve => {
    async function loanUpdater() {
      const uiNotifier = await E(walletP).getUINotifier(id);
      let isAccept;
      for await (const value of iterateNotifier(uiNotifier)) {
        console.log('======== LOAN', id, value);
        isAccept = true;
        resolve(LoanStatus.ACCEPT);
        dispatch(setLoan({ id, status: LoanStatus.ACCEPT, data: value }));
      }
      console.log('loan closed', id);
      window.localStorage.setItem(id, LoanStatus.CLOSED);
      if (isAccept) {
        dispatch(setLoan({}));
      } else {
        resolve(LoanStatus.CLOSED);
      }
    }

    loanUpdater().catch(err => {
      console.error('Loan watcher exception', id, err);
      window.localStorage.setItem(id, LoanStatus.ERROR);
      resolve(LoanStatus.ERROR);
    });
  });
}
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
        continuingInvitation === undefined // AdjustBalances and CloseVault offers use continuingInvitation
      ) {
        if (
          [
            LoanStatus.ACCEPT,
            LoanStatus.COMPLETE,
            LoanStatus.PENDING,
            undefined,
          ].includes(status) &&
          !watchedLoans.has(id)
        ) {
          const loanStatus = await watchLoan(
            status,
            id,
            dispatch,
            watchedLoans,
          );

          if ([LoanStatus.ACCEPT, LoanStatus.CLOSED].includes(loanStatus)) {
            dispatch(
              mergeRUNStakeHistory({ [id]: { meta, proposalForDisplay } }),
            );
          }
          return status;
        }
      } else if (
        instanceHandleBoardId === instanceBoardId &&
        continuingInvitation &&
        status === LoanStatus.ACCEPT
      ) {
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
  console.log('WATCHING LOANS ------');
  const watchedLoans = new Set();

  async function offersUpdater() {
    const offerNotifier = E(walletP).getOffersNotifier();
    for await (const offers of iterateNotifier(offerNotifier)) {
      console.log('GOT OFFERS FOR ', instanceBoardId);
      const hasLoan = [LoanStatus.ACCEPT].includes(
        await Promise.all(
          processLoanOffers(dispatch, instanceBoardId, watchedLoans, offers),
        ),
      );
      // Set loan to empty object indicating data is loaded but no loan exists.
      if (!hasLoan) {
        dispatch(setLoan({}));
      }
    }
  }
  offersUpdater().catch(err =>
    console.error('GetRUN offers watcher exception', err),
  );
};

const setupRUNStake = async (
  dispatch,
  instance,
  board,
  zoe,
  RUN_STAKE_NAME,
) => {
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

/* eslint-disable complexity, react/prop-types */
export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, defaultState);
  const { brandToInfo } = state;

  const urlParams = new URLSearchParams(window.location.search);
  const useGetRUN = urlParams.get('gr') === 'true';

  useEffect(() => {
    dispatch(setUseGetRUN(useGetRUN));
  }, []);

  const retrySetup = async () => {
    await refreshConfigFromWallet(walletP, useGetRUN);
    const {
      INSTALLATION_BOARD_ID,
      INSTANCE_BOARD_ID,
      RUN_ISSUER_BOARD_ID,
      AMM_INSTALLATION_BOARD_ID,
      AMM_INSTANCE_BOARD_ID,
      AMM_NAME,
      RUNStakeInstance,
      RUN_STAKE_NAME,
    } = dappConfig;

    const zoe = E(walletP).getZoe();
    const board = E(walletP).getBoard();
    try {
      if (useGetRUN) {
        await setupRUNStake(
          dispatch,
          RUNStakeInstance,
          board,
          zoe,
          RUN_STAKE_NAME,
        );
      } else {
        await Promise.all([
          setupTreasury(dispatch, brandToInfo, zoe, board, INSTANCE_BOARD_ID),
          setupAMM(dispatch, brandToInfo, zoe, board, AMM_INSTANCE_BOARD_ID),
        ]);
      }
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

    if (!useGetRUN) {
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
    }
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
