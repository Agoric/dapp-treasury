import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableRow from '@material-ui/core/TableRow';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(_ => ({
  table: {
    '& > .MuiTableCell-root': {
      borderBottom: 'none',
    },
  },
  row: {
    '& > td': {
      borderBottom: 'none',
      fontSize: '18px',
      lineHeight: '24px',
    },
    '& > td:first-child': {
      color: '#707070',
    },
  },
}));

export const makeRow = (name, value) => ({
  name,
  value,
});

export const NameValueTable = ({ rows }) => {
  const classes = useStyles();

  return (
    <TableContainer>
      <Table className={classes.table} size="small">
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.name} className={classes.row}>
              <TableCell align="left">{row.name}</TableCell>
              <TableCell align="right">{row.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
