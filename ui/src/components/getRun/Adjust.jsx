import React, { useEffect, useState } from 'react';

import { AmountMath } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import SendIcon from '@material-ui/icons/Send';
import { makeRatio } from '@agoric/zoe/src/contractSupport';
import { Grid } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import ApproveOfferSB from '../ApproveOfferSB';
import ConfirmOfferTable from './ConfirmOfferTable';
import GetStarted from './GetStarted';
import NatPurseAmountInput from '../vault/VaultManagement/NatPurseAmountInput';
import { adjust } from '../../runLoCStub';

const useStyles = makeStyles(theme => ({
  root: {
    backgroundColor: '#FFFFFF',
    marginBottom: theme.spacing(4),
    borderRadius: '20px',
    color: '#707070',
    fontSize: '22px',
    lineHeight: '27px',
    padding: theme.spacing(4),
    paddingTop: theme.spacing(2),
    minWidth: '50vw',
  },
  settingsToolbar: {
    minHeight: '48px',
    paddingLeft: '20px',
  },
  toolbarIcon: {
    marginRight: theme.spacing(1),
  },
  buttons: {
    marginTop: theme.spacing(1),
  },
  actionChoices: {
    marginBottom: theme.spacing(3),
    maxHeight: '40px',
  },
  button: {
    color: 'white',
  },
  infoText: {
    marginBottom: theme.spacing(3),
    marginTop: theme.spacing(3),
  },
  title: {
    fontSize: '22px',
  },
  tabsRoot: {
    flexGrow: 1,
  },
  break: {
    border: 0,
    height: '1px',
    background: '#E5E5E5',
  },
  step: {
    marginBottom: theme.spacing(3),
  },
  stepTitle: {
    fontSize: '18px',
    color: '#707070',
    marginBottom: theme.spacing(2),
  },
  adjustCollateral: {
    paddingBottom: theme.spacing(3),
  },
  adjustDebt: {
    paddingBottom: theme.spacing(3),
  },
  checkboxLabel: {
    fontSize: '16px',
    color: '#222222',
  },
  form: {
    marginTop: theme.spacing(4),
    marginLeft: 'auto',
    marginRight: 'auto',
    width: 'fit-content',
  },
  confirm: {
    marginTop: theme.spacing(4),
  },
}));

