// @ts-check
import React from 'react';

import ErrorIcon from '@material-ui/icons/Error';
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';

import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  button: {
    color: 'white',
    marginTop: theme.spacing(3),
  },
}));

const CloseVault = ({ onClick }) => {
  const classes = useStyles();
  return (
    <Grid container alignItems="center" justify="center">
      <Grid item>
        <Button
          size="large"
          variant="contained"
          color="primary"
          startIcon={<ErrorIcon />}
          onClick={onClick}
          className={classes.button}
        >
          Close Out Vault
        </Button>
      </Grid>
    </Grid>
  );
};
export default CloseVault;
