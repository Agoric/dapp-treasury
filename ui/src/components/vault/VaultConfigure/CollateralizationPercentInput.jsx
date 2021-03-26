import React from 'react';

import { TextField } from '@material-ui/core';
import { makeRatio } from '@agoric/zoe/src/contractSupport';

import { toPrintedPercent } from '../../../utils/helper';
import NumberFormatPercent from '../../NumberFormatPercent';

const CollateralizationPercentInput = ({ collateralPercent, onChange }) => (
  <TextField
    variant="outlined"
    required
    label="Collateralization percent"
    InputProps={{
      inputComponent: NumberFormatPercent,
    }}
    value={toPrintedPercent(collateralPercent)}
    onChange={ev => {
      const numeratorValue = BigInt(ev.target.value || 0);
      return onChange(
        makeRatio(
          numeratorValue,
          collateralPercent.numerator.brand,
          collateralPercent.denominator.value,
          collateralPercent.denominator.brand,
        ),
      );
    }}
  />
);

export default CollateralizationPercentInput;
