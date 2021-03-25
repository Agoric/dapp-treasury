import React from 'react';
import { Redirect } from 'react-router-dom';

import { makeStyles } from '@material-ui/core/styles';

import { Paper, Typography } from '@material-ui/core';

import VaultSteps from './VaultSteps';

import { useApplicationContext } from '../../contexts/Application';
import VaultCollateral from './VaultCollateral';
import VaultConfigure from './VaultConfigure';
import VaultCreate from './VaultCreate';

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

export default function NewVault() {
  const classes = useStyles();

  const {
    state: {
      connected,
      vaultCollateral,
      vaultParams,
      treasury,
      collaterals,
      purses,
      vaultConfigured,
      vaultCreated,
      approved,
      brands,
    },
    dispatch,
    walletP,
  } = useApplicationContext();

  if (!approved) {
    return (
      <Paper className={classes.paper}>
        <div>To continue, please approve the Treasury Dapp in your wallet.</div>
      </Paper>
    );
  }

  return (
    <Paper className={classes.paper}>
      <Typography component="h1" variant="h4" align="center">
        Borrow $MOE
      </Typography>
      <VaultSteps
        connected={connected}
        vaultCollateral={vaultCollateral}
        vaultParams={vaultParams}
      />
      {connected && !vaultCollateral && (
        <VaultCollateral
          dispatch={dispatch}
          collaterals={collaterals}
          vaultParams={vaultParams}
          moeBrand={treasury && treasury.sconeBrand}
          brands={brands}
        />
      )}
      {connected && vaultCollateral && !vaultConfigured && (
        <VaultConfigure
          dispatch={dispatch}
          vaultCollateral={vaultCollateral}
          vaultParams={vaultParams}
          purses={purses}
        />
      )}
      {connected && vaultCollateral && vaultConfigured && (
        <VaultCreate
          dispatch={dispatch}
          vaultParams={vaultParams}
          walletP={walletP}
        />
      )}
      {vaultCreated && (
        <Redirect
          to={{
            pathname: '/treasury',
          }}
        />
      )}
    </Paper>
  );
}
