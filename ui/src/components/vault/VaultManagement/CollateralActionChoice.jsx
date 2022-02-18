// @ts-check

import React from 'react';

import Typography from '@material-ui/core/Typography';

import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';

import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  buttons: {
    marginBottom: theme.spacing(3),
    maxHeight: '40px',
  },
}));

const collateralActionChoice = ({ collateralAction, setCollateralAction }) => {
  const classes = useStyles();
  const handleCollateralAction = (_event, newCollateralAction) => {
    if (newCollateralAction !== null) {
      setCollateralAction(newCollateralAction);
    }
  };
  return (
    <ToggleButtonGroup
      value={collateralAction}
      exclusive
      onChange={handleCollateralAction}
      aria-label="Deposit or withdraw collateral"
      className={classes.buttons}
    >
      <ToggleButton
        value="noaction"
        aria-label="take no action with collateral"
      >
        <Typography>No Action</Typography>
      </ToggleButton>
      <ToggleButton value="deposit" aria-label="deposit collateral">
        <Typography>Deposit</Typography>
      </ToggleButton>
      <ToggleButton value="withdraw" aria-label="withdraw collateral">
        <Typography>Withdraw</Typography>
      </ToggleButton>
    </ToggleButtonGroup>
  );
};

export default collateralActionChoice;
