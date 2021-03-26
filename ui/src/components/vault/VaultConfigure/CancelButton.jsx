import React from 'react';

import { Button } from '@material-ui/core';

import { resetVault } from '../../../store';

// Canceling sets the vaultCollateral and vaultConfiguration to null, causing
// the user to go back to choosing the collateral brand

const CancelButton = ({ dispatch }) => (
  <Button onClick={() => dispatch(resetVault())}>Cancel</Button>
);

export default CancelButton;
