// @ts-check

// The code in this file requires an understanding of Autodux.
// See: https://github.com/ericelliott/autodux
import autodux from 'autodux';

export const initial = {
  approved: true,
  connected: false,
  account: null,
  purses: /** @type {PursesJSONState[] | null} */ (null),
  brandToInfo: /** @type {Array<[Brand, BrandInfo]>} */ ([]),

  // Autoswap state
  autoswap: /** @type { AutoswapState } */ ({}),
  // Vault state
  treasury: /** @type { VaultState | null } */ (null),
  vaultCollateral: /** @type { Collateral | null } */ (null),
  vaultConfiguration: null,
  vaults: /** @type {Record<string, VaultData>} */ ({}),
  collaterals: /** @type { Collateral[] | null } */ (null),
  runLoCTerms: /** @type { Collateral | null } */ (null),
  vaultToManageId: /** @type {string | null} */ (null),
};

/**
 * @type {{
 *   reducer: TreasuryReducer,
 *   initial: TreasuryState,
 *   actions: TreasuryActions,
 * }}
 *
 * @typedef {{
 *    setApproved: (payload: boolean) => TreasuryReducer,
 *    setConnected: (payload: boolean) => TreasuryReducer,
 *    setPurses: (payload: typeof initial.purses) => TreasuryReducer,
 *    createVault: (payload: { id: string, vault: VaultData }) => TreasuryReducer,
 *    mergeBrandToInfo: (payload: typeof initial.brandToInfo ) => TreasuryReducer,
 *    addToBrandToInfo: (payload: typeof initial.brandToInfo) => TreasuryReducer,
 *    setCollaterals: (payload: typeof initial.collaterals) => TreasuryReducer,
 *    setRunLoCTerms: (payload: typeof initial.runLoCTerms) => TreasuryReducer,
 *    resetState: () => TreasuryReducer,
 *    setTreasury: (payload: typeof initial.treasury) => TreasuryReducer,
 *    setVaultCollateral: (payload: typeof initial.vaultCollateral) => TreasuryReducer,
 *    setVaultConfiguration: (payload: typeof initial.vaultConfiguration) => TreasuryReducer,
 *    setVaultToManageId: (payload: typeof initial.vaultToManageId) => TreasuryReducer,
 *    updateVault: (v: { id: string, vault: VaultData }) => TreasuryReducer,
 *    resetVault: () => TreasuryReducer,
 *    setAutoswap: (payload: typeof initial.autoswap) => TreasuryReducer,
 * }} TreasuryActions
 */

export const {
  reducer,
  initial: defaultState,
  actions: {
    setApproved,
    setConnected,
    setPurses,
    mergeBrandToInfo,
    addToBrandToInfo,
    setCollaterals,
    setRunLoCTerms,
    resetState,
    setTreasury,
    setVaultCollateral,
    setVaultConfiguration,
    createVault,
    setVaultToManageId,
    updateVault,
    resetVault,
    setAutoswap,
  },
  // @ts-ignore tsc can't tell that autodux is callable
} = autodux({
  slice: 'treasury',
  initial,
  actions: {
    /** @type {(state: TreasuryState, v: { id: string, vault: VaultData }) => TreasuryState} */
    createVault: (state, { id, vault }) => {
      return {
        ...state,
        vaults: {
          ...state.vaults,
          [id]: vault,
        },
      };
    },
    /** @type {(state: TreasuryState, v: { id: string, vault: VaultData }) => TreasuryState} */
    updateVault: ({ vaults, ...state }, { id, vault }) => {
      const oldVaultData = vaults[id];
      const status = vault.liquidated ? 'Liquidated' : vault.status;
      return {
        ...state,
        vaults: { ...vaults, [id]: { ...oldVaultData, ...vault, status } },
      };
    },
    /** @type {(state: TreasuryState) => TreasuryState} */
    resetVault: state => ({
      ...state,
      vaultCollateral: null,
      vaultConfiguration: null,
    }),
    /** @type {(state: TreasuryState) => TreasuryState} */
    resetState: state => ({
      ...state,
      purses: null,
      collaterals: null,
      inputPurse: null,
      outputPurse: null,
      inputAmount: null,
      outputAmount: null,
    }),
    /** @type {(state: TreasuryState, newBrandToInfo: Array<[Brand, BrandInfo]>) => TreasuryState} */
    mergeBrandToInfo: (state, newBrandToInfo) => {
      const merged = new Map([...state.brandToInfo, ...newBrandToInfo]);

      const brandToInfo = [...merged.entries()];
      return {
        ...state,
        brandToInfo,
      };
    },
  },
});
