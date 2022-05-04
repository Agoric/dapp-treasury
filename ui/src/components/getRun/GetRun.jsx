import { React } from 'react';

import { Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import EconomyDetails from './EconomyDetails.jsx';
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
    state: { brandToInfo, RUNStake },
  } = useApplicationContext();

  const {
    MintingRatio: { value: borrowLimit },
    InterestRate: { value: interestRate },
    LoanFee: { value: loanFee },
  } = RUNStake?.RUNStakeTerms?.governedParams ?? {
    MintingRatio: {},
    InterestRate: {},
    LoanFee: {},
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
                loanFee={loanFee}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GetRun;
