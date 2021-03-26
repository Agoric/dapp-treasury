import React from 'react';

import { Button } from '@material-ui/core';

import { setVaultConfiguration } from '../../../store';

const EnterButton = ({ balanceExceeded, dispatch, vaultConfig }) => (
  <Button
    onClick={() => {
      if (balanceExceeded) {
        // TODO: handle correctly
      } else {
        dispatch(setVaultConfiguration(vaultConfig));
      }
    }}
  >
    Configure
  </Button>
);

export default EnterButton;
