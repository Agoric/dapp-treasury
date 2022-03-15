import { React, useEffect, useState } from 'react';

import { E } from '@agoric/eventual-send';
import { Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import MarketDetails from './MarketDetails';
import MyGetRun from './MyGetRun';
import Adjust from './Adjust';
import History from './History';
import { useApplicationContext } from '../../contexts/Application';

const useStyles = makeStyles(theme => ({
  body: {
    maxWidth: '1400px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    margin: 'auto',
  },
  container: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    flexWrap: 'wrap',
    padding: '32px 0',
  },
  item: {
    margin: `0 ${theme.spacing(2)}px`,
    minWidth: 420,
  },
  adjust: {
    margin: `0 ${theme.spacing(2)}px`,
    flexGrow: 1,
  },
  infoColumn: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
  },
  header: {
    maxWidth: '1560px',
    margin: 'auto',
    padding: theme.spacing(2),
    paddingBottom: 0,
    '& > .MuiTypography-root': {
      fontFamily: 'Inter',
      fontWeight: '500',
      color: '#707070',
      fontSize: '20px',
    },
    '& > .MuiTypography-h3': {
      fontSize: '32px',
      lineHeight: '32px',
      marginBottom: '16px',
    },
  },
  history: {
    width: '100%',
    padding: '0 16px',
  },
  headerBottom: {
    height: '2px',
    width: '100%',
    margin: 'auto',
    backgroundColor: '#e0e0e0',
    marginTop: '24px',
  },
  root: {
    margin: 'auto',
  },
}));

const GetRun = () => {
  const classes = useStyles();
  const {
    state: { brandToInfo, purses, getRunHistory, getRun, loan },
    dispatch,
    walletP,
  } = useApplicationContext();
  /* const [totalLocked, setTotalLocked] = useState(0n);
  const [totalDebt, setTotalDebt] = useState(0n); */

  const [accountState, setAccountState] = useState(null);

  useEffect(() => {
    if (!walletP) return () => {};

    let cancelled = false;
    const refreshAccountState = async () => {
      const newAccountState = await E(walletP).getAccountState();
      if (!cancelled) {
        setAccountState(newAccountState);
      }
      console.log('accountState', newAccountState);
    };
    refreshAccountState();

    return () => (cancelled = true);
  }, [purses, walletP]);

  const {
    CollateralPrice: { value: collateralPrice = undefined },
    CollateralizationRatio: { value: collateralizationRatio = undefined },
  } = getRun?.getRunTerms?.main ?? {
    CollateralPrice: {},
    CollateralizationRatio: {},
  };

  const {
    BldLienAtt: lienBrand = undefined,
    RUN: runBrand = undefined,
    Stake: bldBrand = undefined,
  } = getRun?.getRunTerms?.brands ?? {};

  console.log('getRunTerms', getRun?.getRunTerms);

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <Typography variant="h3">Get RUN</Typography>
        <Typography>
          Stake BLD, borrow RUN, automatically pay it back with your staking
          rewards.
        </Typography>
        <div className={classes.headerBottom}></div>
      </div>
      <div className={classes.body}>
        <div className={classes.container}>
          <div className={classes.infoColumn}>
            <div className={classes.item}>
              <MarketDetails
                brandToInfo={brandToInfo}
                collateralPrice={collateralPrice}
                collateralizationRatio={collateralizationRatio}
              />
            </div>
            <div className={classes.item}>
              <MyGetRun
                brandToInfo={brandToInfo}
                accountState={accountState}
                collateralPrice={collateralPrice}
                collateralizationRatio={collateralizationRatio}
                getRun={getRun}
                loan={loan}
              />
            </div>
          </div>
          <div className={classes.adjust}>
            <Adjust
              brand={bldBrand}
              debtBrand={runBrand}
              purses={purses}
              brandToInfo={brandToInfo}
              accountState={accountState}
              walletP={walletP}
              lienBrand={lienBrand}
              getRun={getRun}
              loan={loan}
              dispatch={dispatch}
            />
          </div>
        </div>
        <div className={classes.history}>
          <History
            getRun={getRun}
            loan={loan}
            history={getRunHistory}
            brandToInfo={brandToInfo}
            brand={bldBrand}
            debtBrand={runBrand}
          />
        </div>
      </div>
    </div>
  );
};

export default GetRun;
