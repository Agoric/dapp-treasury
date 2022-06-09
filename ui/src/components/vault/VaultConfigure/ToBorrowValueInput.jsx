import React from 'react';
import { TextField } from '@material-ui/core';

import { makeNatAmountInput } from '@agoric/ui-components';

// Because we are importing the ui-components from the locally linked
// version of agoric-sdk, we must make sure that we are not using
// multiple instances of React and MaterialUI. Thus, we pass the
// instances to the component.
const NatAmountInput = makeNatAmountInput({ React, TextField });

const ToBorrowValueInput = ({ toBorrow, toBorrowDecimalPlaces, onChange }) => (
  <NatAmountInput
    required
    label="RUN to receive"
    value={toBorrow.value}
    decimalPlaces={toBorrowDecimalPlaces}
    onChange={value => onChange({ brand: toBorrow.brand, value })}
  />
);

export default ToBorrowValueInput;
