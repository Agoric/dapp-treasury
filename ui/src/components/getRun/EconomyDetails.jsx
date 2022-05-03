import React from 'react';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import { makeStyles } from '@material-ui/core/styles';
import { NameValueTable, makeRow } from './NameValueTable';
import { makeDisplayFunctions } from '../helpers';

const useStyles = makeStyles(theme => ({
  root: {
    backgroundColor: '#FFFFFF',
    marginBottom: theme.spacing(4),
    borderRadius: '20px',
    color: '#707070',
    fontSize: '22px',
    lineHeight: '27px',
    padding: theme.spacing(4),
    minWidth: 360,
  },
  title: {
    fontSize: '22px',
  },
  break: {
    border: 0,
    height: '1px',
    background: '#E5E5E5',
  },
  loadingPlaceholder: {
    height: '126px',
    display: 'flex',
    alignItems: 'center',
    margin: 'auto',
    width: 'fit-content',
  },
}));

/**
 * @typedef {{
 * brandToInfo: TreasuryState['brandToInfo'],
 * borrowLimit: RUNStakeState['RUNStakeTerms']['governedParams']['DebtLimit'],
 * interestRate: RUNStakeState['RUNStakeTerms']['governedParams']['InterestRate'],
 * loanFee: RUNStakeState['RUNStakeTerms']['governedParams']['LoanFee']
 * }} Props
 */

/**
 * @param {Props} props
 */
const MarketDetails = ({ brandToInfo, borrowLimit, interestRate, loanFee }) => {
  const classes = useStyles();
  const { displayPercent, displayRatio } = makeDisplayFunctions(brandToInfo);

  const rows =
    borrowLimit && interestRate
      ? [
          makeRow('Debt Limit per BLD', `${displayRatio(borrowLimit)} RUN`),
          makeRow('Interest Rate', `${displayPercent(interestRate, 2)}%`),
          makeRow('Loan Fee', `${displayPercent(loanFee, 2)}%`),
        ]
      : [];
  const values =
    !borrowLimit || !interestRate ? (
      <NameValueTable rowsToLoad={3} />
    ) : (
      <NameValueTable rows={rows} />
    );

  return (
    <Paper className={classes.root} elevation={4}>
      <Typography className={classes.title}>Economy Details</Typography>
      <hr className={classes.break} />
      {values}
    </Paper>
  );
};

export default MarketDetails;
