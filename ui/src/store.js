// @ts-check

// The code in this file requires an understanding of Autodux.
// See: https://github.com/ericelliott/autodux
import autodux from 'autodux';

export const initial = {
  approved: true,
  connected: false,
  account: null,
  purses: /** @type {PursesJSONState[] | null} */ (null),
  brandToInfo: /** @type {Iterable<[Brand, BrandInfo]>} */ ([]),

  // Autoswap state
  autoswap: /** @type { AutoswapState } */ ({}),
  // Vault state
  treasury: /** @type { VaultState | null } */ (null),
  vaultCollateral: null,
  vaultConfiguration: null,
  vaults: /** @type {Record<string, VaultData>} */ ({}),
  collaterals: null,
  vaultToManageId: /** @type {string | null} */ (null),
};

/**
 * @typedef { typeof initial } TreasuryState
 *
 * @typedef {{
 *   instance?: Instance,
 *   ammAPI?: ERef<MultipoolAutoswapPublicFacet>,
 *   centralBrand?: Brand,
 *   otherBrands?: Record<string, Brand>,
 * }} AutoswapState
 *
 * @typedef {{
 *   status?: 'Pending Wallet Acceptance' | 'Error in offer'| 'Loan Initiated' | 'Liquidated',
 *   liquidated?: boolean,
 *   locked?: Amount | null,
 *   collateralizationRatio?: Ratio | null,
 *   debt?: Amount | null,
 *   interestRate?:  Ratio | null,
 *   liquidationRatio?: Ratio | null,
 *   err?: Error
 * }} VaultData
 *
 * @typedef {{
 *   instance: Instance,
 *   treasuryAPI: unknown,
 *   runIssuer: Issuer,
 *   runBrand: Brand,
 * }} VaultState
 * @typedef {{
 *   assetKind: AssetKind,
 *   decimalPlaces?: number,
 *   issuer: Issuer,
 *   petname: string,
 *   brand: Brand,
 * }} BrandInfo
 *
 * @typedef {{ brand: Brand, displayInfo: any }} PursesJSONState
 * see dapp-svelte-wallet/api/src/types.js
 */

/**
 * @typedef { React.Reducer<TreasuryState, TreasuryAction> } TreasuryReducer
 *
 * @typedef { any } TreasuryAction This should probably be a big union type
 * but specifying it doesn't seem cost-effective just now.
 *
 * @type {{
 *   reducer: TreasuryReducer,
 *   initial: TreasuryState,
 *   actions: {
 *    setApproved: (payload: boolean) => TreasuryReducer,
 *    setConnected: (payload: boolean) => TreasuryReducer,
 *    setPurses: (payload: typeof initial.purses) => TreasuryReducer,
 *    createVault: (payload: { id: string, vault: VaultData }) => TreasuryReducer,
 *    mergeBrandToInfo: (payload: typeof initial.brandToInfo ) => TreasuryReducer,
 *    addToBrandToInfo: (payload: typeof initial.brandToInfo) => TreasuryReducer,
 *    setCollaterals: (payload: typeof initial.collaterals) => TreasuryReducer,
 *    resetState: () => TreasuryReducer,
 *    setTreasury: (payload: typeof initial.treasury) => TreasuryReducer,
 *    setVaultCollateral: (payload: typeof initial.vaultCollateral) => TreasuryReducer,
 *    setVaultConfiguration: (payload: typeof initial.vaultConfiguration) => TreasuryReducer,
 *    setVaultToManageId: (payload: typeof initial.vaultToManageId) => TreasuryReducer,
 *    updateVault: (v: { id: string, vault: VaultData }) => TreasuryReducer,
 *    resetVault: TreasuryReducer,
 *    setAutoswap: (payload: typeof initial.autoswap) => TreasuryReducer,
 *   }
 * }}
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
    /** @type {(state: TreasuryState, newBrandToInfo: Iterable<[Brand, BrandInfo]>) => TreasuryState} */
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
