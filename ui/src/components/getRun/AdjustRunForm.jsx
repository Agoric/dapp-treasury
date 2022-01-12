import React, { useState } from 'react';

import { AmountMath } from '@agoric/ertp';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import SendIcon from '@material-ui/icons/Send';
import { Grid } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import CircularProgress from '@material-ui/core/CircularProgress';

import NatPurseAmountInput from '../vault/VaultManagement/NatPurseAmountInput';

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    marginBottom: theme.spacing(4),
    borderRadius: '20px',
    color: '#707070',
    fontSize: '22px',
    lineHeight: '27px',
    padding: theme.spacing(4),
  },
  content: {
    margin: theme.spacing(3),
    paddingBottom: theme.spacing(3),
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
  break: {
    border: 0,
    height: '1px',
    background: '#E5E5E5',
  },
  stepTitle: {
    fontSize: '16px',
    lineHeight: '19px',
    color: '#222222',
  },
  stepText: {
    fontSize: '15px',
    lineHeight: '18px',
    color: '#ADA9A9',
    paddingTop: theme.spacing(2),
  },
  explanation: {
    paddingRight: theme.spacing(5),
  },
  adjustCollateral: {
    paddingTop: theme.spacing(5),
  },
  adjustDebt: {
    paddingTop: theme.spacing(5),
    paddingBottom: theme.spacing(3),
  },
  loadingPlaceholder: {
    height: '126px',
    display: 'flex',
    alignItems: 'center',
    margin: 'auto',
  },
}));

const AdjustVaultForm = ({ purses, brandToInfo, brand, debtBrand }) => {
  const [runPurseSelected, setRunPurseSelected] = useState(null);
  const [bldPurseSelected, setBldPurseSelected] = useState(null);
  const [collateralAction, setCollateralAction] = useState(null);
  const [debtAction, setDebtAction] = useState(null);
  const [debtDelta, setDebtDelta] = useState(null);
  const [lockedDelta, setLockedDelta] = useState(null);
  const classes = useStyles();

  console.log('purses', purses);
  console.log('brand', brand);
  console.log('debtBrand', debtBrand);

  if (!purses || !brand || !debtBrand) {
    return (
      <div>
        <Paper elevation={3} className={classes.root}>
          <Typography className={classes.title}>Adjust</Typography>
          <hr className={classes.break} />
          <Grid container>
            <div className={classes.loadingPlaceholder}>
              <CircularProgress />
            </div>
          </Grid>
        </Paper>
      </div>
    );
  }

  const handleCollateralAction = (_event, newCollateralAction) => {
    setCollateralAction(newCollateralAction);
  };
  const handleDebtAction = (_event, newDebtAction) => {
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

  return (
    <div>
      <Paper elevation={3} className={classes.root}>
        <Typography className={classes.title}>Adjust</Typography>
        <hr className={classes.break} />
        <Grid container>
          <Grid container className={classes.adjustCollateral}>
            <Grid item md={4} className={classes.explanation}>
              <Typography variant="h6" className={classes.stepTitle}>
                Step 1: Lock BLD
              </Typography>
              <Typography className={classes.stepText}>
                Lock or unlock BLD to increase or decrease collateral. Select No
                Action to leave locked BLD unchanged.
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
                <ToggleButton
                  value="noaction"
                  aria-label="take no action with BLD"
                >
                  <Typography>No Action</Typography>
                </ToggleButton>
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
          <Grid container className={classes.adjustDebt}>
            <Grid item md={4} className={classes.explanation}>
              <Typography variant="h6" className={classes.stepTitle}>
                Step 2: Adjust Debt
              </Typography>
              <Typography className={classes.stepText}>
                Borrow additional RUN or repay your existing RUN debt. Select No
                Action to leave debt unchanged.
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
                <ToggleButton value="noaction" aria-label="centered">
                  <Typography>No Action</Typography>
                </ToggleButton>
                <ToggleButton value="borrow" aria-label="left aligned">
                  <Typography>Borrow More</Typography>
                </ToggleButton>
                <ToggleButton value="repay" aria-label="centered">
                  <Typography>Repay Debt</Typography>
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
        </Grid>
        <hr className={classes.break} />
        <Grid
          container
          spacing={1}
          className={classes.buttons}
          justify="flex-end"
        >
          <Grid item>
            <Button
              className={classes.button}
              variant="contained"
              color="primary"
              startIcon={<SendIcon />}
            >
              Make Offer
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </div>
  );
};

export default AdjustVaultForm;
