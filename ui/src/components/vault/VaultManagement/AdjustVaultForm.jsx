import React, { useState, useEffect } from 'react';
import { Redirect } from 'react-router-dom';

import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';

import SendIcon from '@material-ui/icons/Send';

import { Grid } from '@material-ui/core';

import { makeStyles } from '@material-ui/core/styles';

import { AmountMath } from '@agoric/ertp';

import NatPurseAmountInput from './NatPurseAmountInput';
import CollateralActionChoice from './CollateralActionChoice';
import DebtActionChoice from './DebtActionChoice';

import { makeAdjustVaultOffer } from './makeAdjustVaultOffer';
import ApproveOfferSB from '../../ApproveOfferSB';

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
    marginTop: theme.spacing(1),
  },
  button: {
    color: 'white',
  },
  infoText: {
    marginBottom: theme.spacing(3),
    marginTop: theme.spacing(3),
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
  adjustCollateral: {
    paddingTop: theme.spacing(5),
  },
  adjustDebt: {
    paddingTop: theme.spacing(5),
    paddingBottom: theme.spacing(3),
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
  invalidOffer,
}) => {
  // deposit, withdraw, noaction
  const [collateralAction, setCollateralAction] = useState('noaction');
  // borrow, repay, noaction
  const [debtAction, setDebtAction] = React.useState('noaction');

  const [lockedInputError, setLockedInputError] = useState(null);
  const [debtInputError, setDebtInputError] = useState(null);

  const [collateralPurseSelected, setCollateralPurseSelected] = useState(null);
  const [runPurseSelected, setRunPurseSelected] = useState(null);

  const [lockedDelta, setLockedDelta] = useState(
    AmountMath.make(locked.brand, 0n),
  );
  const [debtDelta, setDebtDelta] = useState(AmountMath.make(debt.brand, 0n));

  const [needToAddOfferToWallet, setNeedToAddOfferToWallet] = useState(false);
  const [redirect, setRedirect] = useState(false);
  const [openApproveOfferSB, setOpenApproveOfferSB] = React.useState(false);

  const resetState = () => {
    setCollateralAction('noaction');
    setDebtAction('noaction');
    setCollateralPurseSelected(null);
    setRunPurseSelected(null);
    setLockedDelta(AmountMath.make(locked.brand, 0n));
    setDebtDelta(AmountMath.make(debt.brand, 0n));
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
  ]);

  const handleSubmission = () => {
    // make offer to the wallet, the react way
    setNeedToAddOfferToWallet(true);
  };

  const updateLockedDelta = (collAction, collDelta) => {
    if (collAction === 'deposit') {
      setLockedInputError(null);
      onLockedDeltaChange(AmountMath.add(locked, collDelta));
    }
    if (collAction === 'withdraw') {
      let newAmount;
      try {
        newAmount = AmountMath.subtract(locked, collDelta);
      } catch {
        setLockedInputError('Insufficient locked balance');
        return;
      }
      setLockedInputError(null);
      onLockedDeltaChange(newAmount);
    }
  };

  const updateDebtDelta = (dAction, dDelta) => {
    if (dAction === 'borrow') {
      setDebtInputError(null);
      onDebtDeltaChange(AmountMath.add(debt, dDelta));
    }
    if (dAction === 'repay') {
      let newAmount;
      try {
        newAmount = AmountMath.subtract(debt, dDelta);
      } catch {
        setDebtInputError('Insufficient debt balance');
        return;
      }
      setDebtInputError(null);
      onDebtDeltaChange(newAmount);
    }
  };

  const handleCollateralAmountChange = value => {
    const newLockedDelta = AmountMath.make(locked.brand, value);
    setLockedDelta(newLockedDelta);
    updateLockedDelta(collateralAction, newLockedDelta);
  };

  const handleDebtAmountChange = value => {
    const newDebtDelta = AmountMath.make(debt.brand, value);
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
      <Paper elevation={3} className={classes.root}>
        <Typography className={classes.title}>Adjust Vault</Typography>
        <hr className={classes.break} />
        <Grid container>
          <Grid container className={classes.adjustCollateral}>
            <Grid item md={4} className={classes.explanation}>
              <Typography variant="h6" className={classes.stepTitle}>
                Step 1: Adjust Collateral
              </Typography>
              <Typography className={classes.stepText}>
                Deposit additional collateral or withdraw your existing
                collateral. Select No Action to leave collateral unchanged.
              </Typography>
            </Grid>
            <Grid item md={8}>
              <CollateralActionChoice
                collateralAction={collateralAction}
                setCollateralAction={handleCollateralAction}
              />
              <NatPurseAmountInput
                error={lockedInputError}
                purses={purses}
                purseSelected={collateralPurseSelected}
                amountValue={lockedDelta && lockedDelta.value}
                onPurseChange={setCollateralPurseSelected}
                onAmountChange={handleCollateralAmountChange}
                brandToFilter={locked && locked.brand}
                brandToInfo={brandToInfo}
              />
            </Grid>
          </Grid>
          <Grid container className={classes.adjustDebt}>
            <Grid item md={4} className={classes.explanation}>
              <Typography variant="h6" className={classes.stepTitle}>
                Step 2: Adjust Debt
              </Typography>
              <Typography className={classes.stepText}>
                Borrow additional RUN or repay your existing RUN debt. Select No
                Action to leave debt unchanged.
              </Typography>
            </Grid>
            <Grid item md={8}>
              <DebtActionChoice
                debtAction={debtAction}
                setDebtAction={handleDebtAction}
              />
              <NatPurseAmountInput
                error={debtInputError}
                purses={purses}
                purseSelected={runPurseSelected}
                amountValue={debtDelta && debtDelta.value}
                onPurseChange={setRunPurseSelected}
                onAmountChange={handleDebtAmountChange}
                brandToFilter={debt && debt.brand}
                brandToInfo={brandToInfo}
              />
            </Grid>
          </Grid>
        </Grid>
        <hr className={classes.break} />
        <Grid
          container
          spacing={1}
          className={classes.buttons}
          justify="flex-end"
        >
          <Grid item>
            <Button onClick={() => setRedirect('/treasury')}>Cancel</Button>
          </Grid>
          <Grid item>
            <Button
              className={classes.button}
              variant="contained"
              color="primary"
              disabled={
                invalidOffer ||
                debtInputError !== null ||
                lockedInputError !== null
              }
              startIcon={<SendIcon />}
              onClick={handleSubmission}
            >
              Make Offer
            </Button>
          </Grid>
        </Grid>
      </Paper>
      <ApproveOfferSB
        open={openApproveOfferSB}
        handleClose={handleApproveOfferSBClose}
      />
    </div>
  );
};

export default AdjustVaultForm;
