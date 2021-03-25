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

export default function AssetInput({
  title,
  purses,
  onPurseChange,
  onAmountChange,
  purse,
  amount,
  disabled,
  purseError,
  amountError,
}) {
  return (
    <Grid container spacing={3}>
      <Grid
        item
        xs={12}
        sm={12}
        md={8}
        container
        direction="column"
        alignItems="flex-end"
        justify="flex-end"
      >
        <NatAmountInput
          label={title}
          onChange={onAmountChange}
          value={amount}
          decimalPlaces={getPurseDecimalPlaces(purse)}
          placesToShow={2}
          disabled={disabled}
          error={amountError}
        />
      </Grid>
      <Grid item xs={12} sm={12} md={4}>
        <NatPurseSelector
          label={`${title} Purse`}
          purses={purses}
          purseSelected={purse}
          onChange={onPurseChange}
          disabled={disabled}
          error={purseError}
        />
      </Grid>
    </Grid>
  );
}
