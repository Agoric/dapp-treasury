import React from 'react';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import CircularProgress from '@material-ui/core/CircularProgress';
import { makeStyles } from '@material-ui/core/styles';

import { NameValueTable, makeRow } from './NameValueTable';
import { makeDisplayFunctions } from '../helpers';

const useStyles = makeStyles(theme => ({
  root: {
    backgroundColor: '#FFFFFF',
    marginBottom: theme.spacing(4),
    borderRadius: '20px',
    color: '#707070',
    fontSize: '22px',
    lineHeight: '27px',
    padding: theme.spacing(4),
    minWidth: 360,
    height: 228,
  },
  title: {
    fontSize: '22px',
  },
  break: {
    border: 0,
    height: '1px',
    background: '#E5E5E5',
  },
  loadingPlaceholder: {
    height: '126px',
    display: 'flex',
    alignItems: 'center',
    margin: 'auto',
    width: 'fit-content',
  },
}));

const MyGetRun = ({
  lockedBld,
  outstandingDebt,
  collateralization,
  brandToInfo,
}) => {
  const { displayRatio, displayPercent } = makeDisplayFunctions(brandToInfo);
  const classes = useStyles();

  const rows =
    lockedBld && outstandingDebt && collateralization
      ? [
          makeRow('Locked BLD', displayRatio(lockedBld)),
          makeRow('Outstanding Debt', `${displayRatio(outstandingDebt)} RUN`),
          makeRow(
            'Collateralization',
            `${displayPercent(collateralization)} %`,
          ),
        ]
      : [];

  const values = !rows.length ? (
    <div className={classes.loadingPlaceholder}>
      <CircularProgress />
    </div>
  ) : (
    <NameValueTable rows={rows} />
  );

  return (
    <Paper className={classes.root} elevation={4}>
      <Typography className={classes.title}>My RUN</Typography>
      <hr className={classes.break} />
      {values}
    </Paper>
  );
};

export default MyGetRun;
