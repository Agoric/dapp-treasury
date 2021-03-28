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

const AdjustVaultForm = ({ purses, walletP, vaultToManageId }) => {
  const offerBeingMade = false;

  // deposit, withdraw, noaction
  const [collateralAction, setCollateralAction] = useState('noaction');
  // borrow, repay, noaction
  const [debtAction, setDebtAction] = React.useState('noaction');

  const [collateralPurseSelected, setCollateralPurseSelected] = useState(null);
  const [moePurseSelected, setMoePurseSelected] = useState(null);
  const [collateralValue, setCollateralValue] = useState(0n);
  const [moeValue, setMoeValue] = useState(0n);

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
        moePurseSelected,
        moeValue,
        collateralPurseSelected,
        collateralValue,
        collateralAction,
        debtAction,
      });
      // dispatch(setOfferBeingMade(true));
    }
    setNeedToAddOfferToWallet(false);
  }, [
    needToAddOfferToWallet,
    collateralPurseSelected,
    collateralValue,
    moePurseSelected,
    moeValue,
    offerBeingMade,
  ]);

  const handleSubmission = () => {
    // TODO: check that the purses and amounts are present

    // make offer to the wallet, the react way
    setNeedToAddOfferToWallet(true);
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
              amountValue={collateralValue}
              onPurseChange={setCollateralPurseSelected}
              onAmountChange={setCollateralValue}
            />
          </Grid>
          <DebtActionChoice
            debtAction={debtAction}
            setDebtAction={setDebtAction}
          />
          <NatPurseAmountInput
            offerBeingMade={offerBeingMade}
            purses={purses}
            purseSelected={moePurseSelected}
            amountValue={moeValue}
            onPurseChange={setMoePurseSelected}
            onAmountChange={setMoeValue}
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
