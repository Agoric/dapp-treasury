import { React } from 'react';

import { makeStyles } from '@material-ui/core/styles';

import { makeRatio } from '@agoric/zoe/src/contractSupport';
import MarketDetails from './MarketDetails';
import MyGetRun from './MyGetRun';
import Adjust from './Adjust';
import History from './History';
import { useApplicationContext } from '../../contexts/Application';

const useStyles = makeStyles(theme => ({
  root: {
    marginBottom: theme.spacing(3),
    width: '100%',
  },
  container: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: '100%',
    flexWrap: 'wrap',
    padding: 32,
  },
  item: {
    margin: `0 ${theme.spacing(2)}px`,
    maxWidth: '100%',
    flexGrow: 1,
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

  const lockedBld = brand ? makeRatio(1000n, brand) : null;
  const outstandingDebt = debtBrand ? makeRatio(100n, debtBrand) : null;
  const collateralization =
    lockedBld && outstandingDebt
      ? makeRatio(
          lockedBld.numerator.value,
          brand,
          outstandingDebt.numerator.value,
          debtBrand,
        )
      : null;

  return (
    <div className={classes.root}>
      <div className={classes.container}>
        <div className={classes.item}>
          <MyGetRun
            lockedBld={lockedBld}
            outstandingDebt={outstandingDebt}
            collateralization={collateralization}
            brandToInfo={brandToInfo}
          />
        </div>
        <div className={classes.item}>
          <MarketDetails
            marketPrice={marketPrice}
            initialMargin={initialMargin}
            brandToInfo={brandToInfo}
            interestRate={interestRate}
          />
        </div>
        <div className={classes.item}>
          <Adjust
            purses={purses}
            brandToInfo={brandToInfo}
            brand={brand}
            debtBrand={debtBrand}
          />
        </div>
        <div className={classes.item}>
          <History />
        </div>
      </div>
    </div>
  );
};

export default GetRun;
