// @ts-check

import React from 'react';
import { Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import { stringifyValue } from '@agoric/ui-components';

import AdjustVaultForm from './AdjustVaultForm';
import UnchangeableValues from './UnchangeableValues';
import ChangesTable from './ChangesTable';
import CloseVault from './CloseVault';

import { useApplicationContext } from '../../../contexts/Application';

const useStyles = makeStyles(theme => ({
  root: {
    marginBottom: theme.spacing(3),
  },
  header: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
  },
  valuesTable: {
    marginBottom: theme.spacing(3),
  },
}));

const VaultManagement = () => {
  const classes = useStyles();

  // eslint-disable-next-line no-unused-vars
  const { state, dispatch, walletP } = useApplicationContext();

  const { purses, vaults, vaultToManageId } = state;

  let vaultToManage = vaults[0];
  if (vaultToManageId) {
    vaultToManage = vaults[vaultToManageId];
  }

  console.log('vaultToManage', vaultToManage);

  // TODO: use real values
  // Hardcoded values for testing
  const amountLockedValue = 0n;
  const collateralPetname = 'aEth';

  const header = (
    <div className={classes.header}>
      <Typography variant="h3" gutterBottom>
        {collateralPetname} Vault ({stringifyValue(amountLockedValue)}
        {collateralPetname} Locked)
      </Typography>
    </div>
  );

  return (
    <div className={classes.root}>
      {header} <UnchangeableValues />
      <div className={classes.valuesTable}>
        <ChangesTable />
      </div>
      <AdjustVaultForm
        purses={purses}
        walletP={walletP}
        vaultToManageId={vaultToManageId}
      />{' '}
      <CloseVault />
    </div>
  );
};

export default VaultManagement;
