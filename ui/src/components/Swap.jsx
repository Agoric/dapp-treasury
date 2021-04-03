import { React, useState, useEffect } from 'react';
import { E } from '@agoric/captp';

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
import ErrorBoundary from './ErrorBoundary';

import { displayPetname } from './helpers';

import { useApplicationContext } from '../contexts/Application';

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
export default function Swap() {
  const classes = useStyles();
  const { state, dispatch, ammPublicFacet, walletP } = useApplicationContext();
  const { purses, connected } = state;

  const [inputPurse, setInputPurse] = useState(null);
  const [outputPurse, setOutputPurse] = useState(null);

  const [{ inputAmount, outputAmount }, setAmounts] = useState({
    inputAmount: null,
    outputAmount: null,
  });

  const [quoteRequest, setQuoteRequest] = useState(null);

  console.log('ALL', {
    purses,
    inputPurse,
    outputPurse,
    inputAmount,
    outputAmount,
    connected,
  });

  // Log the pool information for debugging purposes
  useEffect(() => {
    if (inputPurse && inputPurse.brand) {
      E(ammPublicFacet)
        .getPoolAllocation(inputPurse.brand)
        .then(alloc => console.log('INPUT allocation', alloc))
        .catch(_ => {});
    }
  }, [inputPurse]);
  useEffect(() => {
    if (outputPurse && outputPurse.brand) {
      E(ammPublicFacet)
        .getPoolAllocation(outputPurse.brand)
        .then(alloc => console.log('OUTPUT allocation', alloc))
        .catch(_ => {});
    }
  }, [outputPurse]);

  // one block here triggering cannot retrigger because it only changes
  // the amount that it does not depend on
  useEffect(() => {
    if (quoteRequest === 'output' && inputPurse && outputPurse) {
      if (inputAmount === 0n) {
        setAmounts({ inputAmount, outputAmount: null });
        return;
      }
      const amountIn = { brand: inputPurse.brand, value: inputAmount };
      const brandOut = outputPurse.brand;
      console.log('QUOTE REQUEST input', amountIn, outputPurse, brandOut);
      // TODO add debounce to this
      E(ammPublicFacet)
        .getInputPrice(amountIn, brandOut)
        .then(output => {
          console.log('QUOTED input', amountIn, output);
          setAmounts(amounts =>
            amounts.inputAmount === inputAmount
              ? { inputAmount, outputAmount: output.value }
              : amounts,
          );
        })
        .catch(e => {
          console.log('QUOTED input ERROR', e);
        });
    }
  }, [inputPurse, outputPurse, quoteRequest]);

  useEffect(() => {
    if (quoteRequest === 'input' && inputPurse && outputPurse) {
      if (outputAmount === 0n) {
        setAmounts({ inputAmount: null, outputAmount });
        return;
      }
      const brandIn = inputPurse.brand;
      const amountOut = { brand: outputPurse.brand, value: outputAmount };
      console.log('QUOTE REQUEST output', amountOut, inputPurse, brandIn);
      // TODO add debounce to this
      E(ammPublicFacet)
        .getOutputPrice(amountOut, brandIn)
        .then(input => {
          console.log('QUOTED output', amountOut, input);
          setAmounts(amounts =>
            amounts.outputAmount === outputAmount
              ? { outputAmount, inputAmount: input.value }
              : amounts,
          );
        })
        .catch(e => {
          console.log('QUOTED input ERROR', e);
        });
    }
  }, [inputPurse, outputPurse, quoteRequest]);

  const inputAmountError =
    inputAmount < 0n || (inputPurse && inputAmount > inputPurse.value);
  const outputAmountError = outputAmount < 0n;

  const pursesError =
    inputPurse && outputPurse && inputPurse.brand === outputPurse.brand;

  const hasError = pursesError || inputAmountError || outputAmountError;

  const isValid =
    !hasError &&
    inputPurse &&
    outputPurse &&
    inputAmount > 0n &&
    outputAmount > 0n;

  function handleChangeInputPurse(purse) {
    if (inputPurse && inputPurse.brand !== purse.brand) {
      setAmounts({ outputAmount, inputAmount: null });
      setQuoteRequest('input');
    }
    setInputPurse(purse);
  }

  function handleChangeOutputPurse(purse) {
    if (outputPurse && outputPurse.brand !== purse.brand) {
      setAmounts({ outputAmount: null, inputAmount });
      setQuoteRequest('output');
    }
    setOutputPurse(purse);
  }

  function handleChangeInputAmount(amount) {
    setAmounts({ outputAmount: null, inputAmount: amount });
    setQuoteRequest('output');
  }

  function handleChangeOutputAmount(amount) {
    setAmounts({ outputAmount: amount, inputAmount: null });
    setQuoteRequest('input');
  }

  function handleswapInputs() {
    setInputPurse(outputPurse);
    setOutputPurse(inputPurse);
    setAmounts({ outputAmount: inputAmount, inputAmount: outputAmount });
    setQuoteRequest(
      quoteRequest && quoteRequest === 'input' ? 'output' : 'input',
    );
  }

  function getExchangeRate(decimal) {
    if (isValid) {
      const inputDecimalPlaces = inputPurse.displayInfo.decimalPlaces || 0;
      const outputDecimalPlaces = outputPurse.displayInfo.decimalPlaces || 0;
      const scale = 10 ** (inputDecimalPlaces - outputDecimalPlaces);
      const exchangeRate = (
        (Number(outputAmount) * scale) /
        Number(inputAmount)
      ).toFixed(decimal);

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
    setInputPurse();
    setOutputPurse();
    setAmounts({ outputAmount: null, inputAmount: null });
    setQuoteRequest(null);
  }

  return (
    <Paper className={classes.paper}>
      <Typography component="h1" variant="h4" align="center">
        Swap
      </Typography>
      <ErrorBoundary>
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
      </ErrorBoundary>
    </Paper>
  );
}
/* eslint-enable complexity */
