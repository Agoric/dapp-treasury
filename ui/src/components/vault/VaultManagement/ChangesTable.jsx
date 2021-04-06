import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import { makeDisplayFunctions } from '../../helpers';

const useStyles = makeStyles(theme => ({
  table: {
    minWidth: 650,
  },
  rowHeader: {
    '& > *': {
      backgroundColor: theme.palette.secondary.main,
      color: 'white',
    },
  },
}));

function createData(name, currentValue, pendingChanges) {
  return { name, currentValue, pendingChanges };
}

const ChangesTable = ({
  locked,
  lockedAfterDelta,
  collateralizationRatio,
  newCollateralizationRatio,
  debt,
  debtAfterDelta,
  brandToInfo,
}) => {
  const classes = useStyles();

  const {
    displayAmount,
    displayPercent,
    displayBrandPetname,
  } = makeDisplayFunctions(brandToInfo);

  const getDeltaString = (oldAmount, newAmount) => {
    if (
      typeof newAmount.value !== 'bigint' ||
      typeof oldAmount.value !== 'bigint'
    ) {
      return '...';
    }
    const deltaValue = newAmount.value - oldAmount.value;
    if (deltaValue === 0n) {
      return '...';
    }
    const dispDelta = displayAmount({
      value: deltaValue,
      brand: oldAmount.brand,
    });
    const dispNew = displayAmount(newAmount);
    if (deltaValue > 0n) {
      return `+${dispDelta} (${dispNew})`;
    }
    if (deltaValue < 0n) {
      return `${dispDelta} (${dispNew})`;
    }
    return '...';
  };

  const lockedDeltaString = getDeltaString(locked, lockedAfterDelta);

  const debtDeltaString = getDeltaString(debt, debtAfterDelta);

  const rows = [
    createData(
      'Collateral Locked',
      `${displayAmount(locked)} ${displayBrandPetname(locked.brand)}`,
      lockedDeltaString,
    ),
    createData(
      'Collateralization Ratio',
      `${displayPercent(collateralizationRatio)}%`,
      newCollateralizationRatio
        ? `${displayPercent(newCollateralizationRatio)}%`
        : '...',
    ),
    createData(
      'Outstanding RUN Debt',
      `${displayAmount(debt)} ${displayBrandPetname(debt.brand)}`,
      debtDeltaString,
    ),
  ];

  return (
    <TableContainer component={Paper}>
      <Table className={classes.table} size="small" aria-label="simple table">
        <TableHead>
          <TableRow className={classes.rowHeader}>
            <TableCell></TableCell>
            <TableCell align="right">Current Values</TableCell>
            <TableCell align="right">Pending Changes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.name}>
              <TableCell component="th" scope="row">
                {row.name}
              </TableCell>
              <TableCell align="right">{row.currentValue}</TableCell>
              <TableCell align="right">{row.pendingChanges}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
export default ChangesTable;
