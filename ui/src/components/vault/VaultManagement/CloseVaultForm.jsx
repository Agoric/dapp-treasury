import React, { useState, useEffect } from 'react';
import { Redirect } from 'react-router-dom';

import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';

import { Grid } from '@material-ui/core';

import { makeStyles } from '@material-ui/core/styles';

import NatPurseAmountInput from './NatPurseAmountInput';
import ConfirmCloseDialog from './ConfirmCloseDialog';
import CloseVault from './CloseVault';

import { makeCloseVaultOffer } from './makeCloseVaultOffer';

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    marginBottom: theme.spacing(4),
    borderRadius: '20px',
    color: '#707070',
    fontSize: '22px',
    lineHeight: '27px',
    padding: theme.spacing(4),
  },
  buttons: {
    marginTop: theme.spacing(1),
  },
  button: {
    color: 'white',
  },
  title: {
    fontSize: '22px',
  },
  break: {
    border: 0,
    height: '1px',
    background: '#E5E5E5',
  },
  stepTitle: {
    fontSize: '16px',
    lineHeight: '19px',
    color: '#222222',
  },
  stepText: {
    fontSize: '15px',
    lineHeight: '18px',
    color: '#ADA9A9',
    paddingTop: theme.spacing(2),
  },
  explanation: {
    paddingRight: theme.spacing(5),
  },
  debt: {
    paddingTop: theme.spacing(5),
  },
  collateral: {
    paddingTop: theme.spacing(5),
    paddingBottom: theme.spacing(3),
  },
}));

const CloseVaultForm = ({
  purses,
  walletP,
  vaultToManageId,
  locked,
  debt,
  brandToInfo,
}) => {
  const [collateralPurseSelected, setCollateralPurseSelected] = useState(null);
  const [runPurseSelected, setRunPurseSelected] = useState(null);
  const [collateralValue, setCollateralValue] = useState(locked.value);
  const [runValue, setRunValue] = useState(debt.value);

  const [needToAddOfferToWallet, setNeedToAddOfferToWallet] = useState(false);
  const [redirect, setRedirect] = useState(false);

  const classes = useStyles();

  useEffect(() => {
    setCollateralValue(locked.value);
    setRunValue(debt.value);
  }, [locked, debt]);

  useEffect(() => {
    if (needToAddOfferToWallet) {
      makeCloseVaultOffer({
        vaultToManageId,
        walletP,
        runPurseSelected,
        runValue,
        collateralPurseSelected,
        collateralValue,
      });
      setRedirect('/vaults');
    }
    setNeedToAddOfferToWallet(false);
  }, [needToAddOfferToWallet]);

  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSubmission = wantToCloseVault => {
    setDialogOpen(false);
    // TODO: check that the purses and amounts are present

    // make offer to the wallet, the react way
    setNeedToAddOfferToWallet(wantToCloseVault);
  };

  if (redirect) {
    return <Redirect to={redirect} />;
  }
  return (
    <div>
      <ConfirmCloseDialog onClose={handleSubmission} open={dialogOpen} />
      <Paper elevation={3} className={classes.root}>
        <Typography className={classes.title}>Close Vault</Typography>
        <hr className={classes.break} />
        <div>
          <Grid container className={classes.debt}>
            <Grid item md={4} className={classes.explanation}>
              <Typography variant="h6" className={classes.stepTitle}>
                Step 1: Repay Debt
              </Typography>
              <Typography className={classes.stepText}>
                To close a vault, all debt must be repaid.
              </Typography>
            </Grid>
            <Grid item md={8}>
              <NatPurseAmountInput
                purses={purses}
                purseSelected={runPurseSelected}
                amountValue={runValue}
                onPurseChange={setRunPurseSelected}
                onAmountChange={setRunValue}
                brandToFilter={debt && debt.brand}
                brandToInfo={brandToInfo}
              />
            </Grid>
            <Grid container className={classes.collateral}>
              <Grid item md={4} className={classes.explanation}>
                <Typography variant="h6" className={classes.stepTitle}>
                  Step 2: Require collateral
                </Typography>
                <Typography className={classes.stepText}>
                  {`Select a minimum amount of collateral to be returned. If less than this amount is returned, Zoe's offer safety guarantees that you will get a full refund of the debt repaid, and your loan will not be closed.`}
                </Typography>
              </Grid>
              <Grid item md={8}>
                <NatPurseAmountInput
                  purses={purses}
                  purseSelected={collateralPurseSelected}
                  amountValue={collateralValue}
                  onPurseChange={setCollateralPurseSelected}
                  onAmountChange={setCollateralValue}
                  brandToFilter={locked && locked.brand}
                  brandToInfo={brandToInfo}
                />
              </Grid>
            </Grid>
          </Grid>
        </div>
        <hr className={classes.break} />
        <Grid
          container
          spacing={1}
          justify="flex-end"
          className={classes.buttons}
        >
          <Grid item>
            <CloseVault onClick={() => setDialogOpen(true)} />
          </Grid>
        </Grid>
      </Paper>
    </div>
  );
};

export default CloseVaultForm;
