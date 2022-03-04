import React from 'react';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import CircularProgress from '@material-ui/core/CircularProgress';
import { makeStyles } from '@material-ui/core/styles';
import { makeRatio, floorMultiplyBy } from '@agoric/zoe/src/contractSupport';

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

const MyGetRun = ({
  brandToInfo,
  accountState,
  collateralPrice,
  collateralizationRatio,
  getRun,
}) => {
  const { displayAmount } = makeDisplayFunctions(brandToInfo);
  const classes = useStyles();

  const borrowLimit =
    collateralPrice &&
    collateralizationRatio &&
    accountState &&
    floorMultiplyBy(
      accountState.bonded,
      makeRatio(
        collateralPrice.numerator.value *
          collateralizationRatio.denominator.value,
        collateralPrice.numerator.brand,
        collateralPrice.denominator.value *
          collateralizationRatio.numerator.value,
        collateralPrice.denominator.brand,
      ),
    );

  const rows =
    borrowLimit && accountState && getRun
      ? [
          makeRow('Liened', `${displayAmount(accountState.liened)} BLD`),
          makeRow('Borrowed', '0.00 RUN'),
          makeRow('Staked', `${displayAmount(accountState.bonded)} BLD`),
          makeRow('Borrow Limit', `${displayAmount(borrowLimit)} RUN`),
        ]
      : [];

  const values = !rows.length ? (
    <div className={classes.loadingPlaceholder}>
      <CircularProgress />
    </div>
  ) : (
    <NameValueTable rows={rows} />
  );

  return (
    <Paper className={classes.root} elevation={4}>
      <Typography className={classes.title}>My Wallet</Typography>
      <hr className={classes.break} />
      {values}
    </Paper>
  );
};

export default MyGetRun;
