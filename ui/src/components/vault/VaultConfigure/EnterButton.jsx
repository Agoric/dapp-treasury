import React from 'react';

import { Button } from '@material-ui/core';

import { setVaultConfiguration } from '../../../store';

const EnterButton = ({
  balanceExceeded,
  dispatch,
  vaultConfig,
  belowMinError,
}) => {
  const formHasError = balanceExceeded || belowMinError;
  return (
    <Button
      color="primary"
      variant="contained"
      onClick={() => {
        if (!formHasError) {
          dispatch(setVaultConfiguration(vaultConfig));
        }
      }}
    >
      Configure
    </Button>
  );
};

export default EnterButton;
