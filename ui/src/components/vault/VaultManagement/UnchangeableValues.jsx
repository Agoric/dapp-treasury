import React from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';

import { makeStyles } from '@material-ui/core/styles';

import { stringifyValue } from '@agoric/ui-components';
import { multiplyBy } from '@agoric/zoe/src/contractSupport';

import { toPrintedPercent } from '../../../utils/helper';
import { getInfoForBrand } from '../../helpers';

const useStyles = makeStyles(theme => ({
  root: {
    backgroundColor: theme.palette.info.main,
    marginBottom: theme.spacing(2),
  },
  card: { backgroundColor: theme.palette.info.main },
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
  marketPrice,
  liquidationRatio,
  interestRate,
  // liquidationPenalty,
  brandToInfo,
  debt,
}) => {
  const moeBrandInfo = getInfoForBrand(
    brandToInfo,
    marketPrice.numerator.brand,
  );

  // The liquidationPrice is when the value of the collateral
  // equals liquidationRatio (i.e. 125%) of the current debt
  const liquidationPrice = multiplyBy(debt, liquidationRatio);

  const classes = useStyles();
  return (
    <Paper className={classes.root} elevation={0}>
      <Grid container spacing={1}>
        <ValueCard
          title="Market Price"
          text={stringifyValue(
            marketPrice.numerator.value,
            moeBrandInfo.mathKind,
            moeBrandInfo.decimalPlaces,
          )}
        />
        <ValueCard
          title="Liquidation Ratio"
          text={`${toPrintedPercent(liquidationRatio)}%`}
        />
        <ValueCard
          title="Liquidation Price"
          text={stringifyValue(
            liquidationPrice.value,
            moeBrandInfo.mathKind,
            moeBrandInfo.decimalPlaces,
          )}
        />
        <ValueCard
          title="Interest Rate"
          text={`${toPrintedPercent(interestRate)}%`}
        />
        {/* <ValueCard
          title="Liquidation Penalty"
          text={`${toPrintedPercent(liquidationPenalty)}%`}
        /> */}
      </Grid>
    </Paper>
  );
};

export default UnchangeableValues;
