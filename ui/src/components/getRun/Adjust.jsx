import React, { useEffect, useState } from 'react';

import { AmountMath } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Checkbox from '@material-ui/core/Checkbox';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
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
  stepTitle: {
    fontSize: '18px',
    color: '#707070',
    marginRight: theme.spacing(8),
  },
  stepText: {
    fontSize: '15px',
    lineHeight: '18px',
    color: '#ADA9A9',
    paddingTop: theme.spacing(2),
  },
  adjustCollateral: {
    paddingTop: theme.spacing(5),
    paddingBottom: theme.spacing(3),
  },
  adjustDebt: {
    paddingTop: theme.spacing(5),
    paddingBottom: theme.spacing(3),
  },
  checkboxLabel: {
    fontSize: '16px',
    color: '#222222',
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
  const [alsoAdjustRun, setAlsoAdjustRun] = useState(false);
  const [alsoAdjustBld, setAlsoAdjustBld] = useState(false);
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
    setDebtAction('borrow');
    setCollateralAction('lock');
    setAlsoAdjustBld(false);
    setAlsoAdjustRun(false);
  }, [currentTab]);

  useEffect(() => {
    setDebtDelta(null);
    setDebtAction('borrow');
  }, [alsoAdjustRun]);

  useEffect(() => {
    setLockedDelta(null);
    setCollateralAction('lock');
  }, [alsoAdjustBld]);

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

  const handleCollateralAction = (_event, newCollateralAction) => {
    if (!newCollateralAction?.length) {
      return;
    }

    setCollateralAction(newCollateralAction);
  };
  const handleDebtAction = (_event, newDebtAction) => {
    if (!newDebtAction?.length) {
      return;
    }

    setDebtAction(newDebtAction);
  };

  const handleCollateralAmountChange = value => {
    const newLockedDelta = AmountMath.make(brand, value);
    setLockedDelta(newLockedDelta);
  };

  const handleDebtAmountChange = value => {
    const newDebtDelta = AmountMath.make(debtBrand, value);
    setDebtDelta(newDebtDelta);
  };

  const adjustCollateral = (
    <Grid container className={classes.adjustCollateral}>
      <Grid item md={4} className={classes.explanation}>
        <Typography variant="h6" className={classes.stepTitle}>
          Lock or unlock BLD to adjust your collateral.
        </Typography>
      </Grid>
      <Grid item md={8}>
        <ToggleButtonGroup
          value={collateralAction}
          exclusive
          onChange={handleCollateralAction}
          aria-label="lock or unlock collateral"
          className={classes.actionChoices}
        >
          <ToggleButton value="lock" aria-label="lock BLD">
            <Typography>Lock</Typography>
          </ToggleButton>
          <ToggleButton value="unlock" aria-label="unlock BLD">
            <Typography>Unlock</Typography>
          </ToggleButton>
        </ToggleButtonGroup>
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
    </Grid>
  );

  const adjustDebt = (
    <Grid container className={classes.adjustDebt}>
      <Grid item md={4} className={classes.explanation}>
        <Typography variant="h6" className={classes.stepTitle}>
          Borrow additional RUN or repay your existing RUN debt.
        </Typography>
      </Grid>
      <Grid item md={8}>
        <ToggleButtonGroup
          value={debtAction}
          exclusive
          onChange={handleDebtAction}
          aria-label="Borrow or repay debt"
          className={classes.actionChoices}
        >
          <ToggleButton value="borrow" aria-label="left aligned">
            <Typography>Borrow</Typography>
          </ToggleButton>
          <ToggleButton value="repay" aria-label="centered">
            <Typography>Repay</Typography>
          </ToggleButton>
        </ToggleButtonGroup>
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
    </Grid>
  );

  const handleAlsoAdjustRunChange = event => {
    setAlsoAdjustRun(event.target.checked);
  };

  const bldTab = (
    <>
      {adjustCollateral}
      {lockedDelta && (
        <div className={classes.checkboxLabel}>
          <FormControlLabel
            control={
              <Checkbox
                checked={alsoAdjustRun}
                onChange={handleAlsoAdjustRunChange}
                color="primary"
              />
            }
            label="Adjust Debt"
          />
        </div>
      )}
      {alsoAdjustRun && adjustDebt}
    </>
  );

  const handleAlsoAdjustBldChange = event => {
    setAlsoAdjustBld(event.target.checked);
  };

  const runTab = (
    <>
      {adjustDebt}
      {debtDelta && (
        <div className={classes.checkboxLabel}>
          <FormControlLabel
            control={
              <Checkbox
                checked={alsoAdjustBld}
                onChange={handleAlsoAdjustBldChange}
                color="primary"
              />
            }
            label="Adjust Collateral"
          />
        </div>
      )}
      {alsoAdjustBld && adjustCollateral}
    </>
  );

  const makeOffer = async () => {
    setDebtDelta(null);
    setLockedDelta(null);
    setAlsoAdjustBld(false);
    setAlsoAdjustRun(false);
    setDebtAction('borrow');
    setCollateralAction('lock');
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
          <Tab label="Collateral" />
          <Tab label="Debt" />
        </Tabs>
        <Grid container>{currentTab === 0 ? bldTab : runTab}</Grid>
        {locked && borrowed && (lockedDelta || debtDelta) && (
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
