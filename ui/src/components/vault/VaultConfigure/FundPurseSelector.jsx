import React from 'react';

import { TextField, MenuItem } from '@material-ui/core';

import { displayPetname } from '../../helpers';

const FundPurseSelector = ({ fundPurses, fundPurse, setFundPurse }) => (
  <TextField
    variant="outlined"
    required
    label="From collateral purse"
    select
    value={fundPurse ? JSON.stringify(fundPurse.pursePetname) : ''}
  >
    {fundPurses.map(purse => (
      <MenuItem
        key={JSON.stringify(purse.pursePetname)}
        value={JSON.stringify(purse.pursePetname)}
        onClick={() => setFundPurse(purse)} // needs to set as purse and not petname
      >
        {displayPetname(purse.pursePetname)}
      </MenuItem>
    ))}
  </TextField>
);
export default FundPurseSelector;

// //
