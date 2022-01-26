import { React, useEffect, useState } from 'react';

import { makeStyles } from '@material-ui/core/styles';

import { makeRatio } from '@agoric/zoe/src/contractSupport';
import MarketDetails from './MarketDetails';
import MyGetRun from './MyGetRun';
import Adjust from './Adjust';
import History from './History';
import { useApplicationContext } from '../../contexts/Application';

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%',
  },
  container: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: '100%',
    flexWrap: 'wrap',
    padding: theme.spacing(4),
    [theme.breakpoints.down('sm')]: {
      padding: 0,
      paddingTop: theme.spacing(4),
    },
  },
  item: {
    margin: `0 ${theme.spacing(2)}px`,
    maxWidth: '100%',
    flexGrow: 1,
  },
  header: {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    marginLeft: theme.spacing(1),
    padding: theme.spacing(2),
    '& > .MuiTypography-root': {
      fontFamily: 'Inter',
      fontWeight: '500',
      color: '#707070',
      fontSize: '22px',
    },
    '& > .MuiTypography-h3': {
      fontSize: '32px',
      lineHeight: '32px',
    },
  },
}));

const GetRun = () => {
  const classes = useStyles();
  const {
    state: { runLoCTerms, brandToInfo, purses, getRunHistory },
  } = useApplicationContext();
  const [totalLocked, setTotalLocked] = useState(0n);
  const [totalDebt, setTotalDebt] = useState(0n);

  const {
    initialMargin = undefined,
    marketPrice = undefined,
    interestRate = undefined,
    brand = undefined,
    debtBrand = undefined,
    maxRunPercent = undefined,
  } = runLoCTerms ?? {};

  useEffect(() => {
    let newTotalLocked = 0n;
    let newTotalDebt = 0n;
    if (getRunHistory?.length) {
      for (const { locked, debt, lockedAction, debtAction } of getRunHistory) {
        if (lockedAction === 'lock') {
          newTotalLocked += locked.numerator.value;
        } else {
          newTotalLocked -= locked.numerator.value;
        }
        if (debtAction === 'borrow') {
          newTotalDebt += debt.numerator.value;
        } else {
          newTotalDebt -= debt.numerator.value;
        }
      }
      setTotalLocked(newTotalLocked);
      setTotalDebt(newTotalDebt);
    }
  }, [getRunHistory]);

  const lockedRatio = brand && makeRatio(totalLocked, brand);
  const debtRatio = debtBrand && makeRatio(totalDebt, debtBrand);
  const maxDebtRatio =
    lockedRatio &&
    marketPrice &&
    initialMargin &&
    makeRatio(
      (lockedRatio.numerator.value * marketPrice.numerator.value) /
        initialMargin.numerator.value,
      brand,
    );

  const runPercent =
    lockedRatio &&
    debtRatio &&
    debtRatio.numerator.value > 0n &&
    makeRatio(
      debtRatio.numerator.value,
      debtBrand,
      (lockedRatio.numerator.value * marketPrice.numerator.value) /
        marketPrice.denominator.value,
      brand,
    );

  const collateralization =
    lockedRatio &&
    debtRatio &&
    debtRatio.numerator.value > 0n &&
    makeRatio(
      (lockedRatio.numerator.value * marketPrice.numerator.value) /
        marketPrice.denominator.value,
      brand,
      debtRatio.numerator.value,
      debtBrand,
    );

  return (
    <div className={classes.root}>
      <div className={classes.container}>
        <div className={classes.item}>
          <MyGetRun
            lockedBld={lockedRatio}
            outstandingDebt={debtRatio}
            maxDebt={maxDebtRatio}
            maxRunPercent={maxRunPercent}
            runPercent={runPercent}
            collateralization={collateralization}
            brandToInfo={brandToInfo}
          />
        </div>
        <div className={classes.item}>
          <MarketDetails
            marketPrice={marketPrice}
            maxRunPercent={maxRunPercent}
            brandToInfo={brandToInfo}
            interestRate={interestRate}
          />
        </div>
        <div className={classes.item}>
          <Adjust
            purses={purses}
            brandToInfo={brandToInfo}
            brand={brand}
            debtBrand={debtBrand}
            locked={lockedRatio}
            runPercent={runPercent}
            borrowed={debtRatio}
            collateralization={collateralization}
            marketPrice={marketPrice}
          />
        </div>
        <div className={classes.item}>
          <History history={getRunHistory} brandToInfo={brandToInfo} />
        </div>
      </div>
    </div>
  );
};

export default GetRun;
