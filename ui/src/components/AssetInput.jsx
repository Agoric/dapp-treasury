import React from 'react';
import clsx from 'clsx';

import { makeStyles } from '@material-ui/core/styles';
import {
  Grid,
  TextField,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@material-ui/core';
import PurseIcon from '@material-ui/icons/BusinessCenter';

import { stringifyValue } from './display';

const useStyles = makeStyles(theme => ({
  select: {
    display: 'flex',
    alignItems: 'center',
  },
  noPadding: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  icon: {
    minWidth: 24,
    marginRight: theme.spacing(2),
  },
}));

export default function AssetInput({
  title,
  purses,
  onPurseChange,
  onAmountChange,
  purse,
  amount,
  disabled,
  purseError,
  amountError,
}) {
  const classes = useStyles();

  return (
    <Grid container spacing={3}>
      <Grid
        item
        xs={12}
        sm={12}
        md={8}
        container
        direction="column"
        alignItems="flex-end"
        justify="flex-end"
      >
        <TextField
          label={title}
          type="number"
          variant="outlined"
          fullWidth
          InputProps={{
            inputProps: {
              min: 0,
            },
          }}
          onChange={onAmountChange}
          onKeyPress={e => {
            const charCode = e.which ? e.which : e.keyCode;

            // Prevent 'minus' character
            if (charCode === 45) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          value={
            amount === null ? '' : stringifyValue(amount, purse.displayInfo)
          }
          disabled={disabled}
          error={amountError}
        />
      </Grid>
      <Grid item xs={12} sm={12} md={4}>
        <TextField
          select
          label="Currency"
          variant="outlined"
          fullWidth
          value={purse === null ? '' : purse.pursePetname}
          onChange={onPurseChange}
          inputProps={{
            className: clsx(purse && classes.noPadding, classes.select),
          }}
          disabled={disabled}
          error={purseError}
        >
          {Array.isArray(purses) && purses.length > 0 ? (
            purses.map(({ pursePetname, brandPetname, value, displayInfo }) => (
              <MenuItem key={pursePetname} value={pursePetname} divider>
                <ListItemIcon className={classes.icon}>
                  <PurseIcon />
                </ListItemIcon>
                <ListItemText
                  primary={pursePetname}
                  secondary={`${stringifyValue(
                    value,
                    displayInfo,
                  )} ${brandPetname}`}
                />
              </MenuItem>
            ))
          ) : (
            <MenuItem key={null} value={null}>
              No purses
            </MenuItem>
          )}
        </TextField>
      </Grid>
    </Grid>
  );
}
/* eslint-enable react/prop-types */
