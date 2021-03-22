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
import { multiplyBy } from '@agoric/zoe/src/contractSupport';
import {
  divideBy,
  makeRatio,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport/ratio';
import { toPrintedPercent } from '../utils/helper';

import TransferDialog from './TransferDialog';
import VaultSteps from './VaultSteps';

import { useApplicationContext } from '../contexts/Application';

import dappConstants from '../generated/defaults.js';

import {
  stringifyPurseValue,
  stringifyValue,
  stringifyAmount,
  // parseValue,
  parseAmount,
} from './display';

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

function VaultCollateral({ collaterals, dispatch, vaultParams, treasury }) {
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
                            // HACK we know the denominator is 1 unit of collateral
                            marketPrice: row.marketPrice.numerator,
                            liquidationMargin: row.liquidationMargin,
                            stabilityFee: row.stabilityFee,
                            collateralPercent: row.initialMargin,
                            toLock: { brand: row.brand, value: 0n },
                            toBorrow: {
                              brand: treasury.sconeBrand,
                              value: 0n,
                            },
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
                    {stringifyValue(row.marketPrice.numerator.value, {
                      decimalPlaces: 3,
                    })}
                  </TableCell>
                  <TableCell align="right">
                    {toPrintedPercent(row.initialMargin)}%
                  </TableCell>
                  <TableCell align="right">
                    {toPrintedPercent(row.liquidationMargin)}%
                  </TableCell>
                  <TableCell align="right">
                    {toPrintedPercent(row.stabilityFee, 2n)}%
                  </TableCell>
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

function computeToBorrow(priceRate, toLock, collateralPercent) {
  const lockPrice = multiplyBy(toLock, priceRate);
  return divideBy(lockPrice, collateralPercent);
}

function computeCollateralRatio(priceRate, toBorrow, toLock) {
  const lockPrice = multiplyBy(toLock, priceRate);
  return makeRatioFromAmounts(lockPrice, toBorrow);
}

function computeToLock(priceRate, toBorrow, collateralPercent) {
  const borrowWithMargin = multiplyBy(toBorrow, collateralPercent);
  return divideBy(borrowWithMargin, priceRate);
}

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

  // Assume that toBorrow = 5000
  // don't change collateralPercent
  // don't change toLock manually (should change automatically once)
  const adaptBorrowParams = useCallback(
    changes => {
      if (!vaultCollateral) {
        return;
      }
      console.log('UPDATE collateralRato', collateralPercent);
      console.log('UPDATE vault', vaultParams);
      console.log('UPDATE changes PRE', { ...changes });
      // const decimalPlaces = (toLockDI && toLockDI.decimalPlaces) || 0;
      // compute a ratio from scones to collateral, so it includes
      // the price and the collataraliztaion ratio
      // TODO this will overestimate the collateral value if there's slippage
      const priceRate = vaultCollateral.marketPrice;
      console.log('UPDATE PRICE', priceRate);

      if ('toBorrow' in changes) {
        if ('collateralPercent' in vaultParams) {
          console.log(1);
          changes.toLock = computeToLock(
            priceRate,
            changes.toBorrow,
            collateralPercent,
          );
        } else if ('toLock' in vaultParams) {
          console.log(2);
          changes.collateralPercent = computeCollateralRatio(
            priceRate,
            changes.toBorrow,
            toLock,
          );
        }
      } else if ('toLock' in changes) {
        if ('collateralPercent' in vaultParams) {
          console.log(3);
          changes.toBorrow = computeToBorrow(
            priceRate,
            changes.toLock,
            collateralPercent,
          );
        } else if ('toBorrow' in vaultParams) {
          console.log(4);
          changes.collateralPercent = computeCollateralRatio(
            priceRate,
            toBorrow,
            changes.toLock,
          );
        }
      } else if ('collateralPercent' in changes) {
        if ('toLock' in vaultParams) {
          console.log(5);
          changes.toBorrow = computeToBorrow(
            priceRate,
            toLock,
            changes.collateralPercent,
          );
        } else if ('toBorrow' in vaultParams) {
          console.log(6);
          changes.toLock = computeToLock(
            priceRate,
            toBorrow,
            changes.collateralPercent,
          );
        }
      } else {
        // No change.
        return;
      }
      console.log('UPDATE changes POST', changes);
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
            value={stringifyAmount(toLock, toLockDI)}
            type="number"
            onChange={ev =>
              adaptBorrowParams({
                toLock: parseAmount(
                  ev.target.value || '0',
                  toLock.brand,
                  toLockDI,
                ),
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
            value={toPrintedPercent(collateralPercent)}
            onChange={ev =>
              adaptBorrowParams({
                collateralPercent: makeRatio(
                  BigInt(ev.target.value || 0),
                  collateralPercent.numerator.brand,
                ),
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
            value={stringifyAmount(toBorrow, dstPurse && dstPurse.displayInfo)}
            onChange={ev =>
              adaptBorrowParams({
                toBorrow: parseAmount(
                  ev.target.value || '0',
                  toBorrow.brand,
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
                setToTransfer(toLock);
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
        fundPursePetname={fundPurse && fundPurse.pursePetname}
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
              {stringifyAmount(toLock, fundPurse && fundPurse.displayInfo)}{' '}
              {fundPurse && fundPurse.brandPetname[1]} from Purse:{' '}
              {fundPurse && fundPurse.pursePetname[1]}
            </TableCell>
            <TableCell></TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Borrowing</TableCell>
            <TableCell align="right">
              {dstPurse && stringifyAmount(toBorrow, dstPurse.displayInfo)}{' '}
              {dstPurse && dstPurse.brandPetname} to Purse:{' '}
              {dstPurse && dstPurse.pursePetname}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Interest Rate</TableCell>
            <TableCell align="right">
              {toPrintedPercent(stabilityFee, 1n)}%
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Liquidation Ratio</TableCell>
            <TableCell align="right">
              {toPrintedPercent(liquidationMargin)}%
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Collateral Ratio</TableCell>
            <TableCell align="right">
              {toPrintedPercent(collateralPercent)}%
            </TableCell>
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
      treasury,
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
          treasury={treasury}
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
