import React from 'react';

import { Button } from '@material-ui/core';

import { setVaultConfiguration } from '../../../store';

const EnterButton = ({ dispatch, vaultConfig, disabled }) => {
  return (
    <Button
      color="primary"
      variant="contained"
      disabled={disabled}
      onClick={() => {
        dispatch(setVaultConfiguration(vaultConfig));
      }}
    >
      Configure
    </Button>
  );
};

export default EnterButton;
