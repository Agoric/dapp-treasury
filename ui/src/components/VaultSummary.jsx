import React from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from '@material-ui/core';

import { stringifyValue } from './display';

export function VaultSummary({ vault }) {
  const {
    collateralizationRatio,
    debt,
    _interestRate,
    lockedBrandPetname,
    debtBrandPetname,
    _liquidated,
    liquidationRatio,
    locked,
    stabilityFee,
    status,
    liquidationPenalty,
    lockedDisplayInfo,
    debtDisplayInfo,
  } = vault;

  return (
    <TableContainer>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Status</TableCell>
            <TableCell align="right">{status}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Deposited</TableCell>
            <TableCell align="right">
              {stringifyValue(locked, lockedDisplayInfo)} {lockedBrandPetname}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Borrowed</TableCell>
            <TableCell align="right">
              {stringifyValue(debt, debtDisplayInfo)} {debtBrandPetname}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Interest Rate</TableCell>
            <TableCell align="right">{stabilityFee}%</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Liquidation Ratio</TableCell>
            <TableCell align="right">{liquidationRatio}%</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Collateral Ratio</TableCell>
            <TableCell align="right">{collateralizationRatio}%</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Liquidation Penalty</TableCell>
            <TableCell align="right">{liquidationPenalty}%</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
