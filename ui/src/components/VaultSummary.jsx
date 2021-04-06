import React from 'react';

import { makeStyles } from '@material-ui/core/styles';

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from '@material-ui/core';

import { makeDisplayFunctions } from './helpers';

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

  if (vault.status === 'Pending Wallet Acceptance') {
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
              <TableCell align="right">{vault.status}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={3}>
                Please accept the offer in your wallet.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  if (vault.status === 'Error in offer') {
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
              <TableCell align="right">{vault.status}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={3}>
                <details style={{ whiteSpace: 'pre-wrap' }}>
                  {vault.err && vault.err.toString()}
                </details>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

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

  const {
    displayPercent,
    displayAmount,
    displayBrandPetname,
  } = makeDisplayFunctions(brandToInfo);

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
              {displayAmount(locked)} {displayBrandPetname(locked.brand)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Borrowed</TableCell>
            <TableCell align="right">
              {displayAmount(debt)} {displayBrandPetname(debt.brand)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Interest Rate</TableCell>
            <TableCell align="right">
              {interestRate ? displayPercent(interestRate) : '--'}%
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Liquidation Ratio</TableCell>
            <TableCell align="right">
              {displayPercent(liquidationRatio)}%
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Collateral Ratio</TableCell>
            <TableCell align="right">
              {displayPercent(collateralizationRatio)}%
            </TableCell>
          </TableRow>
          {/* <TableRow>
            <TableCell>Liquidation Penalty</TableCell>
            <TableCell align="right">
              {displayPercent(liquidationPenalty)}%
            </TableCell>
          </TableRow> */}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
