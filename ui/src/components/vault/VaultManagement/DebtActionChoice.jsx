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

const debtActionChoice = ({ debtAction, setDebtAction }) => {
  const classes = useStyles();
  const handleDebtAction = (_event, newDebtAction) => {
    if (newDebtAction !== null) {
      setDebtAction(newDebtAction);
    }
  };
  return (
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
  );
};

export default debtActionChoice;
