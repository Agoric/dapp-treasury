import React, { useEffect, useState, useCallback } from 'react';
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
  Grid,
} from '@material-ui/core';
import FlightTakeoffIcon from '@material-ui/icons/FlightTakeoff';
import NumberFormat from 'react-number-format';

import TransferDialog from './TransferDialog';
import VaultSteps from './VaultSteps';

import { useApplicationContext } from '../contexts/Application';

import dappConstants from '../generated/defaults.js';

import { stringifyPurseValue, stringifyValue, parseValue } from './display';

import {
  setVaultCollateral,
  setVaultParams,
  resetVault,
  setVaultConfigured,
} from '../store';

import { makeLoanOffer } from '../contexts/makeLoanOffer';

const { SCONE_BRAND_BOARD_ID } = dappConstants;

const displayPetname = pn => (Array.isArray(pn) ? pn.join('.') : pn);

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
    { id: 'initialMargin', label: 'Collateral Ratio' },
    { id: 'liqMargin', label: 'Liquidation Ratio' },
    { id: 'stabilityFee', label: 'Interest Rate' },
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
                <TableRow key={JSON.stringify(row.petname)}>
                  <TableCell padding="checkbox">
                    <Radio
                      onClick={() => {
                        dispatch(setVaultCollateral(row));
                        dispatch(
                          setVaultParams({
                            ...vaultParams,
                            marketPrice: row.marketPrice,
                            liquidationMargin: row.liquidationMargin,
                            stabilityFee: row.stabilityFee,
                          }),
                        );
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    {Array.isArray(row.petname) ? row.petname[1] : row.petname}
                  </TableCell>
                  <TableCell align="right">
                    $
                    {stringifyValue(row.marketPrice.value, {
                      decimalPlaces: 3,
                    })}
                  </TableCell>
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

function VaultConfigure({
  dispatch,
  vaultCollateral,
  depositFacetId,
  purses,
  vaultParams,
}) {
  const classes = useConfigStyles();

  const {
    fundPurse,
    dstPurse,
    toBorrow,
    collateralPercent,
    toLock,
  } = vaultParams;

  const [toTransfer, setToTransfer] = useState(undefined);

  // Purses with the same brand as the collateral symbol that was
  // selected in the previous step.
  const fundPurses = purses.filter(
    ({ brandPetname }) =>
      vaultCollateral &&
      JSON.stringify(brandPetname) === JSON.stringify(vaultCollateral.petname),
  );

  // Purses with the Scones brand
  const dstPurses = purses.filter(
    ({ brandBoardId }) => brandBoardId === SCONE_BRAND_BOARD_ID,
  );

  useEffect(() => {
    if (!fundPurse && fundPurses.length) {
      dispatch(setVaultParams({ ...vaultParams, fundPurse: fundPurses[0] }));
    }
  }, [fundPurses]);

  useEffect(() => {
    if (!dstPurse && dstPurses.length) {
      dispatch(setVaultParams({ ...vaultParams, dstPurse: dstPurses[0] }));
    }
  }, [dstPurses]);

  const doSort = (a, b) => (a.pursePetname > b.pursePetname ? 1 : -1);
  fundPurses.sort(doSort);
  dstPurses.sort(doSort);

  const toLockDI = fundPurse && fundPurse.displayInfo;

  const adaptBorrowParams = useCallback(
    changes => {
      if (!vaultCollateral) {
        return;
      }
      const decimalPlaces = (toLockDI && toLockDI.decimalPlaces) || 0;
      const price = vaultCollateral.marketPrice.value / 10 ** decimalPlaces;
      if ('toBorrow' in changes) {
        if ('collateralPercent' in vaultParams) {
          changes.toLock = Math.floor(
            (Number(changes.toBorrow) * Number(collateralPercent)) /
              price /
              100,
          );
        } else if ('toLock' in vaultParams) {
          changes.collateralPercent = Math.floor(
            ((Number(toLock) * price) / Number(changes.toBorrow)) * 100,
          );
        }
      } else if ('toLock' in changes) {
        if ('collateralPercent' in vaultParams) {
          changes.toBorrow = Math.floor(
            ((Number(changes.toLock) * price) / Number(collateralPercent)) *
              100,
          );
        } else if ('toBorrow' in vaultParams) {
          changes.collateralPercent = Math.floor(
            ((Number(changes.toLock) * price) / Number(toBorrow)) * 100,
          );
        }
      } else if ('collateralPercent' in changes) {
        if ('toLock' in vaultParams) {
          changes.toBorrow = Math.floor(
            ((Number(toLock) * price) / Number(changes.collateralPercent)) *
              100,
          );
        } else if ('toBorrow' in vaultParams) {
          changes.toLock = Math.floor(
            (Number(toBorrow) * Number(changes.collateralPercent)) /
              price /
              100,
          );
        }
      } else {
        // No change.
        return;
      }
      dispatch(setVaultParams({ ...vaultParams, ...changes }));
    },
    [vaultCollateral, toLock, toBorrow, collateralPercent],
  );

  const fundPurseBalance = (fundPurse && fundPurse.value) || 0;
  const balanceExceeded = fundPurseBalance < toLock;
  const fundPurseBalanceDisplay = Number(stringifyPurseValue(fundPurse));

  return (
    <div className={classes.root}>
      <Grid container spacing={1}>
        <Grid item xs={4} spacing={3}>
          <FormLabel component="legend" style={{ paddingTop: 20 }}>
            Choose your {vaultCollateral.petname[1]} vault parameters
          </FormLabel>
          <div style={{ paddingTop: 20 }}>
            {fundPurseBalanceDisplay} {vaultCollateral.petname[1]} Available
            from Funding Purse
          </div>
        </Grid>
        <Grid item xs={4} spacing={3}>
          <TextField
            variant="outlined"
            required
            label="Funding purse"
            select
            value={fundPurse ? JSON.stringify(fundPurse.pursePetname) : ''}
          >
            {fundPurses.map(purse => (
              <MenuItem
                key={JSON.stringify(purse.pursePetname)}
                value={JSON.stringify(purse.pursePetname)}
                onClick={() =>
                  dispatch(
                    setVaultParams({
                      ...vaultParams,
                      fundPurse: purse,
                    }),
                  )
                }
              >
                {purse.pursePetname[1]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            variant="outlined"
            required
            error={balanceExceeded}
            helperText={balanceExceeded && 'Need to obtain more funds'}
            label={`${vaultCollateral.petname[1]} to lock up`}
            value={stringifyValue(toLock, toLockDI)}
            type="number"
            onChange={ev =>
              adaptBorrowParams({
                toLock: parseValue(ev.target.value, toLockDI),
              })
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconButton
                    onClick={() => {
                      setToTransfer(toLock);
                    }}
                    edge="start"
                  >
                    <FlightTakeoffIcon
                      className={balanceExceeded ? classes.pulse : null}
                    />
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
              adaptBorrowParams({
                collateralPercent: ev.target.value,
              })
            }
          />
        </Grid>
        <Grid item xs={4} spacing={3}>
          <TextField
            variant="outlined"
            required
            label="$MOE to receive"
            type="number"
            value={stringifyValue(toBorrow, dstPurse && dstPurse.displayInfo)}
            onChange={ev =>
              adaptBorrowParams({
                toBorrow: parseValue(
                  ev.target.value,
                  dstPurse && dstPurse.displayInfo,
                ),
              })
            }
          />
          <TextField
            variant="outlined"
            required
            label="Destination purse"
            select
            value={dstPurse ? JSON.stringify(dstPurse.pursePetname) : ''}
          >
            {dstPurses.map(purse => (
              <MenuItem
                key={JSON.stringify(purse.pursePetname)}
                value={JSON.stringify(purse.pursePetname)}
                onClick={() =>
                  dispatch(
                    setVaultParams({
                      ...vaultParams,
                      dstPurse: purse,
                    }),
                  )
                }
              >
                {displayPetname(purse.pursePetname)}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid container justify="flex-end" alignItems="center">
          <Button
            onClick={() => {
              if (balanceExceeded) {
                setToTransfer(parseFloat(toLock));
              } else {
                dispatch(setVaultConfigured(true));
              }
            }}
          >
            Configure
          </Button>
          <Button onClick={() => dispatch(resetVault())}>Cancel</Button>
        </Grid>
      </Grid>
      <TransferDialog
        required={toLock}
        requiredDisplayInfo={toLockDI}
        requiredSymbol={vaultCollateral.petname[1]}
        fundPursePetname={fundPurse && fundPurse.petname}
        toTransfer={toTransfer}
        setToTransfer={setToTransfer}
        depositFacetId={depositFacetId}
        purses={purses}
      />
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
              {stringifyValue(toLock, fundPurse && fundPurse.displayInfo)}{' '}
              {fundPurse && fundPurse.brandPetname[1]} from Purse:{' '}
              {fundPurse && fundPurse.pursePetname[1]}
            </TableCell>
            <TableCell></TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Borrowing</TableCell>
            <TableCell align="right">
              {dstPurse && stringifyValue(toBorrow, dstPurse.displayInfo)}{' '}
              {dstPurse && dstPurse.brandPetname} to Purse:{' '}
              {dstPurse && dstPurse.pursePetname}
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
      vaultCollateral,
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
        vaultCollateral={vaultCollateral}
        vaultParams={vaultParams}
      />
      {connected && !vaultCollateral && (
        <VaultCollateral
          dispatch={dispatch}
          collaterals={collaterals}
          vaultParams={vaultParams}
        />
      )}
      {connected && vaultCollateral && !vaultConfigured && (
        <VaultConfigure
          dispatch={dispatch}
          vaultCollateral={vaultCollateral}
          vaultParams={vaultParams}
          depositFacetId={invitationDepositId}
          purses={purses}
        />
      )}
      {connected && vaultCollateral && vaultConfigured && (
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
