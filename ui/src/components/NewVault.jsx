import React from 'react';

import { makeStyles } from '@material-ui/core/styles';

import { Button, Paper, Typography } from '@material-ui/core';

import VaultSteps from './VaultSteps';

import { useApplicationContext } from '../contexts/Application';
import { useVaultContext, actions } from '../contexts/Vault';

const { resetState, setCollateralBrand, setVaultParams } = actions;

const useStyles = makeStyles(theme => ({
  paper: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
    [theme.breakpoints.up(600 + theme.spacing(3) * 2)]: {
      marginTop: theme.spacing(6),
      marginBottom: theme.spacing(6),
      padding: theme.spacing(3),
    },
  },
  grid: {
    padding: theme.spacing(2),
  },
  message: {
    marginTop: theme.spacing(2),
    minHeight: theme.spacing(2),
  },
  buttons: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  button: {
    marginTop: theme.spacing(3),
  },
}));

function VaultCollateral({ dispatch }) {
  return (
    <div>
      Choose collateral{' '}
      <Button onClick={() => dispatch(setCollateralBrand(true))}>Go</Button>
    </div>
  );
}

function VaultConfigure({ dispatch }) {
  return (
    <div>
      <h5>Choose your $ETHa vault parameters</h5>
      Set $MOE to borrow <input type="numeric" value="3000" />
      <br />
      Set your collateralization ratio <input type="percent" value="150" />
      <br />
      Choose funding purse Default $ETHa purse (Edit)
      <br />
      Choose destination purse Default $MOE purse (Edit)
      <br />
      <Button onClick={() => dispatch(setVaultParams({}))}>Configure</Button>
    </div>
  );
}

function VaultCreate({ dispatch }) {
  return (
    <div>
      <h5>Confirm details and create your vault</h5>
      Depositing 7.5ETHa
      <br />
      Borrowing 5,000 $MOE
      <br />
      Interest Rate 1%
      <br />
      Liquidation Ratio 125%
      <br />
      Liquidation Price $833.33
      <br />
      Liquidation Penalty 3%
      <br />
      <Button onClick={() => dispatch(resetState())}>Create</Button>
    </div>
  );
}

/* eslint-disable complexity */
export default function NewVault() {
  const classes = useStyles();

  const {
    state: { connected },
  } = useApplicationContext();
  const {
    state: { collateralBrand, vaultParams },
    dispatch,
  } = useVaultContext();

  return (
    <Paper className={classes.paper}>
      <Typography component="h1" variant="h4" align="center">
        Borrow $MOE
      </Typography>

      <VaultSteps
        connected={connected}
        collateralBrand={collateralBrand}
        vaultParams={vaultParams}
      />

      <Button onClick={() => dispatch(resetState())}>Cancel</Button>

      {connected && !collateralBrand && <VaultCollateral dispatch={dispatch} />}
      {connected && collateralBrand && !vaultParams && (
        <VaultConfigure dispatch={dispatch} />
      )}
      {connected && collateralBrand && vaultParams && (
        <VaultCreate dispatch={dispatch} />
      )}
    </Paper>
  );
}
/* eslint-enable complexity */
