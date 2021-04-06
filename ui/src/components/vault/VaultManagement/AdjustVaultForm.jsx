import React, { useState, useEffect } from 'react';
import { Redirect } from 'react-router-dom';

import Paper from '@material-ui/core/Paper';
import AppBar from '@material-ui/core/AppBar';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';

import Toolbar from '@material-ui/core/Toolbar';
import TuneIcon from '@material-ui/icons/Tune';
import DeleteIcon from '@material-ui/icons/Delete';
import SendIcon from '@material-ui/icons/Send';

import { Grid, Container } from '@material-ui/core';

import { makeStyles } from '@material-ui/core/styles';

import { amountMath } from '@agoric/ertp';

import NatPurseAmountInput from './NatPurseAmountInput';
import CollateralActionChoice from './CollateralActionChoice';
import DebtActionChoice from './DebtActionChoice';

import { makeAdjustVaultOffer } from './makeAdjustVaultOffer';
import ApproveOfferSB from '../../ApproveOfferSB';

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
  },
  content: {
    margin: theme.spacing(3),
    paddingBottom: theme.spacing(3),
  },
  settingsToolbar: {
    minHeight: '48px',
    paddingLeft: '20px',
  },
  toolbarIcon: {
    marginRight: theme.spacing(1),
  },
  buttons: {
    marginTop: theme.spacing(3),
  },
  button: {
    color: 'white',
  },
  infoText: {
    marginBottom: theme.spacing(3),
    marginTop: theme.spacing(3),
  },
}));

