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

  const classes = useStyles();

  useEffect(() => {
    const bothNoAction =
      collateralAction === 'noaction' && debtAction === 'noaction';
    if (needToAddOfferToWallet && !bothNoAction) {
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
      // dispatch(setOfferBeingMade(true));
    }
    setNeedToAddOfferToWallet(false);
  }, [
    needToAddOfferToWallet,
    collateralPurseSelected,
    lockedDelta,
    runPurseSelected,
    debtDelta,
    offerBeingMade,
  ]);

  const handleSubmission = () => {
    // TODO: check that the purses and amounts are present

    // make offer to the wallet, the react way
    setNeedToAddOfferToWallet(true);
  };

  const handleCollateralAmountChange = value => {
    const newLockedDelta = amountMath.make(value, locked.brand);
    setLockedDelta(newLockedDelta);
    let newLockedAfterDelta = locked;
    if (collateralAction === 'deposit') {
      newLockedAfterDelta = amountMath.add(locked, newLockedDelta);
    }
    if (collateralAction === 'withdraw') {
      newLockedAfterDelta = amountMath.subtract(locked, newLockedDelta);
    }
    onLockedDeltaChange(newLockedAfterDelta);
  };

  const handleDebtAmountChange = value => {
    const newDebtDelta = amountMath.make(value, debt.brand);
    setDebtDelta(newDebtDelta);
    let newDebtAfterDelta = debt;
    if (debtAction === 'borrow') {
      newDebtAfterDelta = amountMath.add(debt, newDebtDelta);
    }
    if (debtAction === 'repay') {
      newDebtAfterDelta = amountMath.subtract(debt, newDebtAfterDelta);
    }
    onDebtDeltaChange(newDebtAfterDelta);
  };

  if (redirect) {
    return <Redirect to={redirect} />;
  }
  return (
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
            setCollateralAction={setCollateralAction}
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
            setDebtAction={setDebtAction}
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
  );
};

export default AdjustVaultForm;
