import React from 'react';
import { Redirect } from 'react-router-dom';

import { makeStyles } from '@material-ui/core/styles';

import { Paper, Typography } from '@material-ui/core';

import VaultSteps from './VaultSteps';

import { useApplicationContext } from '../../contexts/Application';
import VaultCollateral from './VaultCollateral';
import VaultConfigure from './VaultConfigure/VaultConfigure';
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
      treasury,
      collaterals,
      purses,
      vaultConfiguration,
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

  const getCurrentVaultCreationStep = () => {
    if (!vaultCollateral) {
      // User needs to choose which collateral brand to use in their loan
      return (
        <VaultCollateral
          dispatch={dispatch}
          collaterals={collaterals}
          brands={brands}
        />
      );
    }
    if (!vaultConfiguration) {
      // User needs to configure their vault and choose the amount of
      // debt
      return (
        <VaultConfigure
          dispatch={dispatch}
          vaultCollateral={vaultCollateral}
          purses={purses}
          moeBrand={treasury.sconeBrand}
        />
      );
    }
    if (!vaultCreated) {
      // User needs to confirm the vault configuration
      return (
        <VaultCreate
          dispatch={dispatch}
          vaultConfiguration={vaultConfiguration}
          walletP={walletP}
        />
      );
    }
    // Vault has been created, so redirect to the page showing open vaults
    return (
      <Redirect
        to={{
          pathname: '/treasury',
        }}
      />
    );
  };

  return (
    <Paper className={classes.paper}>
      <Typography component="h1" variant="h4" align="center">
        Borrow $MOE
      </Typography>
      <VaultSteps
        connected={connected}
        vaultCollateral={vaultCollateral}
        vaultConfiguration={vaultConfiguration}
      />
      {getCurrentVaultCreationStep()}
    </Paper>
  );
}
