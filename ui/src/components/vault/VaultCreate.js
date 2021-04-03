import React from 'react';

import { Button, Typography, Grid } from '@material-ui/core';

import { resetVault } from '../../store';

import { makeLoanOffer } from '../../contexts/makeLoanOffer';
import VaultConfirmation from './VaultConfirmation';
import ErrorBoundary from '../ErrorBoundary';

function VaultCreate({ dispatch, vaultConfiguration, walletP, brandToInfo }) {
  return (
    <div>
      <Typography variant="h6">
        Confirm details and create your vault
      </Typography>
      <ErrorBoundary>
        <VaultConfirmation
          vaultConfiguration={vaultConfiguration}
          brandToInfo={brandToInfo}
        ></VaultConfirmation>
        <Grid container justify="flex-end">
          <Button onClick={() => dispatch(resetVault())}>Cancel</Button>
          <Button
            onClick={() => makeLoanOffer(dispatch, vaultConfiguration, walletP)}
          >
            Create
          </Button>
        </Grid>
      </ErrorBoundary>
    </div>
  );
}

export default VaultCreate;
