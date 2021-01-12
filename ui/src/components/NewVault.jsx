import React, { useState } from 'react';
import { Redirect } from 'react-router-dom';

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

import dappConstants from '../generated/defaults.js';

import {
  setCollateralBrand,
  setVaultParams,
  resetVault,
  setVaultConfigured,
} from '../store';

import { makeLoanOffer } from '../contexts/makeLoanOffer';

const { SCONE_BRAND_BOARD_ID } = dappConstants;

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

function VaultCollateral({ collaterals, dispatch, vaultParams }) {
  const headCells = [
    { id: 'petname', label: 'Asset' },
    { id: 'marketPrice', label: 'Market Price' },
    { id: 'initialMargin', label: 'Initial Margin' },
    { id: 'liqMargin', label: 'Liq. Margin' },
    { id: 'stabilityFee', label: 'Stability Fee' },
  ];
  return Array.isArray(collaterals) && collaterals.length > 0 ? (
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
              {collaterals.map(row => (
                <TableRow key={row.petname}>
                  <TableCell padding="checkbox">
                    <Radio
                      onClick={() => {
                        dispatch(setCollateralBrand(row.petname));
                        dispatch(
                          setVaultParams({
                            ...vaultParams,
                            marketPrice: row.marketPrice.value,
                            liquidationMargin: row.liquidationMargin,
                            stabilityFee: row.stabilityFee,
                          }),
                        );
                      }}
                    />
                  </TableCell>
                  <TableCell>{row.petname}</TableCell>
                  <TableCell align="right">${row.marketPrice.value}</TableCell>
                  <TableCell align="right">
                    {row.initialMargin * 100}%
                  </TableCell>
                  <TableCell align="right">
                    {row.liquidationMargin * 100}%
                  </TableCell>
                  <TableCell align="right">{row.stabilityFee * 100}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </FormControl>
    </div>
  ) : (
    <div>Please enable the Treasury Dapp in your wallet.</div>
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

function VaultConfigure({ dispatch, collateralBrand, purses, vaultParams }) {
  const classes = useConfigStyles();

  const {
    fundPurse,
    dstPurse,
    toBorrow,
    collateralPercent,
    toLock,
  } = vaultParams;

  const [toTransfer, setToTransfer] = useState(undefined);

  // Purses with the same brand as the collateralBrand that was
  // selected in the previous step.
  const fundPurses = purses.filter(
    ({ brandPetname }) => brandPetname === collateralBrand,
  );

  // Purses with the Scones brand
  const dstPurses = purses.filter(
    ({ brandBoardId }) => brandBoardId === SCONE_BRAND_BOARD_ID,
  );

  const doSort = (a, b) => (a.pursePetname > b.pursePetname ? 1 : -1);
  fundPurses.sort(doSort);
  dstPurses.sort(doSort);

  const adaptBorrowParams = changes => {
    if ('toBorrow' in changes) {
      if ('collateralPercent' in vaultParams) {
        changes.toLock = Math.floor(
          (Number(changes.toBorrow) * Number(collateralPercent)) / 100,
        );
      } else if ('toLock' in vaultParams) {
        changes.collateralPercent = Math.floor(
          (Number(toLock) / Number(changes.toBorrow)) * 100,
        );
      }
    } else if ('toLock' in changes) {
      if ('collateralPercent' in vaultParams) {
        changes.toBorrow = Math.floor(
          (Number(changes.toLock) / Number(collateralPercent)) * 100,
        );
      } else if ('toBorrow' in vaultParams) {
        changes.collateralPercent = Math.floor(
          (Number(changes.toLock) / Number(toBorrow)) * 100,
        );
      }
    } else if ('collateralPercent' in changes) {
      if ('toLock' in vaultParams) {
        changes.toLock = Math.floor(
          (Number(toBorrow) * Number(changes.collateralPercent)) / 100,
        );
      } else if ('toBorrow' in vaultParams) {
        changes.toBorrow = Math.floor(
          (Number(toLock) / Number(changes.collateralPercent)) * 100,
        );
      }
    } else {
      // No change.
      return;
    }
    dispatch(setVaultParams({ ...vaultParams, ...changes }));
  };

  const fundPurseBalance = Number((fundPurse && fundPurse.value) || 0);
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
        value={fundPurse ? fundPurse.pursePetname : ''}
      >
        {fundPurses.map(purse => (
          <MenuItem
            key={purse.pursePetname}
            value={purse.pursePetname}
            onClick={() =>
              dispatch(
                setVaultParams({
                  ...vaultParams,
                  fundPurse: purse,
                }),
              )
            }
          >
            {purse.pursePetname}
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
        value={dstPurse ? dstPurse.pursePetname : ''}
      >
        {dstPurses.map(purse => (
          <MenuItem
            key={purse.pursePetname}
            value={purse.pursePetname}
            onClick={() =>
              dispatch(
                setVaultParams({
                  ...vaultParams,
                  dstPurse: purse,
                }),
              )
            }
          >
            {purse.pursePetname}
          </MenuItem>
        ))}
      </TextField>
      <Button
        onClick={() => {
          if (balanceExceeded) {
            setToTransfer(Number(toLock) - fundPurseBalance);
          } else {
            dispatch(setVaultConfigured(true));
          }
        }}
      >
        Configure
      </Button>
      <Button onClick={() => dispatch(resetVault())}>Cancel</Button>
    </div>
  );
}

export function VaultConfirmation({ vaultParams }) {
  const {
    fundPurse,
    dstPurse,
    toBorrow,
    collateralPercent,
    toLock,
    stabilityFee,
    liquidationMargin,
    _marketPrice,
  } = vaultParams;

  return (
    <TableContainer>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Depositing</TableCell>
            <TableCell align="right">
              {toLock} {fundPurse.brandPetname} from Purse:{' '}
              {fundPurse.pursePetname}
            </TableCell>
            <TableCell></TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Borrowing</TableCell>
            <TableCell align="right">
              {toBorrow} {dstPurse.brandPetname} to Purse:{' '}
              {dstPurse.pursePetname}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Interest Rate</TableCell>
            <TableCell align="right">{stabilityFee * 100}%</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Liquidation Ratio</TableCell>
            <TableCell align="right">{liquidationMargin * 100}%</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Collateral Ratio</TableCell>
            <TableCell align="right">{collateralPercent}%</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Liquidation Penalty</TableCell>
            <TableCell align="right">3%</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function VaultCreate({ dispatch, vaultParams, invitationDepositId }) {
  return (
    <div>
      <Typography variant="h6">
        Confirm details and create your vault
      </Typography>
      <VaultConfirmation vaultParams={vaultParams}></VaultConfirmation>
      <Button
        onClick={() =>
          makeLoanOffer(dispatch, vaultParams, invitationDepositId)
        }
      >
        Create
      </Button>
      <Button onClick={() => dispatch(resetVault())}>Cancel</Button>
    </div>
  );
}

/* eslint-disable complexity */
export default function NewVault() {
  const classes = useStyles();

  const {
    state: {
      connected,
      collateralBrand,
      vaultParams,
      collaterals,
      purses,
      vaultConfigured,
      invitationDepositId,
      vaultCreated,
    },
    dispatch,
  } = useApplicationContext();

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
      {connected && !collateralBrand && (
        <VaultCollateral
          dispatch={dispatch}
          collaterals={collaterals}
          vaultParams={vaultParams}
        />
      )}
      {connected && collateralBrand && !vaultConfigured && (
        <VaultConfigure
          dispatch={dispatch}
          collateralBrand={collateralBrand}
          vaultParams={vaultParams}
          purses={purses}
        />
      )}
      {connected && collateralBrand && vaultConfigured && (
        <VaultCreate
          dispatch={dispatch}
          vaultParams={vaultParams}
          invitationDepositId={invitationDepositId}
        />
      )}
      {vaultCreated && (
        <Redirect
          to={{
            pathname: '/treasury',
          }}
        />
      )}
    </Paper>
  );
}
/* eslint-enable complexity */
