import React from 'react';
import { AmountMath } from '@agoric/ertp';
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
    minWidth: '50vw',
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
  empty: {
    fontSize: '18px',
    lineHeight: '24px',
    color: '#707070',
    marginTop: theme.spacing(4),
    marginBottom: theme.spacing(2),
    textAlign: 'center',
  },
}));

const formatDateNow = stamp => {
  if (!stamp) {
    return 'unknown time';
  }
  const o = new Intl.DateTimeFormat('en', {
    timeStyle: 'short',
    dateStyle: 'short',
  });

  return o.format(new Date(stamp));
};

const History = ({ vaultId, history, brandToInfo, brand, debtBrand }) => {
  const { displayAmount, displayBrandPetname } =
    makeDisplayFunctions(brandToInfo);
  const classes = useStyles();

  /**
   * @typedef  {{
   * date: number,
   * deposited: string,
   * borrowed: string,
   * id: number
   * }} Row
   */

  /**
   * @type {Row[] | null}
   */
  const rows =
    history &&
    brandToInfo &&
    brand &&
    debtBrand &&
    Object.entries(history[vaultId] ?? {})
      .filter(([_id, { status }]) => status === 'accept')
      .map(([id, { meta, proposalForDisplay }]) => {
        let deposited = AmountMath.makeEmpty(brand);
        let borrowed = AmountMath.makeEmpty(debtBrand);
        let depositedSignum = '';
        let borrowedSignum = '';

        if (proposalForDisplay.give?.Collateral) {
          deposited = AmountMath.make(
            brand,
            BigInt(proposalForDisplay.give.Collateral.amount.value),
          );
        } else if (proposalForDisplay.want?.Collateral) {
          depositedSignum = '-';
          deposited = AmountMath.make(
            brand,
            BigInt(proposalForDisplay.want.Collateral.amount.value),
          );
        }

        if (proposalForDisplay.give?.RUN) {
          borrowedSignum = '-';
          borrowed = AmountMath.make(
            debtBrand,
            BigInt(proposalForDisplay.give.RUN.amount.value),
          );
        } else if (proposalForDisplay.want?.RUN) {
          borrowed = AmountMath.make(
            debtBrand,
            BigInt(proposalForDisplay.want.RUN.amount.value),
          );
        }

        return {
          date: meta.creationStamp,
          deposited: `${
            deposited.value > 0 ? depositedSignum : ''
          }${displayAmount(deposited)} ${displayBrandPetname(brand)}`,
          borrowed: `${borrowed.value > 0 ? borrowedSignum : ''}${displayAmount(
            borrowed,
          )} ${displayBrandPetname(debtBrand)}`,
          id,
        };
      })
      ?.sort((a, b) => b.date - a.date);

  const content = rows?.length ? (
    <TableContainer>
      <Table className={classes.table} size="small">
        <TableHead>
          <TableRow className={[classes.rowHeader, classes.row].join(' ')}>
            <TableCell>Date</TableCell>
            <TableCell align="right">Deposited</TableCell>
            <TableCell align="right">Borrowed</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.id} className={classes.row}>
              <TableCell className={classes.left}>
                {formatDateNow(row.date)}
              </TableCell>
              <TableCell align="right">{row.deposited}</TableCell>
              <TableCell align="right">{row.borrowed}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  ) : (
    <div className={classes.empty}>Transactions will appear here.</div>
  );

  return (
    <Paper className={classes.root} elevation={4}>
      <Typography className={classes.title}>History</Typography>
      <hr className={classes.break} />
      {content}
    </Paper>
  );
};
export default History;
