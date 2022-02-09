import React, { useState } from 'react';

import { Redirect } from 'react-router-dom';

import { makeStyles } from '@material-ui/core/styles';

import Paper from '@material-ui/core/Paper';
import Card from '@material-ui/core/Card';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
import Alert from '@material-ui/lab/Alert';

import { CircularProgress, Typography } from '@material-ui/core';
import { useApplicationContext } from '../contexts/Application';

import { VaultSummary } from './VaultSummary';
import ErrorBoundary from './ErrorBoundary';

import { setVaultToManageId, setLoadTreasuryError } from '../store';

const useStyles = makeStyles(theme => {
  return {
    root: {
      width: 'fit-content',
      margin: 'auto',
    },
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
    gridCard: {
      paddingLeft: theme.spacing(2),
      marginBottom: theme.spacing(2),
    },
    card: {
      width: '350px',
    },
    loading: {
      padding: theme.spacing(3),
      marginTop: theme.spacing(2),
    },
    grid: {
      marginTop: theme.spacing(2),
      justifyContent: 'center',
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
    state: { approved, vaults, brandToInfo, loadTreasuryError },
    dispatch,
    retrySetup,
  } = useApplicationContext();

  const vaultsList = Object.entries(vaults ?? {});
  const [redirect, setRedirect] = useState(false);

  const handleOnClick = key => {
    dispatch(setVaultToManageId(key));
    setRedirect('/manageVault');
  };

  const onRetryClicked = () => {
    dispatch(setLoadTreasuryError(null));
    retrySetup();
  };

  const loadTreasuryErrorAlert = (
    <div className={classes.root}>
      <Paper className={classes.paper}>
        <Alert
          action={
            <Button onClick={onRetryClicked} color="inherit" size="small">
              Retry
            </Button>
          }
          severity="error"
        >
          A problem occured while loading your vaults — make sure you have RUN
          in your Zoe fees purse.
        </Alert>
      </Paper>
    </div>
  );

  if (redirect) {
    return <Redirect to={redirect} />;
  }

  if (!approved) {
    return (
      <div className={classes.root}>
        <Paper className={classes.paper}>
          <div>
            To continue, please approve the VaultFactory Dapp in your wallet.
          </div>
        </Paper>
      </div>
    );
  }

  if (loadTreasuryError) {
    return loadTreasuryErrorAlert;
  }

  if (vaults === null) {
    return (
      <div className={classes.root}>
        <CircularProgress style={{ marginTop: 48 }} />
      </div>
    );
  }

  if (vaultsList.length === 0) {
    return (
      <div className={classes.root}>
        <Paper className={classes.loading}>
          <Typography>No vaults available yet</Typography>
        </Paper>
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <ErrorBoundary>
        <Grid container className={classes.grid} alignItems="stretch">
          {vaultsList.map(([key, v]) => {
            const canManage = v.status === 'Loan Initiated';
            return (
              <Grid item key={key} className={classes.gridCard}>
                <Card key={key} className={classes.card}>
                  <CardContent>
                    <VaultSummary
                      vault={v}
                      id={key}
                      brandToInfo={brandToInfo}
                    ></VaultSummary>
                  </CardContent>
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
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </ErrorBoundary>
    </div>
  );
}

export default VaultList;
