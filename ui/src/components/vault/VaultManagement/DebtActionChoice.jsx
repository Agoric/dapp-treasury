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
    marginTop: theme.spacing(3),
  },
  infoText: {
    marginTop: theme.spacing(3),
  },
}));

const debtActionChoice = ({ debtAction, setDebtAction }) => {
  const classes = useStyles();
  const handleDebtAction = (_event, newDebtAction) => {
    setDebtAction(newDebtAction);
  };
  return (
    <Box>
      <Grid container direction="row" alignItems="center">
        <Grid item xs={12}>
          <Typography className={classes.infoText}>Adjust debt:</Typography>
        </Grid>
        <Grid item>
          <ToggleButtonGroup
            value={debtAction}
            exclusive
            onChange={handleDebtAction}
            aria-label="Borrow or repay debt"
            className={classes.buttons}
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
        </Grid>
      </Grid>
    </Box>
  );
};

export default debtActionChoice;
