import React, { useEffect, useState } from 'react';
import { Redirect } from 'react-router-dom';

import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';

import { Grid, Button, Container } from '@material-ui/core';
import DeleteIcon from '@material-ui/icons/Delete';
import SendIcon from '@material-ui/icons/Send';

import { E } from '@agoric/eventual-send';

import NatPurseAmountInput from './NatPurseAmountInput';

import dappConstants from '../../../generated/defaults.js';

const { INSTALLATION_BOARD_ID, INSTANCE_BOARD_ID } = dappConstants;

const useStyles = makeStyles(theme => ({
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

const DepositCollateral = ({
  walletP,
  vaultToManageId,
  purses,
  offerBeingMade,
}) => {
  const [collateralPurseSelected, setCollateralPurseSelected] = useState(null);
  const [moePurseSelected, setMoePurseSelected] = useState(null);
  const [collateralValue, setCollateralValue] = useState(0n);
  const [moeValue, setMoeValue] = useState(0n);
  const [needToAddOfferToWallet, setNeedToAddOfferToWallet] = useState(false);
  const [redirect, setRedirect] = useState(false);

  useEffect(() => {
    if (needToAddOfferToWallet) {
      const id = `${Date.now()}`;

      let want = {};

      if (moeValue > 0n) {
        want = {
          Scones: {
            pursePetname: moePurseSelected.pursePetname,
            value: moeValue,
          },
        };
      }

      const offerConfig = {
        id,
        continuingInvitation: {
          priorOfferId: vaultToManageId,
          description: 'adjustBalances',
        },
        installationHandleBoardId: INSTALLATION_BOARD_ID,
        instanceHandleBoardId: INSTANCE_BOARD_ID,
        proposalTemplate: {
          give: {
            Collateral: {
              // The pursePetname identifies which purse we want to use
              pursePetname: collateralPurseSelected.pursePetname,
              value: collateralValue,
            },
          },
          want,
        },
      };
      E(walletP).addOffer(offerConfig);
      setNeedToAddOfferToWallet(false);
      // dispatch(setOfferBeingMade(true));
    }
  }, [
    needToAddOfferToWallet,
    collateralPurseSelected,
    collateralValue,
    moePurseSelected,
    moeValue,
    offerBeingMade,
  ]);

  const classes = useStyles();

  if (redirect) {
    return <Redirect to={redirect} />;
  }
  return (
    <Container maxWidth="sm">
      <Grid container>
        <Grid container>
          <Typography className={classes.infoText}>
            Choose the purse to use and amount of collateral to deposit.
          </Typography>
        </Grid>
        <Grid container>
          <NatPurseAmountInput
            offerBeingMade={offerBeingMade}
            purses={purses}
            purseSelected={collateralPurseSelected}
            onPurseChange={setCollateralPurseSelected}
            onAmountChange={setCollateralValue}
          />
          <Typography className={classes.infoText}>
            Optionally, choose some Moe to withdraw.
          </Typography>
          <NatPurseAmountInput
            offerBeingMade={offerBeingMade}
            purses={purses}
            purseSelected={moePurseSelected}
            onPurseChange={setMoePurseSelected}
            onAmountChange={setMoeValue}
          />

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
                onClick={() => setNeedToAddOfferToWallet(true)}
              >
                Make Offer
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DepositCollateral;
