import React from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';

import { makeStyles } from '@material-ui/core/styles';

import {
  multiplyBy,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport';

import { makeDisplayFunctions } from '../../helpers';

const useStyles = makeStyles(theme => ({
  root: {
    backgroundColor: theme.palette.info.main,
    marginBottom: theme.spacing(2),
  },
  card: { backgroundColor: theme.palette.info.main },
  title: {
    paddingLeft: theme.spacing(2),
    paddingTop: theme.spacing(2),
  },
  break: {
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
  },
}));

const ValueCard = ({ title, text }) => {
  const classes = useStyles();
  return (
    <Grid item>
      <Card elevation={0} square={true} className={classes.card}>
        <CardContent>
          <Typography gutterBottom>{title}</Typography>
          <Typography variant="h5" component="h2">
            {text}
          </Typography>
        </CardContent>
      </Card>
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
  const liquidationPriceTotal = multiplyBy(debt, liquidationRatio);
  const liquidationPricePerUnit = makeRatioFromAmounts(
    liquidationPriceTotal,
    locked,
  );

  const classes = useStyles();
  return (
    <Paper className={classes.root} elevation={0}>
      <Typography className={classes.title}>Market Details</Typography>
      <div className={classes.break}>
        <hr />
      </div>
      <Grid container spacing={1}>
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
