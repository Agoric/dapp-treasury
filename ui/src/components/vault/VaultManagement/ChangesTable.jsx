import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';

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

// TODO: use real data
const rows = [
  createData('Collateral Locked', 159, '...'),
  createData('Collaterization Ratio', 237, '...'),
  createData('Debt Borrowed', 356, '...'),
];

const ChangesTable = () => {
  const classes = useStyles();

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
