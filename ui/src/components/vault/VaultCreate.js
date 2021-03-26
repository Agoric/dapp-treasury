import React from 'react';

import { Button, Typography } from '@material-ui/core';

import { resetVault } from '../../store';

import { makeLoanOffer } from '../../contexts/makeLoanOffer';
import VaultConfirmation from './VaultConfirmation';

function VaultCreate({ dispatch, vaultConfiguration, walletP }) {
  return (
    <div>
      <Typography variant="h6">
        Confirm details and create your vault
      </Typography>
      <VaultConfirmation
        vaultConfiguration={vaultConfiguration}
      ></VaultConfirmation>
      <Button
        onClick={() => makeLoanOffer(dispatch, vaultConfiguration, walletP)}
      >
        Create
      </Button>
      <Button onClick={() => dispatch(resetVault())}>Cancel</Button>
    </div>
  );
}

export default VaultCreate;
