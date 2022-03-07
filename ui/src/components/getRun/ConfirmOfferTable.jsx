import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

import { AmountMath } from '@agoric/ertp';
import { makeDisplayFunctions } from '../helpers';

const useStyles = makeStyles(_ => ({
  table: {
    '& > .MuiTableCell-root': {
      borderBottom: 'none',
    },
  },
  tableContainer: {
    width: 'fit-content',
  },
  row: {
    '& > th, td': {
      borderBottom: 'none',
    },
    '& > th': {
      paddingLeft: 0,
    },
    '& > td': {
      paddingLeft: 0,
      fontSize: '18px',
      lineHeight: '24px',
      color: '#707070',
    },
  },
  left: {
    paddingLeft: 0,
  },
  rowHeader: {
    '& > *': {
      fontSize: '16px',
    },
  },
  new: {
    color: 'rgba(0, 0, 0, 0.87)',
  },
}));

const ConfirmOfferTable = ({
  locked,
  borrowed,
  lockedDelta,
  debtDelta,
  collateralAction,
  debtAction,
  brandToInfo,
}) => {
  const { displayAmount } = makeDisplayFunctions(brandToInfo);
  const classes = useStyles();

  let newLockedValue =
    collateralAction === 'lock'
      ? locked.value + (lockedDelta?.value ?? 0n)
      : locked.value - (lockedDelta?.value ?? 0n);
  let newLockedSignum = '';
  if (newLockedValue < 0) {
    newLockedSignum = '-';
    newLockedValue *= -1n;
  }

  let newBorrowedValue =
    debtAction === 'borrow'
      ? borrowed.value + (debtDelta?.value ?? 0n)
      : borrowed.value - (debtDelta?.value ?? 0n);
  let newBorrowedSignum = '';
  if (newBorrowedValue < 0) {
    newBorrowedSignum = '-';
    newBorrowedValue *= -1n;
  }

  const newLocked = AmountMath.make(locked.brand, newLockedValue);
  const newBorrowed = AmountMath.make(borrowed.brand, newBorrowedValue);

  return (
    <TableContainer className={classes.tableContainer}>
      <Table className={classes.table} size="small">
        <TableHead>
          <TableRow className={[classes.rowHeader, classes.row].join(' ')}>
            <TableCell>Liened</TableCell>
            <TableCell>Borrowed</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow className={classes.row}>
            <TableCell>
              {displayAmount(locked)} -&gt;{' '}
              <span
                className={
                  displayAmount(newLocked) !== displayAmount(locked) ||
                  newLockedSignum === '-'
                    ? classes.new
                    : ''
                }
              >
                {newLockedSignum}
                {displayAmount(newLocked)} BLD
              </span>
            </TableCell>
            <TableCell>
              {displayAmount(borrowed)} -&gt;{' '}
              <span
                className={
                  displayAmount(newBorrowed) !== displayAmount(borrowed) ||
                  newBorrowedSignum === '-'
                    ? classes.new
                    : ''
                }
              >
                {newBorrowedSignum}
                {displayAmount(newBorrowed)} RUN
              </span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ConfirmOfferTable;
