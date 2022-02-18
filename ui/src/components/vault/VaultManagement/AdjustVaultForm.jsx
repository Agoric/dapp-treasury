import React, { useEffect, useState } from 'react';
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
  brandToInfo,
  invalidOffer,
  collateralAction,
  setCollateralAction,
  debtAction,
  setDebtAction,
  lockedInputError,
  debtInputError,
  lockedDelta,
  setLockedDelta,
  debtDelta,
  setDebtDelta,
  lockedBrand,
  debtBrand,
  makeOffer,
  collateralPurseSelected,
  setCollateralPurseSelected,
  runPurseSelected,
  setRunPurseSelected,
}) => {
  const classes = useStyles();
  const [redirect, setRedirect] = useState(false);
  const [offerButtonDisabled, setOfferButtonDisabled] = useState(true);

  const handleCollateralAmountChange = value => {
    const newLockedDelta = AmountMath.make(lockedBrand, value);
    setLockedDelta(newLockedDelta);
  };

  const handleDebtAmountChange = value => {
    const newDebtDelta = AmountMath.make(debtBrand, value);
    setDebtDelta(newDebtDelta);
  };

  useEffect(() => {
    if (invalidOffer || debtInputError || lockedInputError) {
      setOfferButtonDisabled(true);
      return;
    }
    if (collateralAction === 'noaction' && debtAction === 'noaction') {
      // No actions should be taken
      setOfferButtonDisabled(true);
      return;
    }
    if (collateralAction === 'deposit' || collateralAction === 'withdraw') {
      // We are taking a collateral action, and should have a
      // collateralPurseSelected and lockedDelta
      if (!(collateralPurseSelected && lockedDelta && lockedDelta.value)) {
        setOfferButtonDisabled(true);
        return;
      }
    }
    if (debtAction === 'borrow' || debtAction === 'repay') {
      // We are taking a debt action, and should have a
      // runPurseSelected and debtDelta
      if (!(runPurseSelected && debtDelta && debtDelta.value)) {
        setOfferButtonDisabled(true);
        return;
      }
    }

    setOfferButtonDisabled(false);
  }, [
    invalidOffer,
    debtInputError,
    lockedInputError,
    collateralAction,
    debtAction,
    lockedDelta,
    debtDelta,
  ]);

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
                setCollateralAction={setCollateralAction}
              />
              <NatPurseAmountInput
                error={lockedInputError}
                purses={purses}
                purseSelected={collateralPurseSelected}
                amountValue={lockedDelta && lockedDelta.value}
                onPurseChange={setCollateralPurseSelected}
                onAmountChange={handleCollateralAmountChange}
                brandToFilter={lockedBrand}
                brandToInfo={brandToInfo}
                purseSelectorDisabled={collateralAction === 'noaction'}
                amountInputDisabled={collateralAction === 'noaction'}
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
                setDebtAction={setDebtAction}
              />
              <NatPurseAmountInput
                error={debtInputError}
                purses={purses}
                purseSelected={runPurseSelected}
                amountValue={debtDelta && debtDelta.value}
                onPurseChange={setRunPurseSelected}
                onAmountChange={handleDebtAmountChange}
                brandToFilter={debtBrand}
                brandToInfo={brandToInfo}
                purseSelectorDisabled={debtAction === 'noaction'}
                amountInputDisabled={debtAction === 'noaction'}
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
            <Button onClick={() => setRedirect('/vaults')}>Cancel</Button>
          </Grid>
          <Grid item>
            <Button
              className={classes.button}
              variant="contained"
              color="primary"
              disabled={offerButtonDisabled}
              startIcon={<SendIcon />}
              onClick={makeOffer}
            >
              Make Offer
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </div>
  );
};

export default AdjustVaultForm;
