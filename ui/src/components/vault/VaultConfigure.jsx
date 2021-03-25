import React, { useEffect, useCallback } from 'react';

import { makeStyles } from '@material-ui/core/styles';

import {
  Button,
  FormLabel,
  MenuItem,
  Grid,
  TextField,
} from '@material-ui/core';
import {
  multiplyBy,
  divideBy,
  makeRatio,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport';

import { stringifyPurseValue, makeNatAmountInput } from '@agoric/ui-components';

import { toPrintedPercent } from '../../utils/helper';
import NumberFormatPercent from '../NumberFormatPercent';

import dappConstants from '../../generated/defaults.js';
import { getPurseDecimalPlaces } from '../helpers';

import { setVaultParams, resetVault, setVaultConfigured } from '../../store';

// Because we are importing the ui-components from the locally linked
// version of agoric-sdk, we must make sure that we are not using
// multiple instances of React and MaterialUI. Thus, we pass the
// instances to the component.
const NatAmountInput = makeNatAmountInput({ React, TextField });

const { SCONE_BRAND_BOARD_ID } = dappConstants;

const displayPetname = pn => (Array.isArray(pn) ? pn.join('.') : pn);

function computeToBorrow(priceRate, toLock, collateralPercent) {
  const lockPrice = multiplyBy(toLock, priceRate);
  return divideBy(lockPrice, collateralPercent);
}

function computeCollateralRatio(priceRate, toBorrow, toLock) {
  const lockPrice = multiplyBy(toLock, priceRate);
  return makeRatioFromAmounts(lockPrice, toBorrow);
}

function computeToLock(priceRate, toBorrow, collateralPercent) {
  const borrowWithMargin = multiplyBy(toBorrow, collateralPercent);
  return divideBy(borrowWithMargin, priceRate);
}

const useConfigStyles = makeStyles(theme => ({
  root: {
    '& .MuiTextField-root': {
      margin: theme.spacing(1),
      width: '25ch',
    },
  },
  pulse: {
    animation: '$pulse 1.5s ease-in-out 0.5s infinite',
  },
  '@keyframes pulse': {
    '0%': {
      opacity: 1,
    },
    '50%': {
      opacity: 0.4,
    },
    '100%': {
      opacity: 1,
    },
  },
}));

function VaultConfigure({ dispatch, vaultCollateral, purses, vaultParams }) {
  const classes = useConfigStyles();

  const {
    fundPurse,
    dstPurse,
    toBorrow,
    collateralPercent,
    toLock,
  } = vaultParams;

  // Purses with the same brand as the collateral symbol that was
  // selected in the previous step.
  const fundPurses = purses.filter(
    ({ brandPetname }) =>
      vaultCollateral &&
      JSON.stringify(brandPetname) === JSON.stringify(vaultCollateral.petname),
  );

  // Purses with the Scones brand
  const dstPurses = purses.filter(
    ({ brandBoardId }) => brandBoardId === SCONE_BRAND_BOARD_ID,
  );

  useEffect(() => {
    if (!fundPurse && fundPurses.length) {
      dispatch(setVaultParams({ ...vaultParams, fundPurse: fundPurses[0] }));
    }
  }, [fundPurses]);

  useEffect(() => {
    if (!dstPurse && dstPurses.length) {
      dispatch(setVaultParams({ ...vaultParams, dstPurse: dstPurses[0] }));
    }
  }, [dstPurses]);

  const doSort = (a, b) => (a.pursePetname > b.pursePetname ? 1 : -1);
  fundPurses.sort(doSort);
  dstPurses.sort(doSort);

  const toLockDecimalPlaces = getPurseDecimalPlaces(fundPurse);

  // Assume that toBorrow = 5000
  // don't change collateralPercent
  // don't change toLock manually (should change automatically once)
  const adaptBorrowParams = useCallback(
    changes => {
      if (!vaultCollateral) {
        return;
      }
      console.log('UPDATE collateralRato', collateralPercent);
      console.log('UPDATE vault', vaultParams);
      console.log('UPDATE changes PRE', { ...changes });
      // compute a ratio from scones to collateral, so it includes
      // the price and the collateralization ratio
      // TODO this will overestimate the collateral value if there's slippage
      const priceRate = vaultCollateral.marketPrice;
      console.log('UPDATE PRICE', priceRate);

      if ('toBorrow' in changes) {
        if ('collateralPercent' in vaultParams) {
          console.log(1);
          changes.toLock = computeToLock(
            priceRate,
            changes.toBorrow,
            collateralPercent,
          );
        } else if ('toLock' in vaultParams) {
          console.log(2);
          changes.collateralPercent = computeCollateralRatio(
            priceRate,
            changes.toBorrow,
            toLock,
          );
        }
      } else if ('toLock' in changes) {
        if ('collateralPercent' in vaultParams) {
          console.log(3);
          changes.toBorrow = computeToBorrow(
            priceRate,
            changes.toLock,
            collateralPercent,
          );
        } else if ('toBorrow' in vaultParams) {
          console.log(4);
          changes.collateralPercent = computeCollateralRatio(
            priceRate,
            toBorrow,
            changes.toLock,
          );
        }
      } else if ('collateralPercent' in changes) {
        if ('toLock' in vaultParams) {
          console.log(5);
          changes.toBorrow = computeToBorrow(
            priceRate,
            toLock,
            changes.collateralPercent,
          );
        } else if ('toBorrow' in vaultParams) {
          console.log(6);
          changes.toLock = computeToLock(
            priceRate,
            toBorrow,
            changes.collateralPercent,
          );
        }
      } else {
        // No change.
        return;
      }
      console.log('UPDATE changes POST', changes);
      dispatch(setVaultParams({ ...vaultParams, ...changes }));
    },
    [vaultCollateral, toLock, toBorrow, collateralPercent],
  );

  const fundPurseBalance = (fundPurse && fundPurse.value) || 0;
  const balanceExceeded = fundPurseBalance < toLock;
  const fundPurseBalanceDisplay = stringifyPurseValue(fundPurse);

  return (
    <div className={classes.root}>
      <Grid container spacing={1}>
        <Grid item xs={4} spacing={3}>
          <FormLabel component="legend" style={{ paddingTop: 20 }}>
            Choose your {vaultCollateral.petname[1]} vault parameters
          </FormLabel>
          <div style={{ paddingTop: 20 }}>
            {fundPurseBalanceDisplay} {vaultCollateral.petname[1]} Available
            from Funding Purse
          </div>
        </Grid>
        <Grid item xs={4} spacing={3}>
          <TextField
            variant="outlined"
            required
            label="Funding purse"
            select
            value={fundPurse ? JSON.stringify(fundPurse.pursePetname) : ''}
          >
            {fundPurses.map(purse => (
              <MenuItem
                key={JSON.stringify(purse.pursePetname)}
                value={JSON.stringify(purse.pursePetname)}
                onClick={() =>
                  dispatch(
                    setVaultParams({
                      ...vaultParams,
                      fundPurse: purse,
                    }),
                  )
                }
              >
                {purse.pursePetname[1]}
              </MenuItem>
            ))}
          </TextField>
          <NatAmountInput
            required
            label={`${vaultCollateral.petname[1]} to lock up`}
            error={balanceExceeded}
            helperText={balanceExceeded && 'Need to obtain more funds'}
            value={toLock.value}
            decimalPlaces={toLockDecimalPlaces}
            onChange={value =>
              adaptBorrowParams({ toLock: { brand: toLock.brand, value } })
            }
          />
          <TextField
            variant="outlined"
            required
            label="Collateralization percent"
            InputProps={{
              inputComponent: NumberFormatPercent,
            }}
            value={toPrintedPercent(collateralPercent)}
            onChange={ev =>
              adaptBorrowParams({
                collateralPercent: makeRatio(
                  BigInt(ev.target.value || 0),
                  collateralPercent.numerator.brand,
                ),
              })
            }
          />
        </Grid>
        <Grid item xs={4} spacing={3}>
          <NatAmountInput
            required
            label="$MOE to receive"
            value={toBorrow.value}
            decimalPlaces={getPurseDecimalPlaces(dstPurse)}
            onChange={value =>
              adaptBorrowParams({ toBorrow: { brand: toBorrow.brand, value } })
            }
          />
          <TextField
            variant="outlined"
            required
            label="Destination purse"
            select
            value={dstPurse ? JSON.stringify(dstPurse.pursePetname) : ''}
          >
            {dstPurses.map(purse => (
              <MenuItem
                key={JSON.stringify(purse.pursePetname)}
                value={JSON.stringify(purse.pursePetname)}
                onClick={() =>
                  dispatch(
                    setVaultParams({
                      ...vaultParams,
                      dstPurse: purse,
                    }),
                  )
                }
              >
                {displayPetname(purse.pursePetname)}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid container justify="flex-end" alignItems="center">
          <Button
            onClick={() => {
              if (balanceExceeded) {
                // TODO: handle correctly
              } else {
                dispatch(setVaultConfigured(true));
              }
            }}
          >
            Configure
          </Button>
          <Button onClick={() => dispatch(resetVault())}>Cancel</Button>
        </Grid>
      </Grid>
    </div>
  );
}

export default VaultConfigure;
