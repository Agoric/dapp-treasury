// @ts-check

import React from 'react';

import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';

import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';

import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  buttons: {
    align: 'center',
    marginBottom: theme.spacing(3),
  },
  infoText: {
    marginBottom: theme.spacing(3),
  },
}));

const collateralActionChoice = ({ collateralAction, setCollateralAction }) => {
  const classes = useStyles();
  const handleCollateralAction = (_event, newCollateralAction) => {
    setCollateralAction(newCollateralAction);
  };
  return (
    <Box>
      <Grid container direction="row" alignItems="center">
        <Grid item xs={12}>
          <Typography className={classes.infoText}>
            Adjust collateral:
          </Typography>
        </Grid>
        <Grid item>
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
        </Grid>
      </Grid>
    </Box>
  );
};

export default collateralActionChoice;
