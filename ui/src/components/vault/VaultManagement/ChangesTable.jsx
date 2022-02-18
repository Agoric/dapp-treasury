import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import { makeDisplayFunctions } from '../../helpers';

const useStyles = makeStyles(theme => ({
  root: {
    backgroundColor: '#FFFFFF',
    marginBottom: theme.spacing(2),
    borderRadius: '20px',
    color: '#707070',
    fontSize: '22px',
    lineHeight: '27px',
    padding: theme.spacing(4),
  },
  title: {
    fontSize: '22px',
  },
  table: {
    minWidth: 650,
    '& > .MuiTableCell-root': {
      borderBottom: 'none',
    },
  },
  row: {
    '& > th, td': {
      borderBottom: 'none',
    },
    '& > th': {
      paddingLeft: 0,
    },
    '& > td': {
      fontSize: '22px',
      lineHeight: '27px',
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
  break: {
    border: 0,
    height: '1px',
    background: '#E5E5E5',
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

  const collateralizationDeltaString =
    newCollateralizationRatio &&
    !(
      newCollateralizationRatio?.numerator?.value ===
        collateralizationRatio?.numerator?.value &&
      newCollateralizationRatio?.denominator?.value ===
        collateralizationRatio?.denominator?.value
    )
      ? `${displayPercent(newCollateralizationRatio)}%`
      : '...';

  const rows = [
    createData(
      'Collateral Locked',
      `${displayAmount(locked)} ${displayBrandPetname(locked.brand)}`,
      lockedDeltaString,
    ),
    createData(
      'Collateralization Ratio',
      `${displayPercent(collateralizationRatio)}%`,
      collateralizationDeltaString,
    ),
    createData(
      'Outstanding Debt',
      `${displayAmount(debt)} ${displayBrandPetname(debt.brand)}`,
      debtDeltaString,
    ),
  ];

  return (
    <Paper className={classes.root} elevation={4}>
      <Typography className={classes.title}>Vault Details</Typography>
      <hr className={classes.break} />
      <TableContainer>
        <Table className={classes.table} size="small">
          <TableHead>
            <TableRow className={[classes.rowHeader, classes.row].join(' ')}>
              <TableCell>Value</TableCell>
              <TableCell align="right">Current</TableCell>
              <TableCell align="right">Proposed</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.name} className={classes.row}>
                <TableCell className={classes.left}>{row.name}</TableCell>
                <TableCell align="right">{row.currentValue}</TableCell>
                <TableCell align="right">{row.pendingChanges}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
export default ChangesTable;
