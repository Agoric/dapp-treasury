import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import { stringifyValue } from '@agoric/ui-components';
import { getInfoForBrand } from '../../helpers';

import { toPrintedPercent } from '../../../utils/helper';

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

  const lockedInfo = getInfoForBrand(brandToInfo, locked.brand);
  const debtInfo = getInfoForBrand(brandToInfo, debt.brand);

  const getDeltaString = (oldV, newV, disp) => {
    if (typeof newV !== 'bigint' || typeof oldV !== 'bigint') {
      return '...';
    }
    const deltaValue = newV - oldV;
    if (deltaValue === 0n) {
      return '...';
    }
    const dispDeltaValue = disp(deltaValue);
    const dispNewValue = disp(newV);
    if (deltaValue > 0n) {
      return `+${dispDeltaValue} (${dispNewValue})`;
    }
    if (deltaValue < 0n) {
      return `${dispDeltaValue} (${dispNewValue})`;
    }
    return '...';
  };

  const stringifyLocked = value =>
    stringifyValue(value, lockedInfo.mathKind, lockedInfo.decimalPlaces);
  const lockedDeltaString = getDeltaString(
    locked.value,
    lockedAfterDelta.value,
    stringifyLocked,
  );

  const stringifyDebt = value =>
    stringifyValue(value, debtInfo.mathKind, debtInfo.decimalPlaces);
  const debtDeltaString = getDeltaString(
    debt.value,
    debtAfterDelta.value,
    stringifyDebt,
  );

  const rows = [
    createData(
      'Collateral Locked',
      stringifyLocked(locked.value),
      lockedDeltaString,
    ),
    createData(
      'Collateralization Ratio',
      toPrintedPercent(collateralizationRatio),
      newCollateralizationRatio
        ? toPrintedPercent(newCollateralizationRatio)
        : '...',
    ),
    createData('Debt Borrowed', stringifyDebt(debt.value), debtDeltaString),
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
