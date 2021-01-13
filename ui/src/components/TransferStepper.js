import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Typography from '@material-ui/core/Typography';

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

function getSteps() {
  return ['Ethereum', 'Ethereum Outgoing', 'Peggy', 'Peggy Outgoing', 'Agoric'];
}

export default function TransferStepper({
  eth,
  outgoingEth,
  peggy,
  outgoingPeggy,
  agoric,
}) {
  const classes = useStyles();
  const steps = getSteps();

  function getStepContent(step) {
    switch (step) {
      case 0:
        return <Typography>{eth}</Typography>;
      case 1:
        return <Typography>{outgoingEth}</Typography>;
      case 2:
        return <Typography>{peggy}</Typography>;
      case 3:
        return <Typography>{outgoingPeggy}</Typography>;
      case 4:
        return <Typography>{agoric}</Typography>;
      default:
        return 'Unknown step';
    }
  }

  const getActiveStep = () => {
    if (agoric > 0) {
      return 5;
    }
    if (outgoingPeggy > 0) {
      return 4;
    }
    return 3;
  };

  return (
    <div className={classes.root}>
      <Stepper activeStep={getActiveStep()} orientation="vertical">
        {steps.map((label, index) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
            <Typography>{getStepContent(index)}</Typography>
          </Step>
        ))}
      </Stepper>
    </div>
  );
}
