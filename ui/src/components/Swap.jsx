import { React, useState, useEffect } from 'react';
import { E } from '@endo/captp';
import {
  floorDivideBy,
  invertRatio,
  makeRatio,
  makeRatioFromAmounts,
  floorMultiplyBy,
} from '@agoric/zoe/src/contractSupport';
import { Nat } from '@endo/nat';
import { stringifyAmountValue } from '@agoric/ui-components';

import { makeStyles } from '@material-ui/core/styles';

import {
  Button,
  Grid,
  Paper,
  Typography,
  IconButton,
  InputLabel,
  CircularProgress,
} from '@material-ui/core';
import ArrowDownIcon from '@material-ui/icons/ArrowDownward';
import { AmountMath } from '@agoric/ertp';

import { sameStructure } from '@agoric/same-structure';
import AssetInput from './AssetInput';
import Steps from './Steps';
import ErrorBoundary from './ErrorBoundary';
import ApproveOfferSB from './ApproveOfferSB';

import { displayPetname, getInfoForBrand } from './helpers';

import { useApplicationContext } from '../contexts/Application';

import { makeSwapOffer } from '../contexts/makeSwapOffer';

const useStyles = makeStyles(theme => ({
  root: {
    width: 'fit-content',
    margin: 'auto',
  },
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
  makeRatioFromAmounts(floorMultiplyBy(x.numerator, y), x.denominator);

/* eslint-disable complexity */
export default function Swap() {
  const classes = useStyles();
  const { state, walletP } = useApplicationContext();

  const {
    purses: unfilteredPurses,
    connected,
    approved,
    brandToInfo,
    autoswap: { ammAPI, centralBrand, otherBrands },
  } = state;

  const knownBrands = new Set(Object.values(otherBrands || {}));
  knownBrands.add(centralBrand);
  const purses =
    unfilteredPurses &&
    unfilteredPurses.filter(({ brand }) => knownBrands.has(brand));

  const getDefaultPurse = () =>
    purses && purses.find(({ brand }) => brand === centralBrand);

  const [inputPurse, setInputPurse] = useState(getDefaultPurse);
  const [outputPurse, setOutputPurse] = useState(null);
  const [inputAmount, setInputAmount] = useState(null);
  const [outputAmount, setOutputAmount] = useState(null);

  const [inputRate, setInputRate] = useState({});
  const [outputRate, setOutputRate] = useState({});
  // The quote is always non-null with this structure: { amount, rate }
  const [quote, setQuote] = useState({ amount: null, rate: null });

  const [openApproveOfferSB, setOpenApproveOfferSB] = useState(false);

  const handleApproveOfferSBClose = () => {
    setOpenApproveOfferSB(false);
  };

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
    ratio: centralBrand
      ? makeRatio(100000000n, centralBrand, 100000000n, centralBrand)
      : null,
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
    if (AmountMath.isEmpty(amount)) {
      return;
    }
    if (brand === amount.brand) {
      // There's no brand conversion so it's 100% as a ratio
      setQuote({ amount, rate: makeRatioFromAmounts(amount, amount) });
      return;
    }
    // Remember the current amount that we want a quote for
    setQuote({ amount, rate: null });
    const quoteResult = isInput
      ? E(ammAPI).getInputPrice(amount, AmountMath.makeEmpty(brand))
      : E(ammAPI).getOutputPrice(AmountMath.makeEmpty(brand), amount);
    const { amountIn, amountOut } = await quoteResult;
    const rate = isInput
      ? makeRatioFromAmounts(amountOut, amountIn)
      : makeRatioFromAmounts(amountIn, amountOut);
    console.log('QUOTE', rate, amount);
    // TODO there has got to be a better way than this...
    if (rate.numerator.value === null) {
      return;
    }
    // Only set the quote if the amount we quoted for is still
    // the current amount
    setQuote(qr => (sameStructure(qr.amount, amount) ? { amount, rate } : qr));
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

  if (!approved) {
    return (
      <div className={classes.root}>
        <Paper className={classes.paper}>
          <div>
            To continue, please approve the VaultFactory Dapp in your wallet.
          </div>
        </Paper>
      </div>
    );
  }

  if (!centralBrand || !purses) {
    return (
      <div className={classes.root}>
        <CircularProgress style={{ marginTop: 48 }} />
      </div>
    );
  }

  const inputAmountError =
    inputAmount &&
    (inputAmount.value < 0n ||
      (inputPurse && inputAmount.value > inputPurse.value));
  const outputAmountError = outputAmount && outputAmount.value < 0n;

  const pursesError =
    inputPurse && outputPurse && inputPurse.brand === outputPurse.brand;

  const hasError = pursesError || inputAmountError || outputAmountError;

  function getExchangeRate(placesToShow) {
    if (marketRate) {
      const giveInfo = getInfoForBrand(brandToInfo, inputRate.brand);
      const wantInfo = getInfoForBrand(brandToInfo, outputRate.brand);
      const oneDisplayUnit = 10n ** Nat(wantInfo.decimalPlaces);
      const wantPrice = floorDivideBy(
        AmountMath.make(outputRate.brand, oneDisplayUnit),
        marketRate,
      );
      const exchangeRate = stringifyAmountValue(
        wantPrice,
        giveInfo.assetKind,
        giveInfo.decimalPlaces,
        placesToShow,
      );
      return `Exchange rate: 1 ${displayPetname(
        wantInfo.petname,
      )} = ${exchangeRate} ${displayPetname(giveInfo.petname)}`;
    }
    return '';
  }

  function computeOtherAmount(source, dest, marketRatio, label) {
    console.log('Amount display', source, dest, quote, label);
    if (dest) {
      return { amount: dest.value, label };
    }
    if (source && source.value) {
      // The quote units will be quoted amount/entered amount
      // and so depends on whether the user entered the In or
      // the Out amount most recently
      if (quote.rate && sameStructure(source, quote.amount)) {
        const value = floorMultiplyBy(source, quote.rate).value;
        return { amount: value, label: `Quoted ${label}` };
      }
      if (marketRatio) {
        const value = floorMultiplyBy(source, marketRatio).value;
        return { amount: value, label: `Estimated ${label}` };
      }
    }
    return { amount: null, label };
  }

  const { amount: inputDisplay, label: inputLabel } = computeOtherAmount(
    outputAmount,
    inputAmount,
    marketRate && invertRatio(marketRate),
    'Input',
  );
  const { amount: outputDisplay, label: outputLabel } = computeOtherAmount(
    inputAmount,
    outputAmount,
    marketRate,
    'Output',
  );

  const isValid =
    !hasError &&
    inputPurse &&
    outputPurse &&
    inputDisplay > 0n &&
    outputDisplay > 0n;

  // To limit slippage with offer safety, this computes
  // the most we would give or the least we would want
  // The most or least we would give or want respectively
  // TODO this hardwires 2% slippage limit; it should be
  // editable: https://github.com/Agoric/dapp-token-economy/issues/230
  const unitBasis = 10000n;
  const maxSlippageBasis = 300n + unitBasis;
  const giveLimit =
    inputDisplay && (inputDisplay * maxSlippageBasis) / unitBasis;
  const wantLimit =
    outputDisplay && (outputDisplay * unitBasis) / maxSlippageBasis;
  const isSwapIn = !!inputAmount;
  // TODO this needs to deal with decimals. Should the *Display
  // variables contain Amounts?
  // const limitMessage = isSwapIn
  //   ? `The least you will receive is ${wantLimit}`
  //   : `The most you will spend is ${giveLimit}`;

  // If the user entered the "In" amount, then keep that fixed and
  // change the output by the slippage.
  function handleSwap() {
    makeSwapOffer(
      walletP,
      ammAPI,
      inputPurse,
      isSwapIn ? inputDisplay : giveLimit,
      outputPurse,
      isSwapIn ? wantLimit : outputDisplay,
      isSwapIn,
    );
    setInputPurse(null);
    setOutputPurse(null);
    setInputAmount(null);
    setOutputAmount(null);
    setOpenApproveOfferSB(true);
  }

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
    if (inputPurse) {
      setOutputAmount(null);
      setInputAmount(AmountMath.make(inputPurse.brand, value));
    }
  }

  function handleChangeOutputAmount(value) {
    if (outputPurse) {
      setOutputAmount(AmountMath.make(outputPurse.brand, value));
      setInputAmount(null);
    }
  }

  function handleSwapInputs() {
    setInputPurse(outputPurse);
    setOutputPurse(inputPurse);
    setOutputAmount(inputAmount);
    setInputAmount(outputAmount);
  }

  console.log('DISPLAY AMOUNTS', {
    inputDisplay,
    outputDisplay,
    marketRate,
    connected,
    hasError,
    inputPurse,
    outputPurse,
    isValid,
  });
  return (
    <div className={classes.root}>
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

          <Grid container spacing={3} className={classes.grid} justify="center">
            <Grid item sm={12}>
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
            </Grid>
            <Grid item sm={12}>
              <Grid container justify="center">
                <IconButton
                  size="medium"
                  onClick={handleSwapInputs}
                  disabled={!connected}
                >
                  <ArrowDownIcon />
                </IconButton>
              </Grid>
            </Grid>
            <Grid item sm={12}>
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
            </Grid>
            <Grid item sm={12}>
              <InputLabel className={classes.message}>
                {connected && getExchangeRate(4)}
              </InputLabel>
            </Grid>
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
      <ApproveOfferSB
        open={openApproveOfferSB}
        handleClose={handleApproveOfferSBClose}
      />
    </div>
  );
}
/* eslint-enable complexity */
