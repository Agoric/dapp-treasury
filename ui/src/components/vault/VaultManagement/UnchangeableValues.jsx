import React from 'react';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';

import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  root: {
    backgroundColor: theme.palette.info.main,
    marginBottom: theme.spacing(2),
  },
  card: { backgroundColor: theme.palette.info.main },
}));

// createData('Collateral Value', 159, ''),
// createData('Current C-Ratio', 237, ''),
// createData('Market Price', 262, ''),
// createData('Liquidation Penalty', 305, ''),
// createData('Debt Value', 356, ''),

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

// TODO: use real values
const UnchangeableValues = () => {
  const classes = useStyles();
  return (
    <Paper className={classes.root} elevation={0}>
      <Grid container spacing={1}>
        <ValueCard title="Market Price" text="$2982" />
        <ValueCard title="Liquidation Ratio" text="125%" />
        <ValueCard title="Liquidation Price" text="$1092" />
        <ValueCard title="Interest Rate" text="0.003%" />
        <ValueCard title="Liquidation Penalty" text="0.003%" />
      </Grid>
    </Paper>
  );
};

export default UnchangeableValues;
