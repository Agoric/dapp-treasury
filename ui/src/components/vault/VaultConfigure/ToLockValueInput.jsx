import React from 'react';
import { TextField } from '@material-ui/core';

import { makeNatAmountInput } from '@agoric/ui-components';

import { displayPetname } from '../../helpers';

// Because we are importing the ui-components from the locally linked
// version of agoric-sdk, we must make sure that we are not using
// multiple instances of React and MaterialUI. Thus, we pass the
// instances to the component.
const NatAmountInput = makeNatAmountInput({ React, TextField });

const ToLockValueInput = ({
  collateralPetname,
  balanceExceeded,
  toLock,
  toLockDecimalPlaces,
  onChange,
}) => (
  <NatAmountInput
    required
    label={`${displayPetname(collateralPetname)} to lock up`}
    error={balanceExceeded}
    helperText={balanceExceeded && 'Need to obtain more funds'}
    value={toLock.value}
    decimalPlaces={toLockDecimalPlaces}
    onChange={value => onChange({ brand: toLock.brand, value })}
  />
);

export default ToLockValueInput;