const AdjustVaultForm = ({
  purses,
  walletP,
  vaultToManageId,
  locked,
  debt,
  onLockedDeltaChange,
  onDebtDeltaChange,
  brandToInfo,
}) => {
  const offerBeingMade = false;

  // deposit, withdraw, noaction
  const [collateralAction, setCollateralAction] = useState('noaction');
  // borrow, repay, noaction
  const [debtAction, setDebtAction] = React.useState('noaction');

  const [collateralPurseSelected, setCollateralPurseSelected] = useState(null);
  const [runPurseSelected, setRunPurseSelected] = useState(null);

  const [lockedDelta, setLockedDelta] = useState(
    amountMath.make(0n, locked.brand),
  );
  const [debtDelta, setDebtDelta] = useState(amountMath.make(0n, debt.brand));

  const [needToAddOfferToWallet, setNeedToAddOfferToWallet] = useState(false);
  const [redirect, setRedirect] = useState(false);
  const [openApproveOfferSB, setOpenApproveOfferSB] = React.useState(false);

  const resetState = () => {
    setCollateralAction('noaction');
    setDebtAction('noaction');
    setCollateralPurseSelected(null);
    setRunPurseSelected(null);
    setLockedDelta(amountMath.make(0n, locked.brand));
    setDebtDelta(amountMath.make(0n, debt.brand));
    setNeedToAddOfferToWallet(false);
    setRedirect(false);
  };

  const handleApproveOfferSBClose = () => {
    setOpenApproveOfferSB(false);
  };

  const classes = useStyles();

  useEffect(() => {
    if (needToAddOfferToWallet) {
      setNeedToAddOfferToWallet(false);

      if (collateralAction === 'noaction' && debtAction === 'noaction') {
        // No actions should be taken
        return;
      }
      if (collateralAction === 'deposit' || collateralAction === 'withdraw') {
        // We are taking a collateral action, and should have a
        // collateralPurseSelected and lockedDelta
        if (!(collateralPurseSelected && lockedDelta && lockedDelta.value)) {
          return;
        }
      }
      if (debtAction === 'borrow' || debtAction === 'repay') {
        // We are taking a debt action, and should have a
        // runPurseSelected and debtDelta
        if (!(runPurseSelected && debtDelta && debtDelta.value)) {
          return;
        }
      }
      makeAdjustVaultOffer({
        vaultToManageId,
        walletP,
        runPurseSelected,
        runValue: debtDelta && debtDelta.value,
        collateralPurseSelected,
        collateralValue: lockedDelta && lockedDelta.value,
        collateralAction,
        debtAction,
      });
      resetState();
      setOpenApproveOfferSB(true);
    }
  }, [
    needToAddOfferToWallet,
    collateralPurseSelected,
    lockedDelta,
    runPurseSelected,
    debtDelta,
    offerBeingMade,
  ]);

  const handleSubmission = () => {
    // make offer to the wallet, the react way
    setNeedToAddOfferToWallet(true);
  };

  const updateLockedDelta = (collAction, collDelta) => {
    if (collAction === 'deposit') {
      onLockedDeltaChange(amountMath.add(locked, collDelta));
    }
    if (collAction === 'withdraw') {
      onLockedDeltaChange(amountMath.subtract(locked, collDelta));
    }
  };

  const updateDebtDelta = (dAction, dDelta) => {
    if (dAction === 'borrow') {
      onDebtDeltaChange(amountMath.add(debt, dDelta));
    }
    if (dAction === 'repay') {
      onDebtDeltaChange(amountMath.subtract(debt, dDelta));
    }
  };

  const handleCollateralAmountChange = value => {
    const newLockedDelta = amountMath.make(value, locked.brand);
    setLockedDelta(newLockedDelta);
    updateLockedDelta(collateralAction, newLockedDelta);
  };

  const handleDebtAmountChange = value => {
    const newDebtDelta = amountMath.make(value, debt.brand);
    setDebtDelta(newDebtDelta);
    updateDebtDelta(debtAction, newDebtDelta);
  };

  const handleCollateralAction = value => {
    // if the collateral action changes, rerun the logic for sending
    // the newLockedAfterDelta
    setCollateralAction(value);
    updateLockedDelta(value, lockedDelta);
  };

  const handleDebtAction = value => {
    // if the debt action changes, rerun the logic for sending
    // the newDebtAfterDelta
    setDebtAction(value);
    updateDebtDelta(value, debtDelta);
  };

  if (redirect) {
    return <Redirect to={redirect} />;
  }
  return (
    <div>
      <Paper elevation={3}>
        <div className={classes.root}>
          <AppBar position="static">
            <Toolbar className={classes.settingsToolbar}>
              <TuneIcon className={classes.toolbarIcon} />
              <Typography variant="h6">Adjust Vault</Typography>
            </Toolbar>
          </AppBar>
        </div>
        <Container maxWidth="sm" className={classes.content}>
          <div className={classes.root}>
            <CollateralActionChoice
              collateralAction={collateralAction}
              setCollateralAction={handleCollateralAction}
            />
            <Grid container>
              <NatPurseAmountInput
                offerBeingMade={offerBeingMade}
                purses={purses}
                purseSelected={collateralPurseSelected}
                amountValue={lockedDelta && lockedDelta.value}
                onPurseChange={setCollateralPurseSelected}
                onAmountChange={handleCollateralAmountChange}
                brandToFilter={locked && locked.brand}
                brandToInfo={brandToInfo}
              />
            </Grid>
            <DebtActionChoice
              debtAction={debtAction}
              setDebtAction={handleDebtAction}
            />
            <NatPurseAmountInput
              offerBeingMade={offerBeingMade}
              purses={purses}
              purseSelected={runPurseSelected}
              amountValue={debtDelta && debtDelta.value}
              onPurseChange={setRunPurseSelected}
              onAmountChange={handleDebtAmountChange}
              brandToFilter={debt && debt.brand}
              brandToInfo={brandToInfo}
            />
          </div>
          <Grid container spacing={1} className={classes.buttons}>
            <Grid item>
              <Button
                className={classes.button}
                variant="contained"
                color="secondary"
                disabled={offerBeingMade}
                startIcon={<DeleteIcon />}
                onClick={() => setRedirect('/treasury')}
              >
                Cancel
              </Button>
            </Grid>
            <Grid item>
              <Button
                className={classes.button}
                variant="contained"
                color="secondary"
                disabled={offerBeingMade}
                startIcon={<SendIcon />}
                onClick={handleSubmission}
              >
                Make Offer
              </Button>
            </Grid>
          </Grid>
        </Container>
      </Paper>
      <ApproveOfferSB
        open={openApproveOfferSB}
        handleClose={handleApproveOfferSBClose}
      />
    </div>
  );
};

export default AdjustVaultForm;
