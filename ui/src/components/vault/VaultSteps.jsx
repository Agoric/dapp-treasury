import React, { useState, useEffect } from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { Stepper, Step, StepLabel } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  stepper: {
    padding: theme.spacing(3, 0, 5),
  },
}));

export default function VaultSteps({ vaultCollateral, vaultConfiguration }) {
  const classes = useStyles();

  const steps = ['Choose Collateral', 'Configure', 'Create'];

  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!vaultCollateral) {
      setActiveStep(0);
    } else if (!vaultConfiguration) {
      setActiveStep(1);
    } else {
      setActiveStep(2);
    }
  }, [vaultCollateral, vaultConfiguration]);

  return (
    <Stepper
      alternativeLabel
      activeStep={activeStep}
      className={classes.stepper}
    >
      {steps.map(label => (
        <Step key={label}>
          <StepLabel>{label}</StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}
