import React from 'react';

import { TextField } from '@material-ui/core';
import { makeRatio } from '@agoric/zoe/src/contractSupport';

import NumberFormatPercent from '../../NumberFormatPercent';
import { makeDisplayFunctions } from '../../helpers';

const CollateralizationPercentInput = ({
  brandToInfo,
  collateralPercent,
  initialMargin,
  onChange,
  onError,
  belowMinError,
}) => {
  const { displayPercent } = makeDisplayFunctions(brandToInfo);
  const minValueStr = displayPercent(initialMargin);

  return (
    <TextField
      variant="outlined"
      required
      label="Collateralization percent"
      InputProps={{
        inputComponent: NumberFormatPercent,
      }}
      value={displayPercent(collateralPercent)}
      onChange={ev => {
        const numeratorValue = BigInt(ev.target.value || 0);
        if (numeratorValue === 0n) {
          onError(true);
          // return before makeRatio attempted
          return;
        }
        if (numeratorValue < initialMargin.numerator.value) {
          onError(true);
        } else {
          onError(false);
        }
        onChange(
          makeRatio(
            numeratorValue,
            collateralPercent.numerator.brand,
            collateralPercent.denominator.value,
            collateralPercent.denominator.brand,
          ),
        );
      }}
      error={belowMinError}
      helperText={belowMinError && `Percent must be above ${minValueStr}%`}
    />
  );
};

export default CollateralizationPercentInput;
