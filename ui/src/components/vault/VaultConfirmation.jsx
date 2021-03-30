import React from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from '@material-ui/core';

import { stringifyAmountValue } from '@agoric/ui-components';

import { toPrintedPercent } from '../../utils/helper';

import {
  getPurseMathKind,
  getPurseDecimalPlaces,
  displayPetname,
} from '../helpers';

function VaultConfirmation({ vaultConfiguration }) {
  const {
    fundPurse,
    dstPurse,
    toBorrow,
    collateralPercent,
    toLock,
    stabilityFee,
    liquidationMargin,
  } = vaultConfiguration;

  return (
    <TableContainer>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Depositing</TableCell>
            <TableCell align="right">
              {stringifyAmountValue(
                toLock,
                getPurseMathKind(fundPurse),
                getPurseDecimalPlaces(fundPurse),
              )}{' '}
              {displayPetname(fundPurse.brandPetname)} from Purse:{' '}
              {displayPetname(fundPurse.pursePetname)}
            </TableCell>
            <TableCell></TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Borrowing</TableCell>
            <TableCell align="right">
              {dstPurse &&
                stringifyAmountValue(
                  toBorrow,
                  getPurseMathKind(dstPurse),
                  getPurseDecimalPlaces(dstPurse),
                )}{' '}
              {displayPetname(dstPurse.brandPetname)} to Purse:{' '}
              {displayPetname(dstPurse.pursePetname)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Interest Rate</TableCell>
            <TableCell align="right">
              {toPrintedPercent(stabilityFee, 1n)}%
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Liquidation Ratio</TableCell>
            <TableCell align="right">
              {toPrintedPercent(liquidationMargin)}%
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Collateral Ratio</TableCell>
            <TableCell align="right">
              {toPrintedPercent(collateralPercent)}%
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Liquidation Penalty</TableCell>
            <TableCell align="right">3%</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default VaultConfirmation;
