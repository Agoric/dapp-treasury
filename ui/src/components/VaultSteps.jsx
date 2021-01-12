import React, { useState, useEffect } from 'react';

import { makeStyles } from '@material-ui/core/styles';
import { Stepper, Step, StepLabel } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  stepper: {
    padding: theme.spacing(3, 0, 5),
  },
}));

/* eslint-disable react/prop-types */
export default function VaultSteps({
  connected,
  collateralBrand,
  vaultParams,
}) {
  const classes = useStyles();

  const steps = ['Connect', 'Choose Collateral', 'Configure', 'Create'];

  const [activeStep, setActiveStep] = useState(0);

  const hasVaultParams = ({ fundPurse, dstPurse, toBorrow, toLock }) =>
    fundPurse && dstPurse && toBorrow && toLock;

  useEffect(() => {
    if (!connected) {
      setActiveStep(0);
    } else if (!collateralBrand) {
      setActiveStep(1);
    } else if (!hasVaultParams(vaultParams)) {
      setActiveStep(2);
    } else {
      setActiveStep(3);
    }
  }, [connected, collateralBrand, vaultParams]);

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
