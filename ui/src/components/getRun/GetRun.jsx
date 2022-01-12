import { React } from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { Typography } from '@material-ui/core';

import MarketDetails from './MarketDetails';
import AdjustRunForm from './AdjustRunForm';
import History from './History';
import { useApplicationContext } from '../../contexts/Application';

const useStyles = makeStyles(theme => ({
  root: {
    marginBottom: theme.spacing(3),
    width: '100%',
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
}));

const GetRun = () => {
  const classes = useStyles();
  const {
    state: { runLoCTerms, brandToInfo, purses },
  } = useApplicationContext();

  const {
    initialMargin = undefined,
    marketPrice = undefined,
    interestRate = undefined,
    brand = undefined,
    debtBrand = undefined,
  } = runLoCTerms ?? {};

  const header = (
    <div className={classes.header}>
      <Typography variant="h3">getRUN</Typography>
    </div>
  );

  return (
    <div className={classes.root}>
      {header}
      <MarketDetails
        marketPrice={marketPrice}
        initialMargin={initialMargin}
        brandToInfo={brandToInfo}
        interestRate={interestRate}
      />
      <AdjustRunForm
        purses={purses}
        brandToInfo={brandToInfo}
        brand={brand}
        debtBrand={debtBrand}
      />
      <History />
    </div>
  );
};

export default GetRun;
