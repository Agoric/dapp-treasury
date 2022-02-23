import React from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from '@material-ui/core';

import ErrorBoundary from '../ErrorBoundary';

import { displayPetname, makeDisplayFunctions } from '../helpers';

function VaultConfirmation({ vaultConfiguration, brandToInfo }) {
  const {
    fundPurse,
    dstPurse,
    toBorrow,
    collateralPercent,
    toLock,
    interestRate,
    stabilityFee,
    liquidationMargin,
  } = vaultConfiguration;

  const { displayPercent, displayAmount } = makeDisplayFunctions(brandToInfo);

  return (
    <ErrorBoundary>
      <TableContainer>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>Depositing</TableCell>
              <TableCell align="right">
                {displayAmount(toLock)} {displayPetname(fundPurse.brandPetname)}{' '}
                from Purse: {displayPetname(fundPurse.pursePetname)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Borrowing</TableCell>
              <TableCell align="right">
                {displayAmount(toBorrow)}{' '}
                {displayPetname(dstPurse.brandPetname)} to Purse:{' '}
                {displayPetname(dstPurse.pursePetname)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Interest Rate</TableCell>
              <TableCell align="right">
                {displayPercent(interestRate)}%
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Stability Fee</TableCell>
              <TableCell align="right">
                {displayPercent(stabilityFee, 2)}%
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Liquidation Ratio</TableCell>
              <TableCell align="right">
                {displayPercent(liquidationMargin)}%
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Collateral Ratio</TableCell>
              <TableCell align="right">
                {displayPercent(collateralPercent)}%
              </TableCell>
            </TableRow>
            {/* <TableRow>
              <TableCell>Liquidation Penalty</TableCell>
              <TableCell align="right">3%</TableCell>
            </TableRow> */}
          </TableBody>
        </Table>
      </TableContainer>
    </ErrorBoundary>
  );
}

export default VaultConfirmation;
