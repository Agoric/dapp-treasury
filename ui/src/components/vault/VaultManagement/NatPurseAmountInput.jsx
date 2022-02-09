import React from 'react';

import {
  Grid,
  TextField,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@material-ui/core';
import PurseIcon from '@material-ui/icons/BusinessCenter';

import { makeStyles } from '@material-ui/core/styles';

import {
  filterPurses,
  makeNatAmountInput,
  makeNatPurseSelector,
} from '@agoric/ui-components';
import { getInfoForBrand } from '../../helpers';

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

const PurseAmountInput = ({
  purseLabel = 'Purse to use',
  amountLabel = 'Amount',
  purses,
  purseSelected,
  amountValue,
  onPurseChange,
  onAmountChange,
  brandToFilter,
  brandToInfo,
  error = null,
  purseSelectorDisabled = false,
  amountInputDisabled = false,
}) => {
  const decimalPlaces = getInfoForBrand(brandToInfo, brandToFilter)
    .decimalPlaces;
  const placesToShow = decimalPlaces > 0 ? 2 : 0;

  const pursesFiltered = filterPurses(purses, brandToFilter);
  const defaultPurse = pursesFiltered.length > 0 ? pursesFiltered[0] : null;
  if (purseSelected === null && defaultPurse !== null) {
    onPurseChange(defaultPurse);
  }

  return (
    <Grid container spacing={3}>
      <Grid item>
        <NatPurseSelector
          label={purseLabel}
          purses={pursesFiltered}
          purseSelected={purseSelected}
          onChange={onPurseChange}
          disabled={purseSelectorDisabled}
        />
      </Grid>
      <Grid item>
        <NatAmountInput
          label={amountLabel}
          onChange={onAmountChange}
          value={amountValue}
          decimalPlaces={decimalPlaces}
          placesToShow={placesToShow}
          disabled={amountInputDisabled}
          error={error !== null}
          helperText={error ?? ' '}
        />
      </Grid>
    </Grid>
  );
};

export default PurseAmountInput;
