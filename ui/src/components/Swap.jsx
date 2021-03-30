import React from 'react';

import { makeStyles } from '@material-ui/core/styles';

import {
  Button,
  Grid,
  Paper,
  Typography,
  IconButton,
  InputLabel,
} from '@material-ui/core';
import ArrowDownIcon from '@material-ui/icons/ArrowDownward';

import AssetInput from './AssetInput';
import Steps from './Steps';

import { displayPetname } from './helpers';

import { useApplicationContext } from '../contexts/Application';
import {
  setInputPurse,
  setOutputPurse,
  setInputAmount,
  setOutputAmount,
  swapInputs,
  setInputChanged,
  setOutputChanged,
} from '../store';

import { makeSwapOffer } from '../contexts/makeSwapOffer';

const useStyles = makeStyles(theme => ({
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
  grid: {
    padding: theme.spacing(2),
  },
  message: {
    marginTop: theme.spacing(2),
    minHeight: theme.spacing(2),
  },
  buttons: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  button: {
    marginTop: theme.spacing(3),
  },
}));

/* eslint-disable complexity */
export default function Swap(walletP) {
  const classes = useStyles();
  const { state, dispatch } = useApplicationContext();
  const {
    purses,
    inputPurse = {},
    outputPurse = {},
    inputAmount,
    outputAmount,
    connected,
  } = state;

  // const purses = [
  //   { name: 'Marketing', value: 230, brandPetname: 'simolean' },
  //   { name: 'Operating Account', value: 194, brandPetname: 'moola' },
  //   { name: 'Savings', value: 3500, brandPetname: 'moola ' },
  //   { name: 'Concert Tickets', value: 64, brandPetname: 'tickets' },
  // ];

  const inputAmountError =
    inputAmount < 0 || (inputPurse && inputAmount > inputPurse.value);
  const outputAmountError = outputAmount < 0;

  const pursesError =
    inputPurse && outputPurse && inputPurse.brand === outputPurse.brand;

  const hasError = pursesError || inputAmountError || outputAmountError;

  const isValid =
    !hasError &&
    inputPurse &&
    outputPurse &&
    inputAmount > 0 &&
    outputAmount > 0;

  function handleChangeInputPurse(purse) {
    dispatch(setInputPurse(purse));
  }

  function handleChangeOutputPurse(purse) {
    dispatch(setOutputPurse(purse));
  }

  function handleChangeInputAmount(amount) {
    dispatch(setInputAmount(amount));
    dispatch(setInputChanged(true));
  }

  function handleChangeOutputAmount(amount) {
    dispatch(setOutputAmount(amount));
    dispatch(setOutputChanged(true));
  }

  function handleswapInputs() {
    dispatch(swapInputs());
  }

  function getExchangeRate(decimal) {
    if (isValid) {
      const inputDecimalPlaces = inputPurse.displayInfo.decimalPlaces || 0;
      const outputDecimalPlaces = outputPurse.displayInfo.decimalPlaces || 0;
      const scale = 10 ** (inputDecimalPlaces - outputDecimalPlaces);
      const exchangeRate = ((outputAmount * scale) / inputAmount).toFixed(
        decimal,
      );
      return `Exchange rate: 1 ${displayPetname(
        inputPurse.brandPetname,
      )} = ${exchangeRate} ${displayPetname(outputPurse.brandPetname)}`;
    }
    return '';
  }

  function handleSwap() {
    makeSwapOffer(
      walletP,
      dispatch,
      inputPurse,
      inputAmount,
      outputPurse,
      outputAmount,
    );
  }

  return (
    <Paper className={classes.paper}>
      <Typography component="h1" variant="h4" align="center">
        Swap
      </Typography>

      <Steps
        connected={connected}
        inputPurse={inputPurse}
        outputPurse={outputPurse}
        inputAmount={inputAmount}
        outputAmount={outputAmount}
      />

      <Grid
        container
        direction="column"
        alignItems="center"
        spacing={3}
        className={classes.grid}
      >
        <AssetInput
          title="Input"
          purses={purses}
          onPurseChange={handleChangeInputPurse}
          onAmountChange={handleChangeInputAmount}
          purse={inputPurse}
          amount={inputAmount}
          disabled={!connected}
          purseError={pursesError}
          amountError={inputAmountError}
        />

        <IconButton
          size="medium"
          onClick={handleswapInputs}
          disabled={!connected}
        >
          <ArrowDownIcon />
        </IconButton>

        <AssetInput
          title="Output"
          purses={purses}
          onPurseChange={handleChangeOutputPurse}
          onAmountChange={handleChangeOutputAmount}
          purse={outputPurse}
          amount={outputAmount}
          disabled={!connected}
          purseError={pursesError}
          amountError={outputAmountError}
        />
        <InputLabel className={classes.message}>
          {connected && isValid && getExchangeRate(4)}
        </InputLabel>
      </Grid>
      <div className={classes.buttons}>
        <Button
          variant="contained"
          color="primary"
          className={classes.button}
          disabled={!connected || !isValid}
          onClick={handleSwap}
        >
          Swap
        </Button>
      </div>
    </Paper>
  );
}
/* eslint-enable complexity */
