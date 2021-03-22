import React from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from '@material-ui/core';

import { toPrintedPercent } from '../utils/helper';
import { stringifyAmount } from './display';

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
              {stringifyAmount(locked, lockedDisplayInfo)}{' '}
              {lockedBrandPetname[1]}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Borrowed</TableCell>
            <TableCell align="right">
              {stringifyAmount(debt, debtDisplayInfo)} {debtBrandPetname[1]}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Interest Rate</TableCell>
            <TableCell align="right">
              {toPrintedPercent(stabilityFee, 2n)}%
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
          <TableRow>
            <TableCell>Liquidation Penalty</TableCell>
            <TableCell align="right">
              {toPrintedPercent(liquidationPenalty)}%
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
