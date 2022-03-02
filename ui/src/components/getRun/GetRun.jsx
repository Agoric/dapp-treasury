import { React, useEffect, useState } from 'react';

import { E } from '@agoric/eventual-send';
import { makeStyles } from '@material-ui/core/styles';

import MarketDetails from './MarketDetails';
import MyGetRun from './MyGetRun';
import Adjust from './Adjust';
import History from './History';
import { useApplicationContext } from '../../contexts/Application';

const useStyles = makeStyles(theme => ({
  root: {
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
    flexGrow: 2,
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
  history: {
    width: '100%',
    padding: '0 16px',
  },
}));

const GetRun = () => {
  const classes = useStyles();
  const {
    state: { brandToInfo, purses, getRunHistory, getRun },
    walletP,
  } = useApplicationContext();
  /* const [totalLocked, setTotalLocked] = useState(0n);
  const [totalDebt, setTotalDebt] = useState(0n); */

  const [accountState, setAccountState] = useState(null);

  useEffect(() => {
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
  }, [purses]);

  const {
    CollateralPrice: { value: collateralPrice = undefined },
    CollateralizationRatio: { value: collateralizationRatio = undefined },
  } = getRun?.getRunTerms?.main ?? {
    CollateralPrice: {},
    CollateralizationRatio: {},
  };

  const {
    // BldLienAtt: lienBrand = undefined,
    RUN: runBrand = undefined,
    Stake: bldBrand = undefined,
  } = getRun?.getRunTerms?.brands ?? {};

  console.log('getRunTerms', getRun?.getRunTerms);

  return (
    <div className={classes.root}>
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
            <MyGetRun brandToInfo={brandToInfo} />
          </div>
        </div>
        <div className={classes.adjust}>
          <Adjust
            brand={bldBrand}
            debtBrand={runBrand}
            purses={purses}
            brandToInfo={brandToInfo}
            accountState={accountState}
          />
        </div>
      </div>
      <div className={classes.history}>
        <History history={getRunHistory} brandToInfo={brandToInfo} />
      </div>
    </div>
  );
};

export default GetRun;
