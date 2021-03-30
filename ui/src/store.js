// The code in this file requires an understanding of Autodux.
// See: https://github.com/ericelliott/autodux
import autodux from 'autodux';

export const {
  reducer,
  initial: defaultState,
  actions: {
    setApproved,
    setConnected,
    setPurses,
    setBrandToInfo,
    setInfoForBrand,
    setCollaterals,
    resetState,
    setTreasury,
    setVaultCollateral,
    setVaultConfiguration,
    setVaultCreated,
    createVault,
    setVaultToManageId,
    updateVault,
    resetVault,
  },
} = autodux({
  slice: 'treasury',
  initial: {
    approved: true,
    connected: false,
    account: null,
    purses: null,
    brandToInfo: [], // [[brand, infoObj] ...]
    // Autoswap state
    inputPurse: null,
    outputPurse: null,
    inputAmount: null,
    outputAmount: null,
    quoteRequest: null, // null | 'input' | 'output'
    // Vault state
    treasury: null,
    vaultCollateral: null,
    vaultConfiguration: null,
    vaultCreated: false,
    vaults: {},
    collaterals: null,
    vaultToManageId: null,
  },
  actions: {
    createVault: (state, { id, vault }) => {
      return {
        ...state,
        vaults: {
          ...state.vaults,
          [id]: vault,
        },
      };
    },
    updateVault: ({ vaults, ...state }, { id, vault }) => {
      const oldVaultData = vaults[id];
      const status = vault.liquidated ? 'Liquidated' : 'Loan Initiated';
      return {
        ...state,
        vaults: { ...vaults, [id]: { ...oldVaultData, ...vault, status } },
      };
    },
    resetVault: state => ({
      ...state,
      vaultCollateral: null,
      vaultConfiguration: null,
    }),
    resetState: state => ({
      ...state,
      purses: null,
      collaterals: null,
      inputPurse: null,
      outputPurse: null,
      inputAmount: null,
      outputAmount: null,
    }),
    setInfoForBrand: (state, { brand, brandInfo }) => {
      // Make a copy of brandToInfo
      const newBrandToInfo = [...state.brandToInfo];

      // Check if the brand is already present, and if so get the
      // array index.
      const brandIndex = state.brandToInfo.findIndex(
        ([storedBrand, _storedInfo]) => storedBrand === brand,
      );
      // The brand is already present
      if (brandIndex > 0) {
        const [_brand, oldInfo] = state.brandToInfo[brandIndex];
        const newInfo = {
          ...oldInfo,
          ...brandInfo,
        };
        newBrandToInfo[brandIndex] = [brand, newInfo];
      } else {
        newBrandToInfo.push([brand, brandInfo]);
      }

      return {
        ...state,
        brandToInfo: newBrandToInfo,
      };
    },
  },
});
