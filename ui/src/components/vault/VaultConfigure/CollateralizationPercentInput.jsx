import React from 'react';

import { TextField } from '@material-ui/core';
import { makeRatio } from '@agoric/zoe/src/contractSupport';

import NumberFormatPercent from '../../NumberFormatPercent';
import { makeDisplayFunctions } from '../../helpers';

const CollateralizationPercentInput = ({
  brandToInfo,
  collateralPercent,
  liquidationMargin,
  onChange,
  onError,
  belowMinError,
}) => {
  const { displayPercent } = makeDisplayFunctions(brandToInfo);
  const minValueStr = displayPercent(liquidationMargin, 0);

  return (
    <TextField
      variant="outlined"
      required
      label="Collateralization percent"
      InputProps={{
        inputComponent: NumberFormatPercent,
      }}
      value={displayPercent(collateralPercent, 0)}
      onChange={ev => {
        // TODO: The parsing of a percent into a ratio should be put
        // in ui-components rather than done manually here.
        const numeratorValue = BigInt(ev.target.value || 0);
        if (numeratorValue === 0n) {
          onError(true);
          // return before makeRatio attempted
          return;
        }
        if (numeratorValue < liquidationMargin.numerator.value) {
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
