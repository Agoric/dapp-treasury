import React from 'react';

import { makeStyles } from '@material-ui/core/styles';

import {
  Button,
  FormControl,
  FormLabel,
  MenuItem,
  Paper,
  Radio,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@material-ui/core';
import NumberFormat from 'react-number-format';

import VaultSteps from './VaultSteps';

import { useApplicationContext } from '../contexts/Application';
import { useVaultContext, actions } from '../contexts/Vault';

const { resetState, setCollateralBrand, setVaultParams } = actions;

const useStyles = makeStyles(theme => ({
  paper: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
    [theme.breakpoints.up(600 + theme.spacing(3) * 2)]: {
      marginTop: theme.spacing(6),
      marginBottom: theme.spacing(6),
      padding: theme.spacing(3),
    },
  },
  grid: {
    padding: theme.spacing(2),
  },
  message: {
    marginTop: theme.spacing(2),
    minHeight: theme.spacing(2),
  },
  buttons: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  button: {
    marginTop: theme.spacing(3),
  },
}));

function NumberFormatPercent(props) {
  const { inputRef, onChange, ...other } = props;

  return (
    <NumberFormat
      {...other}
      getInputRef={inputRef}
      onValueChange={values => {
        onChange({
          target: {
            value: values.value,
          },
        });
      }}
      thousandSeparator
      suffix="%"
    />
  );
}

function VaultCollateral({ dispatch }) {
  const headCells = [
    { id: 'name', label: 'Asset' },
    { id: 'price', label: 'Market Price' },
    { id: 'lratio', label: 'Liq. Ratio' },
    { id: 'lpenalty', label: 'Liq. Penalty' },
    { id: 'interest', label: 'Interest' },
  ];
  const rows = [
    {
      name: '$ETHa',
      price: '$1,000.00',
      lratio: '125%',
      lpenalty: '3%',
      interest: '1%',
    },
    {
      name: '$AST',
      price: '$50.00',
      lratio: '125%',
      lpenalty: '3%',
      interest: '1%',
    },
    {
      name: '$WBTCa',
      price: '$30,000.00',
      lratio: '125%',
      lpenalty: '3%',
      interest: '1%',
    },
    {
      name: '$USDCa',
      price: '$1.00',
      lratio: '102%',
      lpenalty: '2%',
      interest: '1%',
    },
  ];
  return (
    <div>
      <FormControl component="fieldset">
        <FormLabel component="legend">Choose collateral</FormLabel>{' '}
        <TableContainer>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" />
              {headCells.map(headCell => (
                <TableCell key={headCell.id}>{headCell.label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.name}>
                <TableCell padding="checkbox">
                  <Radio
                    onClick={() => dispatch(setCollateralBrand(row.name))}
                  />
                </TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell align="right">{row.price}</TableCell>
                <TableCell align="right">{row.lratio}</TableCell>
                <TableCell align="right">{row.lpenalty}</TableCell>
                <TableCell align="right">{row.interest}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableContainer>
      </FormControl>
    </div>
  );
}

const useConfigStyles = makeStyles(theme => ({
  root: {
    '& .MuiTextField-root': {
      margin: theme.spacing(1),
      width: '25ch',
    },
  },
}));

function VaultConfigure({ dispatch, collateralBrand }) {
  const classes = useConfigStyles();
  return (
    <div className={classes.root}>
      <h5>Choose your {collateralBrand} vault parameters</h5>
      <TextField
        variant="outlined"
        required
        label="$MOE to borrow"
        type="number"
        defaultValue="3000"
      />
      <TextField
        variant="outlined"
        required
        label="Collateralization ratio"
        InputProps={{
          inputComponent: NumberFormatPercent,
        }}
        defaultValue="150"
      />
      <TextField variant="outlined" required label="Funding purse" select>
        <MenuItem value="0">Default $ETHa purse</MenuItem>
        <MenuItem value="1">Second $ETHa purse</MenuItem>
      </TextField>
      <TextField variant="outlined" required label="Destination purse" select>
        <MenuItem value="0">Default $MOE purse</MenuItem>
      </TextField>
      <Button onClick={() => dispatch(setVaultParams({}))}>Configure</Button>
      <Button onClick={() => dispatch(resetState())}>Cancel</Button>
    </div>
  );
}

function VaultCreate({ dispatch }) {
  return (
    <div>
      <Typography variant="h6">
        Confirm details and create your vault
      </Typography>
      <TableContainer>
        <TableBody>
          <TableRow>
            <TableCell>Depositing</TableCell>
            <TableCell align="right">7.5</TableCell>{' '}
            <TableCell>$ETHa</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Borrowing</TableCell>
            <TableCell align="right">5,000</TableCell>{' '}
            <TableCell>$MOE</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Interest Rate</TableCell>
            <TableCell align="right">1%</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Liquidation Ratio</TableCell>
            <TableCell align="right">125%</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Liquidation Price</TableCell>
            <TableCell align="right">$833.33</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Liquidation Penalty</TableCell>
            <TableCell align="right">3%</TableCell>
          </TableRow>
        </TableBody>
      </TableContainer>
      <Button onClick={() => dispatch(setVaultParams({}))}>Create</Button>
      <Button onClick={() => dispatch(resetState())}>Cancel</Button>
    </div>
  );
}

/* eslint-disable complexity */
export default function NewVault() {
  const classes = useStyles();

  const {
    state: { connected },
  } = useApplicationContext();
  const {
    state: { collateralBrand, vaultParams },
    dispatch,
  } = useVaultContext();

  return (
    <Paper className={classes.paper}>
      <Typography component="h1" variant="h4" align="center">
        Borrow $MOE
      </Typography>

      <VaultSteps
        connected={connected}
        collateralBrand={collateralBrand}
        vaultParams={vaultParams}
      />

      {connected && !collateralBrand && <VaultCollateral dispatch={dispatch} />}
      {connected && collateralBrand && !vaultParams && (
        <VaultConfigure dispatch={dispatch} collateralBrand={collateralBrand} />
      )}
      {connected && collateralBrand && vaultParams && (
        <VaultCreate dispatch={dispatch} />
      )}
    </Paper>
  );
}
/* eslint-enable complexity */
