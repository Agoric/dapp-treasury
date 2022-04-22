import { React, useEffect, useState } from 'react';

import { E } from '@endo/eventual-send';
import { Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import EconomyDetails from './EconomyDetails';
import MyRUNStake from './MyRUNStake';
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
  },
}));

const GetRun = () => {
  const classes = useStyles();
  const {
    state: { brandToInfo, purses, RUNStake, loan },
    walletP,
  } = useApplicationContext();

  const [accountState, setAccountState] = useState(null);

  useEffect(() => {
    if (!walletP) return () => {};

    let cancelled = false;
    const refreshAccountState = async () => {
      const newAccountState = await E(walletP).getAccountState();
      if (!cancelled) {
        setAccountState(newAccountState);
      }
    };
    refreshAccountState();

    return () => (cancelled = true);
  }, [purses, walletP]);

  const {
    MintingRatio: { value: borrowLimit = undefined },
    InterestRate: { value: interestRate = undefined },
  } = RUNStake?.RUNStakeTerms?.governedParams ?? {
    MintingRatio: {},
    InterestRate: {},
  };

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <Typography variant="h3">RUNStake</Typography>
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
              <EconomyDetails
                brandToInfo={brandToInfo}
                borrowLimit={borrowLimit}
                interestRate={interestRate}
              />
            </div>
            <div className={classes.item}>
              <MyRUNStake
                brandToInfo={brandToInfo}
                accountState={accountState}
                borrowLimit={borrowLimit}
                getRun={RUNStake}
                loan={loan}
              />
            </div>
          </div>
        </div>
      </div>
      <Typography variant="h3">getRUN</Typography>
    </div>
  );
};

export default GetRun;
