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
    loadingShimmer: {
      display: 'inline-block',
      height: '15px',
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#e9e9e9',

      '&::after': {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        transform: 'translateX(-100%)',
        backgroundImage:
          'linear-gradient(90deg, #fff0 0, #fff2 20%, #fff8 60%, #fff0)',
        animation: `$shimmer 2.4s infinite`,
        content: '""',
      },
    },
    '@keyframes shimmer': {
      '100%': {
        transform: 'translateX(100%)',
      },
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

  if (vault.status === 'Loading') {
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
            {[...Array(6).keys()].map(i => (
              <TableRow key={i}>
                <TableCell colSpan={3}>
                  <div className={classes.loadingShimmer}></div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  if (vault.status === 'Closed') {
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
              <TableCell align="right">Closed</TableCell>
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
