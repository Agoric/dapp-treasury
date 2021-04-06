import React, { useState } from 'react';

import { Redirect } from 'react-router-dom';

import { makeStyles } from '@material-ui/core/styles';

import Paper from '@material-ui/core/Paper';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';

import { Typography } from '@material-ui/core';
import { useApplicationContext } from '../contexts/Application';

import { VaultSummary } from './VaultSummary';
import ErrorBoundary from './ErrorBoundary';

import { setVaultToManageId } from '../store';

const useStyles = makeStyles(theme => {
  return {
    card: {
      paddingLeft: theme.spacing(2),
      marginBottom: theme.spacing(2),
    },
    loading: {
      padding: theme.spacing(3),
      marginTop: theme.spacing(2),
    },
    grid: {
      marginTop: theme.spacing(2),
    },
    button: {
      marginRight: theme.spacing(1),
      marginBottom: theme.spacing(1),
    },
  };
});

function VaultList() {
  const classes = useStyles();
  const {
    state: { vaults, brandToInfo },
    dispatch,
  } = useApplicationContext();

  const [redirect, setRedirect] = useState(false);

  const handleOnClick = key => {
    dispatch(setVaultToManageId(key));
    setRedirect('/manageVault');
  };

  if (redirect) {
    return <Redirect to={redirect} />;
  }

  const vaultsList = Object.entries(vaults);

  if (vaultsList.length <= 0) {
    return (
      <Paper className={classes.loading}>
        <Typography>Loading vault information.</Typography>
      </Paper>
    );
  }

  const makeButtons = (key, vaultData) => {
    // TODO: use a less fragile way of keeping track of a loan status
    const canManage = vaultData.status === 'Loan Initiated';
    return (
      <CardActions>
        <Grid container justify="flex-end">
          <Grid item className={classes.button}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleOnClick(key)}
              disabled={!canManage}
            >
              Manage Vault
            </Button>
          </Grid>
        </Grid>
      </CardActions>
    );
  };

  return (
    <div>
      <ErrorBoundary>
        <Grid container className={classes.grid}>
          {vaultsList.map(([key, v]) => (
            <Grid key={key} className={classes.card}>
              <Card key={key}>
                <CardContent>
                  <VaultSummary
                    vault={v}
                    id={key}
                    brandToInfo={brandToInfo}
                  ></VaultSummary>
                </CardContent>
                {makeButtons(key, v)}
              </Card>
            </Grid>
          ))}
        </Grid>
      </ErrorBoundary>
    </div>
  );
}

export default VaultList;
