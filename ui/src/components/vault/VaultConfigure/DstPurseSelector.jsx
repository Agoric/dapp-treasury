import React from 'react';

import { TextField, MenuItem } from '@material-ui/core';

import { displayPetname } from '../../helpers';

const DstPurseSelector = ({ dstPurses, dstPurse, setDstPurse }) => (
  <TextField
    variant="outlined"
    required
    label="To purse"
    select
    value={dstPurse ? JSON.stringify(dstPurse.pursePetname) : ''}
  >
    {dstPurses.map(purse => (
      <MenuItem
        key={JSON.stringify(purse.pursePetname)}
        value={JSON.stringify(purse.pursePetname)}
        onClick={() => setDstPurse(purse)} // needs to set as purse and not petname
      >
        {displayPetname(purse.pursePetname)}
      </MenuItem>
    ))}
  </TextField>
);

export default DstPurseSelector;
