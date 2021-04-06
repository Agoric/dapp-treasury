import React from 'react';

import { makeStyles } from '@material-ui/core/styles';

import {
  Grid,
  TextField,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@material-ui/core';
import PurseIcon from '@material-ui/icons/BusinessCenter';
import {
  makeNatAmountInput,
  makeNatPurseSelector,
} from '@agoric/ui-components';

import { getPurseDecimalPlaces } from './helpers';
import ErrorBoundary from './ErrorBoundary';

// Because we are importing the ui-components from the locally linked
// version of agoric-sdk, we must make sure that we are not using
// multiple instances of React and MaterialUI. Thus, we pass the
// instances to the component.
const NatAmountInput = makeNatAmountInput({ React, TextField });
const NatPurseSelector = makeNatPurseSelector({
  React,
  MenuItem,
  TextField,
  ListItemIcon,
  ListItemText,
  PurseIcon,
  makeStyles,
});

const useStyles = makeStyles(_theme => ({
  natPurseSelector: {
    '&.MuiFormControl-fullWidth': {
      minWidth: '300px',
    },
  },
  natAmountInput: {
    minWidth: '300px',
  },
}));

export default function AssetInput({
  title,
  purseTitle,
  purses,
  onPurseChange,
  onAmountChange,
  purse,
  amount,
  disabled,
  purseError,
  amountError,
}) {
  const classes = useStyles();

  return (
    <ErrorBoundary>
      <Grid container justify="center" spacing={2}>
        <Grid item>
          <NatPurseSelector
            label={`${purseTitle || title} Purse`}
            purses={purses}
            purseSelected={purse}
            onChange={onPurseChange}
            disabled={disabled}
            error={purseError}
            className={classes.natPurseSelector}
          />
        </Grid>
        <Grid item>
          <NatAmountInput
            label={title}
            onChange={onAmountChange}
            value={amount}
            decimalPlaces={getPurseDecimalPlaces(purse)}
            placesToShow={2}
            disabled={disabled || !purse}
            error={amountError}
            className={classes.natAmountInput}
          />
        </Grid>
      </Grid>
    </ErrorBoundary>
  );
}
