import React, { useState, useEffect } from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { Stepper, Step, StepLabel } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  stepper: {
    padding: theme.spacing(3, 0, 5),
  },
}));

/* eslint-disable react/prop-types */
export default function TransactionSummary({
  inputPurse,
  outputPurse,
  inputAmount,
  outputAmount,
}) {
  const classes = useStyles();

  const steps = ['Select Currencies', 'Enter Amounts', 'Swap'];

  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!inputPurse || !outputPurse) {
      setActiveStep(0);
    } else if (!(inputAmount > 0n) || !(outputAmount > 0n)) {
      setActiveStep(1);
    } else {
      setActiveStep(2);
    }
  }, [inputPurse, outputPurse, inputAmount, outputAmount]);

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
/* eslint-enable react/prop-types */
