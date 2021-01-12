import React from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from '@material-ui/core';

export function VaultSummary({ vault }) {
  const {
    collateralizationRatio,
    debt,
    _interestRate,
    lockedBrandPetname,
    debtBrandPetname,
    liquidated,
    liquidationRatio,
    locked,
    stabilityFee,
    status,
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
              {locked} {lockedBrandPetname}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Borrowed</TableCell>
            <TableCell align="right">
              {debt} {debtBrandPetname}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Interest Rate</TableCell>
            <TableCell align="right">{stabilityFee * 100}%</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Liquidation Ratio</TableCell>
            <TableCell align="right">{liquidationRatio * 100}%</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Collateral Ratio</TableCell>
            <TableCell align="right">{collateralizationRatio}%</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Liquidation Penalty</TableCell>
            <TableCell align="right">3%</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Liquidated</TableCell>
            <TableCell align="right">{liquidated ? 'Yes' : 'No'}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}
