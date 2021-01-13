import React, {
  createContext,
  useContext,
  useCallback,
  useReducer,
  useEffect,
} from 'react';

import { makeCapTP, E } from '@agoric/captp';
import { makeAsyncIterableFromNotifier as iterateNotifier } from '@agoric/notifier';

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
  setInvitationDepositId,
  setConnected,
  setActive,
  resetState,
  updateVault,
  setCollaterals,
  setVaultCreated,
  setOutputAmount,
  setInputAmount,
} from '../store';
import dappConstants from '../generated/defaults.js';
import { getCollaterals } from './getCollaterals';
import { getAMMPublicFacet } from './getAMMPublicFacet';

const {
  INVITATION_BRAND_BOARD_ID,
  INSTALLATION_BOARD_ID,
  INSTANCE_BOARD_ID,
  SCONE_ISSUER_BOARD_ID,
  AMM_NAME,
  AMM_INSTALLATION_BOARD_ID,
  AMM_INSTANCE_BOARD_ID,
} = dappConstants;

// eslint-disable-next-line import/no-mutable-exports
let walletP;
export { walletP };
let ammPublicFacet;

export const ApplicationContext = createContext();

export function useApplicationContext() {
  return useContext(ApplicationContext);
}

async function getVaultPetnames(vault) {
  const lockedBrand = vault.locked.brand;
  const debtBrand = vault.debt.brand;
  const [lockedBrandPetname, debtBrandPetname] = await E(
    walletP,
  ).getBrandPetnames(harden([lockedBrand, debtBrand]));
  return {
    ...vault,
    lockedBrandPetname,
    locked: vault.locked.value,
    debtBrandPetname,
    debt: vault.debt.value,
  };
}

function watchVault(id, dispatch) {
  console.log('vaultWatched', id);
  async function vaultUpdater() {
    const uiNotifier = E(walletP).getUINotifier(id);
    for await (const value of iterateNotifier(uiNotifier)) {
      console.log('======== VAULT', id, value);
      // TODO: replace when collateralizationRatio works
      const vault = await getVaultPetnames({
        ...value,
        collateralizationRatio: 150,
      });
      dispatch(updateVault({ id, vault }));
    }
  }

  vaultUpdater().catch(err =>
    console.error('Vault watcher exception', id, err),
  );
}

function watchOffers(dispatch) {
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
  const { active, inputPurse, outputPurse, inputAmount, outputAmount } = state;

  useEffect(() => {
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
        walletP = getBootstrap();
        ammPublicFacet = getAMMPublicFacet(walletP);

        const collaterals = await getCollaterals(walletP, INSTANCE_BOARD_ID);
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
        const [invitationDepositId] = await Promise.all([
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
          E(walletP).suggestIssuer('MoE', SCONE_ISSUER_BOARD_ID),
        ]);

        watchOffers(dispatch);

        dispatch(setInvitationDepositId(invitationDepositId));
      },
      onDisconnect() {
        dispatch(setConnected(false));
        dispatch(setActive(false));
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

  const apiMessageHandler = useCallback(async message => {
    if (!message) {
      return;
    }
    const { type, data } = message;
    switch (type) {
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
      case 'treasury/makeLoanInvitationResponse': {
        // Once the invitation has been sent to the user, we update the
        // offer to include the invitationBoardId. Then we make a
        // request to the user's wallet to send the proposed offer for
        // acceptance/rejection.
        const { offer } = data;
        await E(walletP).addOffer(offer);
        dispatch(setVaultCreated(false));
        break;
      }
      default: {
        console.log('Unexpected response', message);
      }
    }
  });

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
    if (inputPurse && outputPurse && inputAmount > 0) {
      const amountIn = { brand: inputPurse.brand, value: inputAmount };
      const brandOut = outputPurse.brand;
      console.log('GET INPUT PRICE', amountIn, brandOut);
      const outputP = E(ammPublicFacet).getInputPrice(amountIn, brandOut);

      outputP.then(output => {
        dispatch(setOutputAmount(output.value));
      });
    }

    if (inputPurse && outputPurse && outputAmount > 0) {
      const brandIn = inputPurse.brand;
      const amountOut = { brand: outputPurse.brand, value: outputAmount };
      console.log('GET OUTPUT PRICE', amountOut, brandIn);
      const inputP = E(ammPublicFacet).getOutputPrice(amountOut, brandIn);

      inputP.then(input => {
        dispatch(setInputAmount(input.value));
      });
    }
  }, [inputPurse, outputPurse, inputAmount, outputAmount]);

  return (
    <ApplicationContext.Provider value={{ state, dispatch }}>
      {children}
    </ApplicationContext.Provider>
  );
}
