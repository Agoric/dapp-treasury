import React, { useEffect, useState } from 'react';

import { AmountMath } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import SendIcon from '@material-ui/icons/Send';
import { Grid, TextField } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { makeNatAmountInput, filterPurses } from '@agoric/ui-components';

import ApproveOfferSB from '../ApproveOfferSB';
import ConfirmOfferTable from './ConfirmOfferTable';
import GetStarted from './GetStarted';
import NatPurseAmountInput from '../vault/VaultManagement/NatPurseAmountInput';
import { icons, defaultIcon } from '../../utils/icons';
import { makeDisplayFunctions, getPurseDecimalPlaces } from '../helpers';

const NatAmountInput = makeNatAmountInput({ React, TextField });

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
    height: theme.spacing(70),
    width: '100%',
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
  bldPurseSelector: {
    display: 'flex',
    flexDirection: 'row',
    border: '1px solid rgba(0,0,0,0.2)',
    borderRadius: 4,
    paddingTop: 8,
    paddingBottom: 6,
    paddingLeft: 6,
    paddingRight: 10,
    width: 'fit-content',
    boxSizing: 'border-box',
    marginRight: 8,
    marginBottom: 16,
  },
  bldPurseIcon: {
    marginRight: 8,
  },
  bldPurse: {
    fontSize: 16,
    lineHeight: '18px',
    color: '#000',
  },
  bldBalance: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-around',
  },
  stakedAmount: {
    fontSize: 14,
    lineHeight: '16px',
  },
  collateralForm: {},
  bldPurseLabel: {
    position: 'absolute',
    background: '#fff',
    fontSize: 12,
    lineHeight: '12px',
    marginTop: '-14px',
    marginLeft: '4px',
    padding: '0 4px',
    fontWeight: 400,
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
  accountState,
  walletP,
  lienBrand,
  getRun,
}) => {
  const classes = useStyles();

  const [runPurseSelected, setRunPurseSelected] = useState(null);
  const [collateralAction, setCollateralAction] = useState('lock');
  const [debtAction, setDebtAction] = useState('borrow');
  const [debtDelta, setDebtDelta] = useState(null);
  const [lockedDelta, setLockedDelta] = useState(null);
  const [getStartedClicked, setGetStartedClicked] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [openApproveOfferSB, setOpenApproveOfferSB] = useState(false);

  const { displayAmount } = makeDisplayFunctions(brandToInfo);

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

  if (!purses || !brand || !debtBrand || !accountState) {
    return (
      <div>
        <Paper elevation={3} className={classes.root}>
          <GetStarted />
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
  locked = AmountMath.makeEmpty(brand);
  borrowed = AmountMath.makeEmpty(debtBrand);

  const bldPurses = filterPurses(purses, brand);
  // TODO: find a better way to identify the staking purse.
  const bldStakingPurse = bldPurses.length > 0 ? bldPurses[0] : null;

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
      <div className={classes.collateralForm}>
        <div className={classes.bldPurseSelector}>
          <div className={classes.bldPurseLabel}>Purse</div>
          <img
            className={classes.bldPurseIcon}
            alt="icon"
            src={icons[new Map(brandToInfo).get(brand).petname] ?? defaultIcon}
            height="40px"
            width="40px"
          />
          <div className={classes.bldBalance}>
            <div className={classes.bldPurse}>
              {bldStakingPurse.pursePetname}
            </div>
            <div className={classes.stakedAmount}>
              {displayAmount(accountState.bonded)} staked
            </div>
          </div>
        </div>
        <NatAmountInput
          label="Amount"
          onChange={handleCollateralAmountChange}
          value={lockedDelta && lockedDelta.value}
          decimalPlaces={getPurseDecimalPlaces(bldStakingPurse)}
          placesToShow={2}
        />
      </div>
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

    const id = `${Date.now()}`;
    const invitation = E(getRun.getRunApi).makeLoanInvitation();
    const collateralAmount = AmountMath.make(
      lienBrand,
      lockedDelta?.value ?? 0n,
    );
    const debtAmount = AmountMath.make(debtBrand, debtDelta?.value ?? 0n);

    const offerConfig = {
      id,
      invitation,
      proposalTemplate: {
        give: {
          Attestation: {
            value: collateralAmount.value,
            pursePetname: bldStakingPurse.pursePetname,
            brand: lienBrand,
          },
        },
        want: {
          RUN: {
            pursePetname: runPurseSelected.pursePetname,
            value: debtAmount.value,
          },
        },
      },
    };

    console.log('OFFER CONFIG', offerConfig);

    E(walletP).addOffer(offerConfig);
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
      </Paper>
      <ApproveOfferSB
        open={openApproveOfferSB}
        handleClose={handleApproveOfferSBClose}
      />
    </>
  );
};

export default Adjust;
