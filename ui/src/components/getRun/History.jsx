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
  break: {
    border: 0,
    height: '1px',
    background: '#E5E5E5',
  },
}));

function createData(date, locked, borrowed) {
  return { date, locked, borrowed };
}

const History = () => {
  const classes = useStyles();

  const rows = [
    createData('2022-01-12 13:15:12', '0 BLD', '3 RUN'),
    createData('2022-01-12 13:15:12', '5 BLD', '1 RUN'),
    createData('2022-01-12 13:15:12', '15 BLD', '1 RUN'),
  ];

  return (
    <Paper className={classes.root} elevation={4}>
      <Typography className={classes.title}>History</Typography>
      <hr className={classes.break} />
      <TableContainer>
        <Table className={classes.table} size="small">
          <TableHead>
            <TableRow className={[classes.rowHeader, classes.row].join(' ')}>
              <TableCell>Date</TableCell>
              <TableCell align="right">Locked</TableCell>
              <TableCell align="right">Borrowed</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.name} className={classes.row}>
                <TableCell className={classes.left}>{row.date}</TableCell>
                <TableCell align="right">{row.locked}</TableCell>
                <TableCell align="right">{row.borrowed}</TableCell>
                <TableCell align="right">{row.collateralization}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};
export default History;
