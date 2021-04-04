import { React, useState, useEffect } from 'react';
import { E } from '@agoric/captp';
import {
  divideBy,
  invertRatio,
  makeRatio,
  makeRatioFromAmounts,
  multiplyBy,
} from '@agoric/zoe/src/contractSupport';
import { Nat } from '@agoric/nat';
import { stringifyAmountValue } from '@agoric/ui-components';

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
import { amountMath } from '@agoric/ertp';

import { sameStructure } from '@agoric/same-structure';
import AssetInput from './AssetInput';
import Steps from './Steps';
import ErrorBoundary from './ErrorBoundary';

import { displayPetname, getInfoForBrand } from './helpers';

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

const makeInverseFromAmounts = (x, y) => makeRatioFromAmounts(y, x);
const composeRatio = (x, y) =>
  makeRatioFromAmounts(multiplyBy(x.numerator, y), x.denominator);

/* eslint-disable complexity */
export default function Swap() {
  const classes = useStyles();
  const { state, dispatch, walletP } = useApplicationContext();
  // const { purses, connected, ammAPI, centralBrand, otherBrands } = state;
  const {
    purses,
    connected,
    brandToInfo,
    autoswap: { ammAPI, centralBrand },
  } = state;

  const [inputPurse, setInputPurse] = useState(null);
  const [outputPurse, setOutputPurse] = useState(null);
  const [inputAmount, setInputAmount] = useState(null);
  const [outputAmount, setOutputAmount] = useState(null);

  const [inputRate, setInputRate] = useState({});
  const [outputRate, setOutputRate] = useState({});
  const [quote, setQuote] = useState();

  console.log('ALL', {
    purses,
    inputPurse,
    outputPurse,
    inputAmount,
    outputAmount,
    connected,
  });

  // See marketPrice comment below
  const centralOnlyRate = {
    brand: centralBrand,
    ratio: makeRatio(100000000n, centralBrand, 100000000n, centralBrand),
  };

  /**
   * The `marketRate` is the ratio between the input asset
   * and the output asset. It is computed by getting the market
   * price for each pool, and composing them. If one of the
   * selected assets is the central token, that "poolRate"
   * is just 1:1 (centralOnlyRate, above).
   *
   * Becuase the ratios are queries async, the state for
   * them starts as `{ brand, amount: null }`. The brand is
   * used to check at `set` time that the brand has not changed;
   * e.g., because the user selected a purse with a different
   * brand.
   *
   * The input `poolRate` is `RUN/inputBrand` and the output
   * `poolRate` is `outputBrand/RUN`.
   */
  console.log('RATES', inputRate, outputRate);
  const marketRate =
    inputRate.ratio && outputRate.ratio
      ? composeRatio(inputRate.ratio, outputRate.ratio)
      : null;
  console.log('RATES', inputRate, outputRate, marketRate);

  const requestRatio = async (brand, setPoolRate, makeRate) => {
    if (brand === centralBrand) {
      setPoolRate(centralOnlyRate);
      return;
    }
    setPoolRate({ brand, ratio: null });
    const alloc = await E(ammAPI).getPoolAllocation(brand);
    // only update if the brand hasn't changed
    const ratio = makeRate(alloc.Central, alloc.Secondary);
    console.log(`Pool allocation`, alloc, ratio);
    setPoolRate(q => (q.brand === brand ? { brand, ratio } : q));
  };

  useEffect(() => {
    if (inputPurse && ammAPI) {
      requestRatio(
        inputPurse.brand,
        setInputRate,
        makeRatioFromAmounts,
      ).catch(_ => {});
    }
  }, [inputPurse, ammAPI]);

  useEffect(() => {
    if (outputPurse && ammAPI) {
      requestRatio(
        outputPurse.brand,
        setOutputRate,
        makeInverseFromAmounts,
      ).catch(_ => {});
    }
  }, [outputPurse, ammAPI]);

  // Log the pool information for debugging purposes
  const logPool = async (purse, name) => {
    if (!purse || !purse.brand || purse.brand === centralBrand || !ammAPI) {
      return;
    }
    const alloc = await E(ammAPI).getPoolAllocation(purse.brand);
    console.log(`${name} allocation`, alloc);
  };

  useEffect(() => {
    logPool(inputPurse, 'INPUT').catch(_ => {});
  }, [inputPurse, ammAPI]);

  useEffect(() => {
    logPool(outputPurse, 'OUTPUT').catch(_ => {});
  }, [outputPurse, ammAPI]);

  const getMarketQuote = async (isInput, brand, amount) => {
    console.log('QUOTING', isInput, brand, amount);
    const quoteResult = isInput
      ? E(ammAPI).getPriceGivenAvailableInput(amount, brand)
      : E(ammAPI).getPriceGivenRequiredOutput(brand, amount);
    const { amountIn, amountOut } = await quoteResult;
    const quoteRatio = makeRatioFromAmounts(amountOut, amountIn);
    console.log('QUOTE', quoteRatio);
    // TODO there has got to be a better way than this...
    setQuote(quoteRatio.numerator.value === 0n ? null : quoteRatio);
  };

  useEffect(() => {
    if (!inputAmount || !outputPurse) {
      return;
    }
    getMarketQuote(true, outputPurse.brand, inputAmount);
  }, [inputAmount, outputPurse]);

  useEffect(() => {
    if (!outputAmount || !inputPurse) {
      return;
    }
    getMarketQuote(false, inputPurse.brand, outputAmount);
  }, [outputAmount, inputPurse]);

  const inputAmountError =
    inputAmount &&
    (inputAmount.value < 0n ||
      (inputPurse && inputAmount.value > inputPurse.value));
  const outputAmountError = outputAmount && outputAmount.value < 0n;

  const pursesError =
    inputPurse && outputPurse && inputPurse.brand === outputPurse.brand;

  const hasError = pursesError || inputAmountError || outputAmountError;

  const isValid =
    !hasError &&
    inputPurse &&
    outputPurse &&
    inputAmount &&
    outputAmount &&
    inputAmount.value > 0n &&
    outputAmount.value > 0n;

  function handleChangeInputPurse(purse) {
    if (inputPurse && inputPurse.brand !== purse.brand) {
      setInputAmount(null);
    }
    setInputPurse(purse);
  }

  function handleChangeOutputPurse(purse) {
    if (outputPurse && outputPurse.brand !== purse.brand) {
      setOutputAmount(null);
    }
    setOutputPurse(purse);
  }

  function handleChangeInputAmount(value) {
    setOutputAmount(null);
    setInputAmount(amountMath.make(inputPurse.brand, value));
  }

  function handleChangeOutputAmount(value) {
    setOutputAmount(amountMath.make(outputPurse.brand, value));
    setInputAmount(null);
  }

  function handleswapInputs() {
    setInputPurse(outputPurse);
    setOutputPurse(inputPurse);
    setOutputAmount(inputAmount);
    setInputAmount(outputAmount);
    setQuote(quote && invertRatio(quote));
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
    setInputPurse(null);
    setOutputPurse(null);
    setInputAmount(null);
    setOutputAmount(null);
  }

  function getExchangeRate(placesToShow) {
    if (marketRate) {
      const giveInfo = getInfoForBrand(brandToInfo, inputRate.brand);
      const wantInfo = getInfoForBrand(brandToInfo, outputRate.brand);
      const oneDisplayUnit = 10n ** Nat(wantInfo.decimalPlaces);
      const wantPrice = divideBy(
        amountMath.make(outputRate.brand, oneDisplayUnit),
        marketRate,
      );
      const exchangeRate = stringifyAmountValue(
        wantPrice,
        wantInfo.amountMathKind,
        wantInfo.decimalPlaces,
        placesToShow,
      );
      return `Exchange rate: 1 ${displayPetname(
        giveInfo.petname,
      )} = ${exchangeRate} ${displayPetname(wantInfo.petname)}`;
    }
    return '';
  }

  function computeOtherAmount(source, dest, quoteRatio, marketRatio, label) {
    console.log('Amount display', source, dest, quoteRatio, label);
    if (dest) {
      return { amount: dest.value, label };
    }
    if (source && source.value) {
      if (quoteRatio && sameStructure(source, quoteRatio.denominator)) {
        const amount = multiplyBy(source, quoteRatio).value;
        return { amount, label: `Quoted ${label}` };
      }
      if (marketRatio) {
        const amount = multiplyBy(source, marketRatio).value;
        return { amount, label: `Estimated ${label}` };
      }
    }
    return { amount: null, label };
  }

  const reciprocal = quote && invertRatio(quote);
  const { amount: inputDisplay, label: inputLabel } = computeOtherAmount(
    outputAmount,
    inputAmount,
    reciprocal,
    marketRate && invertRatio(marketRate),
    'Input',
  );
  const { amount: outputDisplay, label: outputLabel } = computeOtherAmount(
    inputAmount,
    outputAmount,
    quote,
    marketRate,
    'Output',
  );

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
            title={inputLabel}
            purseTitle={'Input'}
            purses={purses}
            onPurseChange={handleChangeInputPurse}
            onAmountChange={handleChangeInputAmount}
            purse={inputPurse}
            amount={inputDisplay}
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
            title={outputLabel}
            purseTitle={'Output'}
            purses={purses}
            onPurseChange={handleChangeOutputPurse}
            onAmountChange={handleChangeOutputAmount}
            purse={outputPurse}
            amount={outputDisplay}
            disabled={!connected}
            purseError={pursesError}
            amountError={outputAmountError}
          />
          <InputLabel className={classes.message}>
            {connected && getExchangeRate(4)}
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
