import React, { useState, useEffect } from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { Stepper, Step, StepLabel } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  stepper: {
    padding: theme.spacing(3, 0, 5),
  },
}));

export default function VaultSteps({
  connected,
  vaultCollateral,
  vaultConfiguration,
}) {
  const classes = useStyles();

  const steps = ['Connect', 'Choose Collateral', 'Configure', 'Create'];

  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!connected) {
      setActiveStep(0);
    } else if (!vaultCollateral) {
      setActiveStep(1);
    } else if (!vaultConfiguration) {
      setActiveStep(2);
    } else {
      setActiveStep(3);
    }
  }, [connected, vaultCollateral, vaultConfiguration]);

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
