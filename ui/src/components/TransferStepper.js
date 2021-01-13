import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';

const useStyles = makeStyles(theme => ({
  root: {
    width: '100%',
  },
  button: {
    marginTop: theme.spacing(1),
    marginRight: theme.spacing(1),
  },
  actionsContainer: {
    marginBottom: theme.spacing(2),
  },
  resetContainer: {
    padding: theme.spacing(3),
  },
}));

export default function TransferStepper({
  eth,
  outgoingEth,
  peggy,
  outgoingPeggy,
  agoric,
}) {
  const classes = useStyles();

  const getActiveStep = () => {
    if (outgoingEth > 0) {
      return 1;
    }
    if (outgoingPeggy > 0) {
      return 3;
    }
    return 5;
  };

  return (
    <div className={classes.root}>
      <Stepper activeStep={getActiveStep()} orientation="vertical">
        <Step key="Ethereum">
          <StepLabel>Ethereum {eth}</StepLabel>
        </Step>
        <Step key="Ethereum Outgoing">
          <StepLabel>{outgoingEth}</StepLabel>
        </Step>
        <Step key="Peggy">
          <StepLabel>Peggy {peggy}</StepLabel>
        </Step>
        <Step key="Peggy Outgoing">
          <StepLabel>{outgoingPeggy}</StepLabel>
        </Step>
        <Step key="Agoric">
          <StepLabel>Agoric {agoric}</StepLabel>
        </Step>
      </Stepper>
    </div>
  );
}
