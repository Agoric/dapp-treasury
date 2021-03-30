import React from 'react';

import { makeStyles } from '@material-ui/core/styles';

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from '@material-ui/core';

import { stringifyAmountValue } from '@agoric/ui-components';
import { toPrintedPercent } from '../utils/helper';
import { getInfoForBrand, displayPetname } from './helpers';

const useStyles = makeStyles(theme => {
  return {
    header: {
      color: theme.palette.primary.main,
      fontWeight: 'bold',
    },
  };
});

export function VaultSummary({ vault, brandToInfo, id }) {
  const classes = useStyles();

  const {
    collateralizationRatio, // ratio
    debt, // amount
    interestRate, // ratio
    _liquidated, // boolean
    liquidationRatio, // ratio
    locked, // amount
    status, // string
    // liquidationPenalty, // not present?
  } = vault;

  const lockedInfo = getInfoForBrand(brandToInfo, locked.brand);
  const debtInfo = getInfoForBrand(brandToInfo, debt.brand);

  return (
    <TableContainer>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell className={classes.header}>Id</TableCell>
            <TableCell className={classes.header} align="right">
              {id}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Status</TableCell>
            <TableCell align="right">{status}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Deposited</TableCell>
            <TableCell align="right">
              {stringifyAmountValue(
                locked,
                lockedInfo.amountMathKind,
                lockedInfo.decimalPlaces,
              )}{' '}
              {displayPetname(lockedInfo.petname)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Borrowed</TableCell>
            <TableCell align="right">
              {stringifyAmountValue(
                debt,
                debtInfo.amountMathKind,
                debtInfo.decimalPlaces,
              )}{' '}
              {displayPetname(debtInfo.petname)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Interest Rate</TableCell>
            <TableCell align="right">
              {toPrintedPercent(interestRate, 2n)}%
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Liquidation Ratio</TableCell>
            <TableCell align="right">
              {toPrintedPercent(liquidationRatio)}%
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Collateral Ratio</TableCell>
            <TableCell align="right">
              {toPrintedPercent(collateralizationRatio)}%
            </TableCell>
          </TableRow>
          {/* <TableRow>
            <TableCell>Liquidation Penalty</TableCell>
            <TableCell align="right">
              {toPrintedPercent(liquidationPenalty)}%
            </TableCell>
          </TableRow> */}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