const Adjust = ({
  purses,
  brandToInfo,
  brand,
  debtBrand,
  locked,
  borrowed,
  collateralization,
  runPercent,
  marketPrice,
}) => {
  const [runPurseSelected, setRunPurseSelected] = useState(null);
  const [bldPurseSelected, setBldPurseSelected] = useState(null);
  const [collateralAction, setCollateralAction] = useState('lock');
  const [debtAction, setDebtAction] = useState('borrow');
  const [debtDelta, setDebtDelta] = useState(null);
  const [lockedDelta, setLockedDelta] = useState(null);
  const [getStartedClicked, setGetStartedClicked] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [openApproveOfferSB, setOpenApproveOfferSB] = useState(false);
  const classes = useStyles();

  const hasLockedBld = locked?.numerator?.value > 0;

  const handleTabChange = (_, newTab) => {
    setCurrentTab(newTab);
  };

  const handleApproveOfferSBClose = () => {
    setOpenApproveOfferSB(false);
  };

  useEffect(() => {
    setDebtDelta(null);
    setLockedDelta(null);
    if (currentTab === 0) {
      setCollateralAction('lock');
      setDebtAction('borrow');
    } else {
      setCollateralAction('unlock');
      setDebtAction('repay');
    }
  }, [currentTab]);

  if (!purses || !brand || !debtBrand) {
    return (
      <div>
        <Paper elevation={3} className={classes.root}>
          <Grid container>
            <GetStarted />
          </Grid>
        </Paper>
      </div>
    );
  }

  if (!hasLockedBld && !getStartedClicked) {
    return (
      <Paper elevation={3} className={classes.root}>
        <GetStarted onGetStarted={() => setGetStartedClicked(true)} />
      </Paper>
    );
  }

  const handleCollateralAmountChange = value => {
    const newLockedDelta = AmountMath.make(brand, value);
    setLockedDelta(newLockedDelta);
  };

  const handleDebtAmountChange = value => {
    const newDebtDelta = AmountMath.make(debtBrand, value);
    setDebtDelta(newDebtDelta);
  };

  const adjustCollateral = (
    <Grid item className={classes.step}>
      <Typography variant="h6" className={classes.stepTitle}>
        {collateralAction === 'lock' ? 'Lock BLD' : 'Unlock BLD'}
      </Typography>
      <NatPurseAmountInput
        purses={purses}
        purseSelected={bldPurseSelected}
        onPurseChange={setBldPurseSelected}
        amountValue={lockedDelta && lockedDelta.value}
        onAmountChange={handleCollateralAmountChange}
        brandToFilter={brand}
        brandToInfo={brandToInfo}
      />
    </Grid>
  );

  const adjustDebt = (
    <Grid item className={classes.step}>
      <Typography variant="h6" className={classes.stepTitle}>
        {debtAction === 'borrow' ? 'Borrow RUN' : 'Repay RUN Debt'}
      </Typography>
      <NatPurseAmountInput
        purses={purses}
        purseSelected={runPurseSelected}
        amountValue={debtDelta && debtDelta.value}
        onPurseChange={setRunPurseSelected}
        onAmountChange={handleDebtAmountChange}
        brandToFilter={debtBrand}
        brandToInfo={brandToInfo}
      />
    </Grid>
  );

  const makeOffer = async () => {
    setDebtDelta(null);
    setLockedDelta(null);
    setOpenApproveOfferSB(true);

    const [displayInfo, debtDisplayInfo] = await Promise.all([
      E(brand).getDisplayInfo(),
      E(debtBrand).getDisplayInfo(),
    ]);

    const collateralAmount =
      (lockedDelta ?? AmountMath.makeEmpty(brand)).value /
      10n ** BigInt(displayInfo.decimalPlaces - 2);
    const adjustCollateralRatio = brand && makeRatio(collateralAmount, brand);

    const debtAmount =
      (debtDelta ?? AmountMath.makeEmpty(debtBrand)).value /
      10n ** BigInt(debtDisplayInfo.decimalPlaces - 2);
    const adjustDebtRatio = debtBrand && makeRatio(debtAmount, debtBrand);

    adjust(
      adjustCollateralRatio,
      adjustDebtRatio,
      collateralAction,
      debtAction,
    );
  };

  return (
    <>
      <Paper elevation={3} className={classes.root}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="Borrow" />
          <Tab label="Repay" />
        </Tabs>
        <Grid className={classes.form} container direction="column">
          {adjustCollateral}
          {adjustDebt}
        </Grid>
        {locked && borrowed && (lockedDelta || debtDelta) && (
          <div className={classes.confirm}>
            <hr className={classes.break} />
            <Grid
              container
              spacing={1}
              className={classes.buttons}
              justify="space-evenly"
              alignItems="center"
            >
              <Grid item>
                <ConfirmOfferTable
                  locked={locked}
                  borrowed={borrowed}
                  lockedDelta={lockedDelta}
                  debtDelta={debtDelta}
                  brandToInfo={brandToInfo}
                  collateralization={collateralization}
                  collateralAction={collateralAction}
                  debtAction={debtAction}
                  runPercent={runPercent}
                  marketPrice={marketPrice}
                />
              </Grid>
              <Grid item>
                <Button
                  onClick={() => makeOffer()}
                  className={classes.button}
                  variant="contained"
                  color="primary"
                  startIcon={<SendIcon />}
                >
                  Make Offer
                </Button>
              </Grid>
            </Grid>
          </div>
        )}
      </Paper>
      <ApproveOfferSB
        open={openApproveOfferSB}
        handleClose={handleApproveOfferSBClose}
      />
    </>
  );
};

export default Adjust;
