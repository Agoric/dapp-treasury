import React from 'react';
import Box from '@material-ui/core/Box';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import CircularProgress from '@material-ui/core/CircularProgress';

import { makeStyles } from '@material-ui/core/styles';

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
    width: 'fit-content',
    margin: 'auto',
    minWidth: '400px',
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
  loadingPlaceholder: {
    height: '126px',
    display: 'flex',
    alignItems: 'center',
    margin: 'auto',
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

const MarketDetails = ({ marketPrice, initialMargin, brandToInfo }) => {
  const { displayPercent, displayRatio } = makeDisplayFunctions(brandToInfo);
  const classes = useStyles();

  const values =
    !marketPrice || !initialMargin ? (
      <div className={classes.loadingPlaceholder}>
        {' '}
        <CircularProgress />
      </div>
    ) : (
      <>
        <ValueCard
          title="BLD Price"
          text={`${displayRatio(marketPrice)} RUN`}
        />
        <ValueCard
          title="Min. Collateralization"
          text={`${displayPercent(initialMargin)}%`}
        />
      </>
    );

  return (
    <Paper className={classes.root} elevation={4}>
      <Typography className={classes.title}>Market Details</Typography>
      <hr className={classes.break} />
      <Grid container spacing={6} justify="space-between" alignItems="center">
        {values}
      </Grid>
    </Paper>
  );
};

export default MarketDetails;
