import React from 'react';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';

import { makeStyles } from '@material-ui/core/styles';

import {
  floorMultiplyBy,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport';

import { makeDisplayFunctions } from '../../helpers';

const useStyles = makeStyles(theme => ({
  root: {
    backgroundColor: '#FFFFFF',
    marginBottom: theme.spacing(4),
    borderRadius: '20px',
    color: '#707070',
    fontSize: '22px',
    lineHeight: '27px',
    padding: theme.spacing(4),
  },
  card: {},
  cardTitle: {
    fontSize: '16px',
    lineHeight: '19px',
    color: '#222222',
    paddingTop: theme.spacing(2),
  },
  cardValue: {
    fontSize: '22px',
    lineHeight: '27px',
    color: '#707070',
    paddingTop: theme.spacing(2),
  },
  title: {
    fontSize: '22px',
  },
  break: {
    border: 0,
    height: '1px',
    background: '#E5E5E5',
  },
}));

const ValueCard = ({ title, text }) => {
  const classes = useStyles();
  return (
    <Grid item>
      <Box className={classes.card}>
        <Typography className={classes.cardTitle}>{title}</Typography>
        <Typography className={classes.cardValue}>{text}</Typography>
      </Box>
    </Grid>
  );
};

const UnchangeableValues = ({
  locked,
  marketPrice,
  liquidationRatio,
  interestRate,
  // liquidationPenalty,
  brandToInfo,
  debt,
}) => {
  const { displayPercent, displayRatio } = makeDisplayFunctions(brandToInfo);

  // The liquidationPrice is when the value of the collateral
  // equals liquidationRatio (i.e. 125%) of the current debt, divided
  // by the collateral locked
  const liquidationPriceTotal = floorMultiplyBy(debt, liquidationRatio);
  const liquidationPricePerUnit = makeRatioFromAmounts(
    liquidationPriceTotal,
    locked,
  );

  const classes = useStyles();
  return (
    <Paper className={classes.root} elevation={4}>
      <Typography className={classes.title}>Market Details</Typography>
      <hr className={classes.break} />
      <Grid container spacing={1} justify="space-between" alignItems="center">
        <ValueCard title="Market Price" text={displayRatio(marketPrice)} />
        <ValueCard
          title="Liq. Ratio"
          text={`${displayPercent(liquidationRatio)}%`}
        />
        <ValueCard
          title="Liq. Price"
          text={displayRatio(liquidationPricePerUnit)}
        />
        <ValueCard
          title="Interest Rate"
          text={`${displayPercent(interestRate)}%`}
        />
        {/* <ValueCard
          title="Liquidation Penalty"
          text={`${displayPercent(liquidationPenalty)}%`}
        /> */}
      </Grid>
    </Paper>
  );
};

export default UnchangeableValues;
