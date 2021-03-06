import React, { useState } from 'react';

import { makeStyles } from '@material-ui/core/styles';

import { FormLabel, Grid } from '@material-ui/core';

import { stringifyPurseValue } from '@agoric/ui-components';
import {
  floorMultiplyBy,
  floorDivideBy,
  makeRatio,
} from '@agoric/zoe/src/contractSupport';

import '../../../types/types';

import {
  filterPursesByBrand,
  sortPurses,
  makeDisplayFunctions,
} from '../../helpers';

import ToLockValueInput from './ToLockValueInput';
import ToBorrowValueInput from './ToBorrowValueInput';
import FundPurseSelector from './FundPurseSelector';
import DstPurseSelector from './DstPurseSelector';
import CancelButton from './CancelButton';
import EnterButton from './EnterButton';
import CollateralizationPercentInput from './CollateralizationPercentInput';
import ErrorBoundary from '../../ErrorBoundary';

export function computeToBorrow(priceRate, toLock, collateralPercent) {
  const lockPrice = floorMultiplyBy(harden(toLock), priceRate);
  return floorDivideBy(lockPrice, collateralPercent);
}

export function computeToLock(priceRate, toBorrow, collateralPercent) {
  const borrowWithMargin = floorMultiplyBy(harden(toBorrow), collateralPercent);
  return floorDivideBy(borrowWithMargin, priceRate);
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

/**
 *
 * @param {object} props
 * @param {Function} props.dispatch
 * @param {CollateralInfo | null} props.vaultCollateral
 * @param {Array<PursesJSONState> | null} props.purses
 * @param {Brand | null} props.runBrand
 * @param {Iterable<[Brand, BrandInfo]> | null} props.brandToInfo
 * @param {Map<Brand, VaultAssetState>} props.assets
 * @param {Amount<'nat'>} props.minInitialDebt
 * @param {Map<Brand, Record<string, any>>} props.governedParams
 * @returns {React.ReactElement}
 */
function VaultConfigure({
  dispatch,
  vaultCollateral,
  purses,
  runBrand,
  brandToInfo,
  assets,
  minInitialDebt,
  governedParams,
}) {
  const classes = useConfigStyles();

  const debtLimit = governedParams.get(vaultCollateral.brand).DebtLimit.value;
  const asset = assets.get(vaultCollateral.brand);

  // Purses with the same brand as the collateral brand that was
  // selected in the previous step.
  const fundPurses = filterPursesByBrand(purses, vaultCollateral.brand);

  // Purses with the RUN brand
  const dstPurses = filterPursesByBrand(purses, runBrand);

  sortPurses(fundPurses);
  sortPurses(dstPurses);

  const [fundPurse, setFundPurse] = useState(
    fundPurses.length ? fundPurses[0] : null,
  );
  const [dstPurse, setDstPurse] = useState(
    dstPurses.length ? dstPurses[0] : null,
  );

  const [collateralPercent, setCollateralPercent] = useState(
    makeRatio(
      vaultCollateral.liquidationMargin.numerator.value +
        vaultCollateral.liquidationMargin.denominator.value / 4n,
      vaultCollateral.liquidationMargin.numerator.brand,
      vaultCollateral.liquidationMargin.denominator.value,
      vaultCollateral.liquidationMargin.denominator.brand,
    ),
  );

  const priceRate = vaultCollateral.marketPrice;

  const [toBorrow, setToBorrow] = useState(minInitialDebt);
  // Assumes that collateral is AssetKind.NAT
  const [toLock, setToLock] = useState(
    computeToLock(priceRate, minInitialDebt, collateralPercent),
  );

  const [belowMinCollateralError, setBelowMinCollateralError] = useState(false);
  const [debtError, setDebtError] = useState(
    minInitialDebt.value > debtLimit.value
      ? 'Debt exceeds per-asset limit.'
      : null,
  );

  const onBorrowChange = newToBorrow => {
    setToBorrow(newToBorrow);
    setToLock(computeToLock(priceRate, newToBorrow, collateralPercent));
  };

  const onLockChange = newToLock => {
    setToLock(newToLock);
    setToBorrow(computeToBorrow(priceRate, newToLock, collateralPercent));
  };

  const onCollateralPercentChange = newCollateralPercent => {
    setCollateralPercent(newCollateralPercent);
    setToBorrow(computeToBorrow(priceRate, toLock, newCollateralPercent));
  };

  const fundPurseBalance = (fundPurse && fundPurse.value) || 0n;
  const balanceExceeded = fundPurseBalance < toLock.value;
  const fundPurseBalanceDisplay = stringifyPurseValue(fundPurse);

  const vaultConfig = {
    fundPurse,
    dstPurse,
    toBorrow,
    collateralPercent,
    toLock,
    stabilityFee: vaultCollateral.stabilityFee,
    liquidationMargin: vaultCollateral.liquidationMargin,
    marketPrice: vaultCollateral.marketPrice,
    interestRate: vaultCollateral.interestRate,
  };

  const handlePercentInputError = bool => {
    setBelowMinCollateralError(bool);
  };

  const handleDebtInputError = bool => {
    setDebtError(bool);
  };

  const {
    displayBrandPetname,
    displayPercent,
    getDecimalPlaces,
    displayAmount,
  } = makeDisplayFunctions(brandToInfo);
  const collateralPetnameDisplay = displayBrandPetname(vaultCollateral.brand);

  const toLockDecimalPlaces = getDecimalPlaces(toLock.brand);
  const toBorrowDecimalPlaces = getDecimalPlaces(toBorrow.brand);

  return (
    <div className={classes.root}>
      <ErrorBoundary>
        <Grid container spacing={1}>
          <Grid item xs={4}>
            <FormLabel component="legend" style={{ paddingTop: 20 }}>
              Choose your {collateralPetnameDisplay} vault parameters
            </FormLabel>
            <div style={{ paddingTop: 20 }}>
              {fundPurseBalanceDisplay} {collateralPetnameDisplay} Available
              from Funding Purse
            </div>
            <div style={{ paddingTop: 20 }}>
              Minimum initial debt: {displayAmount(minInitialDebt)}
            </div>
            <div style={{ paddingTop: 20 }}>
              Total debt for asset type: {displayAmount(asset.totalDebt)}
            </div>
            <div style={{ paddingTop: 20 }}>
              Total debt limit for asset type: {displayAmount(debtLimit)}
            </div>
            <div style={{ paddingTop: 20 }}>
              A stability fee of{' '}
              {displayPercent(vaultCollateral.stabilityFee, 2)}% will be charged
              on vault creation.
            </div>
          </Grid>
          <Grid item xs={8}>
            <ToLockValueInput
              collateralPetname={collateralPetnameDisplay}
              balanceExceeded={balanceExceeded}
              toLock={toLock}
              toLockDecimalPlaces={toLockDecimalPlaces}
              onChange={onLockChange}
            />
            <FundPurseSelector
              fundPurses={fundPurses}
              fundPurse={fundPurse}
              setFundPurse={setFundPurse}
            />
            <ToBorrowValueInput
              toBorrow={toBorrow}
              toBorrowDecimalPlaces={toBorrowDecimalPlaces}
              onChange={onBorrowChange}
              onError={handleDebtInputError}
              error={debtError}
              min={minInitialDebt}
              max={debtLimit}
            />
            <DstPurseSelector
              dstPurses={dstPurses}
              dstPurse={dstPurse}
              setDstPurse={setDstPurse}
            />
            <CollateralizationPercentInput
              collateralPercent={collateralPercent}
              onChange={onCollateralPercentChange}
              liquidationMargin={vaultCollateral.liquidationMargin}
              onError={handlePercentInputError}
              belowMinError={belowMinCollateralError}
              brandToInfo={brandToInfo}
            />
          </Grid>
          <Grid container justify="flex-end" alignItems="center">
            <CancelButton dispatch={dispatch} />
            <EnterButton
              dispatch={dispatch}
              vaultConfig={vaultConfig}
              disabled={
                balanceExceeded || belowMinCollateralError || debtError !== null
              }
            />
          </Grid>
        </Grid>
      </ErrorBoundary>
    </div>
  );
}

export default VaultConfigure;
