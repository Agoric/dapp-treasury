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
    state: { approved, vaults, brandToInfo },
    dispatch,
  } = useApplicationContext();

  const [redirect, setRedirect] = useState(false);
  const vaultsList = Object.entries(vaults);

  const handleOnClick = key => {
    dispatch(setVaultToManageId(key));
    setRedirect('/manageVault');
  };

  if (redirect) {
    return <Redirect to={redirect} />;
  }

  if (!approved) {
    return (
      <Paper className={classes.paper}>
        <div>To continue, please approve the Treasury Dapp in your wallet.</div>
      </Paper>
    );
  }

  if (vaultsList.length <= 0) {
    return (
      <Paper className={classes.loading}>
        <Typography>No vaults available yet</Typography>
      </Paper>
    );
  }

  return (
    <div>
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
