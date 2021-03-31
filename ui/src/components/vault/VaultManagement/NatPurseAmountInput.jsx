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
  offerBeingMade,
  purses,
  purseSelected,
  amountValue,
  onPurseChange,
  onAmountChange,
  brandToFilter,
  brandToInfo,
}) => {
  const decimalPlaces = getInfoForBrand(brandToInfo, brandToFilter)
    .decimalPlaces;
  const placesToShow = decimalPlaces > 0 ? 2 : 0;

  return (
    <Grid container spacing={3}>
      <Grid item>
        <NatPurseSelector
          label={purseLabel}
          purses={purses}
          purseSelected={purseSelected}
          onChange={newPurse => {
            onPurseChange(newPurse);

            // Set to 0 on purse change because carrying over the
            // value with different decimal places doesn't make sense
            onAmountChange(0n);
          }}
          disabled={offerBeingMade}
          brandToFilter={brandToFilter}
        />
      </Grid>
      <Grid item>
        <NatAmountInput
          label={amountLabel}
          onChange={onAmountChange}
          value={amountValue}
          decimalPlaces={decimalPlaces}
          placesToShow={placesToShow}
          disabled={offerBeingMade}
        />
      </Grid>
    </Grid>
  );
};

export default PurseAmountInput;
