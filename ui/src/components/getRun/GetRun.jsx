import { React } from 'react';

import { makeStyles } from '@material-ui/core/styles';

import MarketDetails from './MarketDetails';
import MyGetRun from './MyGetRun';
import Adjust from './Adjust';
import History from './History';
import { useApplicationContext } from '../../contexts/Application';

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%',
  },
  container: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: '100%',
    flexWrap: 'wrap',
    padding: theme.spacing(4),
    [theme.breakpoints.down('sm')]: {
      padding: 0,
      paddingTop: theme.spacing(4),
    },
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
    state: { brandToInfo, purses, getRunHistory, getRun },
  } = useApplicationContext();
  /* const [totalLocked, setTotalLocked] = useState(0n);
  const [totalDebt, setTotalDebt] = useState(0n); */

  const {
    CollateralPrice: { value: collateralPrice = undefined },
    CollateralizationRatio: { value: collateralizationRatio = undefined },
  } = getRun?.getRunTerms?.main ?? {
    CollateralPrice: {},
    CollateralizationRatio: {},
  };

  /* const {
    BldLienAtt: lienBrand = undefined,
    RUN: runBrand = undefined,
    Stake: bldBrand = undefined,
  } = getRun?.getRunTerms?.brands ?? {}; */

  console.log('getRunTerms', getRun?.getRunTerms);

  return (
    <div className={classes.root}>
      <div className={classes.container}>
        <div className={classes.item}>
          <MyGetRun brandToInfo={brandToInfo} />
        </div>
        <div className={classes.item}>
          <MarketDetails
            brandToInfo={brandToInfo}
            collateralPrice={collateralPrice}
            collateralizationRatio={collateralizationRatio}
          />
        </div>
        <div className={classes.item}>
          <Adjust purses={purses} brandToInfo={brandToInfo} />
        </div>
        <div className={classes.item}>
          <History history={getRunHistory} brandToInfo={brandToInfo} />
        </div>
      </div>
    </div>
  );
};

export default GetRun;
