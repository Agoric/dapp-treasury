import React, { createContext, useContext, useReducer } from 'react';

import autodux from 'autodux';

const { reducer, initial: defaultState, actions } = autodux({
  slice: 'vault',
  initial: {
    collateralBrand: null,
    vaultParams: null,
  },
  actions: {
    resetState: state => ({
      ...state,
      collateralBrand: null,
      vaultParams: null,
    }),
  },
});

export { actions };

export const VaultContext = createContext();

export function useVaultContext() {
  return useContext(VaultContext);
}

/* eslint-disable complexity, react/prop-types */
export default function Provider({ children }) {
  const [state, dispatch] = useReducer(reducer, defaultState);

  return (
    <VaultContext.Provider value={{ state, dispatch }}>
      {children}
    </VaultContext.Provider>
  );
}
/* eslint-enable complexity, react/prop-types */
