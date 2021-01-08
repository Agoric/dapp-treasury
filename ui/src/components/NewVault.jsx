import React, { useState } from 'react';

import { makeStyles } from '@material-ui/core/styles';

import {
  Button,
  FormControl,
  FormLabel,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Radio,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@material-ui/core';
import FlightTakeoffIcon from '@material-ui/icons/FlightTakeoff';
import NumberFormat from 'react-number-format';

import TransferDialog from './TransferDialog';
import VaultSteps from './VaultSteps';

import { useApplicationContext } from '../contexts/Application';
import { useVaultContext, actions } from '../contexts/Vault';

const {
  resetState,
  setCollateralBrand,
  setVaultParams,
  setWorkingVaultParams,
} = actions;

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

export function NumberFormatPercent(props) {
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
          <Table>
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
          </Table>
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
  pulse: {
    animation: '$pulse 1.5s ease-in-out 0.5s infinite',
  },
  '@keyframes pulse': {
    '0%': {
      opacity: 1,
    },
    '50%': {
      opacity: 0.4,
    },
    '100%': {
      opacity: 1,
    },
  },
}));

function VaultConfigure({ dispatch, collateralBrand, workingVaultParams }) {
  const classes = useConfigStyles();

  const dstPurseNames = [`Default $MOE purse`];

  const fundPurseNames = [
    `Default ${collateralBrand} purse`,
    `Second ${collateralBrand} purse`,
  ];
  const fundPurseBalances = ['4522', '92990'];

  const DEFAULT_COLLATERAL_PERCENT = 150;
  const { dstPurseIndex = 0, fundPurseIndex = 0 } = workingVaultParams;
  let { toBorrow, collateralPercent, toLock } = workingVaultParams;

  const [toTransfer, setToTransfer] = useState(undefined);

  if (!Number(collateralPercent)) {
    collateralPercent = `${DEFAULT_COLLATERAL_PERCENT}`;
  }
  if (!Number(toLock)) {
    toLock = fundPurseBalances[fundPurseIndex] || '1';
  }
  if (!Number(toBorrow)) {
    toBorrow = Math.floor((Number(toLock) / Number(collateralPercent)) * 100);
  }

  const adaptBorrowParams = changes => {
    if ('toBorrow' in changes) {
      if ('collateralPercent' in workingVaultParams) {
        changes.toLock = Math.floor(
          (Number(changes.toBorrow) * Number(collateralPercent)) / 100,
        );
      } else if ('toLock' in workingVaultParams) {
        changes.collateralPercent = Math.floor(
          (Number(toLock) / Number(changes.toBorrow)) * 100,
        );
      }
    } else if ('toLock' in changes) {
      if ('collateralPercent' in workingVaultParams) {
        changes.toBorrow = Math.floor(
          (Number(changes.toLock) / Number(collateralPercent)) * 100,
        );
      } else if ('toBorrow' in workingVaultParams) {
        changes.collateralPercent = Math.floor(
          (Number(changes.toLock) / Number(toBorrow)) * 100,
        );
      }
    } else if ('collateralPercent' in changes) {
      if ('toLock' in workingVaultParams) {
        changes.toLock = Math.floor(
          (Number(toBorrow) * Number(changes.collateralPercent)) / 100,
        );
      } else if ('toBorrow' in workingVaultParams) {
        changes.toBorrow = Math.floor(
          (Number(toLock) / Number(changes.collateralPercent)) * 100,
        );
      }
    } else {
      // No change.
      return;
    }
    dispatch(setWorkingVaultParams({ ...workingVaultParams, ...changes }));
  };

  const fundPurseBalance = Number(fundPurseBalances[fundPurseIndex]);
  const balanceExceeded = fundPurseBalance < Number(toLock);

  return (
    <div className={classes.root}>
      <h5>Choose your {collateralBrand} vault parameters</h5>
      <TextField
        variant="outlined"
        label={`Available ${collateralBrand}`}
        disabled
        value={fundPurseBalance}
      />
      <TransferDialog
        required={Number(toLock) - fundPurseBalance}
        requiredSymbol={collateralBrand}
        toTransfer={toTransfer}
        setToTransfer={setToTransfer}
      />
      <TextField
        variant="outlined"
        required
        label="Funding purse"
        select
        value={fundPurseIndex}
      >
        {fundPurseNames.map((name, i) => (
          <MenuItem
            key={i}
            value={i}
            onClick={() =>
              dispatch(setWorkingVaultParams({ fundPurseIndex: i }))
            }
          >
            {name}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        variant="outlined"
        required
        error={balanceExceeded}
        helperText={balanceExceeded && 'Need to obtain more funds'}
        label={`${collateralBrand} to lock up`}
        value={toLock}
        type="number"
        onChange={ev => adaptBorrowParams({ toLock: ev.target.value })}
        InputProps={{
          startAdornment: balanceExceeded && (
            <InputAdornment position="start">
              <IconButton
                onClick={() => {
                  setToTransfer(Number(toLock) - fundPurseBalance);
                }}
                edge="end"
              >
                <FlightTakeoffIcon className={classes.pulse} />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <TextField
        variant="outlined"
        required
        label="Collateralization percent"
        InputProps={{
          inputComponent: NumberFormatPercent,
        }}
        value={collateralPercent}
        onChange={ev =>
          adaptBorrowParams({ collateralPercent: ev.target.value })
        }
      />
      <TextField
        variant="outlined"
        required
        label="$MOE to receive"
        type="number"
        value={toBorrow}
        onChange={ev => adaptBorrowParams({ toBorrow: ev.target.value })}
      />
      <TextField
        variant="outlined"
        required
        label="Destination purse"
        select
        value={dstPurseIndex}
      >
        {dstPurseNames.map((name, i) => (
          <MenuItem
            key={i}
            value={i}
            onClick={() =>
              dispatch(setWorkingVaultParams({ dstPurseIndex: i }))
            }
          >
            {name}
          </MenuItem>
        ))}
      </TextField>
      <Button
        onClick={() => {
          if (balanceExceeded) {
            setToTransfer(Number(toLock) - fundPurseBalance);
          } else {
            dispatch(setVaultParams(workingVaultParams));
          }
        }}
      >
        Configure
      </Button>
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
    state: { collateralBrand, vaultParams, workingVaultParams },
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
        <VaultConfigure
          dispatch={dispatch}
          collateralBrand={collateralBrand}
          workingVaultParams={workingVaultParams}
        />
      )}
      {connected && collateralBrand && vaultParams && (
        <VaultCreate dispatch={dispatch} />
      )}
    </Paper>
  );
}
/* eslint-enable complexity */
