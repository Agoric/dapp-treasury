import React, { useState } from 'react';

import { makeStyles } from '@material-ui/core/styles';

import { FormLabel, Grid } from '@material-ui/core';

import { stringifyPurseValue } from '@agoric/ui-components';
import { multiplyBy, divideBy } from '@agoric/zoe/src/contractSupport';
import { amountMath } from '@agoric/ertp';

import '../../../types/types';

import {
  getPurseDecimalPlaces,
  displayPetname,
  filterPursesByBrand,
  sortPurses,
  getInfoForBrand,
} from '../../helpers';

import ToLockValueInput from './ToLockValueInput';
import ToBorrowValueInput from './ToBorrowValueInput';
import FundPurseSelector from './FundPurseSelector';
import DstPurseSelector from './DstPurseSelector';
import CancelButton from './CancelButton';
import EnterButton from './EnterButton';
import CollateralizationPercentInput from './CollateralizationPercentInput';

export function computeToBorrow(priceRate, toLock, collateralPercent) {
  const lockPrice = multiplyBy(toLock, priceRate);
  return divideBy(lockPrice, collateralPercent);
}

export function computeToLock(priceRate, toBorrow, collateralPercent) {
  const borrowWithMargin = multiplyBy(toBorrow, collateralPercent);
  return divideBy(borrowWithMargin, priceRate);
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
 * @param {CollateralInfo} props.vaultCollateral
 * @param {Array<PursesJSONState>} props.purses
 * @param {Brand} props.moeBrand
 * @param {Array<Array<Brand, BrandInfo>>} props.brandToInfo
 * @returns {React.ReactElement}
 */
function VaultConfigure({
  dispatch,
  vaultCollateral,
  purses,
  moeBrand,
  brandToInfo,
}) {
  const classes = useConfigStyles();

  // Purses with the same brand as the collateral brand that was
  // selected in the previous step.
  const fundPurses = filterPursesByBrand(purses, vaultCollateral.brand);

  // Purses with the moe brand
  const dstPurses = filterPursesByBrand(purses, moeBrand);

  sortPurses(fundPurses);
  sortPurses(dstPurses);

  const [fundPurse, setFundPurse] = useState(
    fundPurses.length ? fundPurses[0] : null,
  );
  const [dstPurse, setDstPurse] = useState(
    dstPurses.length ? dstPurses[0] : null,
  );
  const [toBorrow, setToBorrow] = useState(amountMath.makeEmpty(moeBrand));
  // Assumes that collateral is MathKind.NAT
  const [toLock, setToLock] = useState(
    amountMath.makeEmpty(vaultCollateral.brand),
  );
  const [collateralPercent, setCollateralPercent] = useState(
    vaultCollateral.initialMargin,
  );

  const [belowMinError, setBelowMinError] = useState(false);

  const toLockDecimalPlaces = getPurseDecimalPlaces(fundPurse);
  const priceRate = vaultCollateral.marketPrice;

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
  };

  const handlePercentInputError = bool => {
    setBelowMinError(bool);
  };

  const collateralInfo = getInfoForBrand(brandToInfo, vaultCollateral.brand);

  return (
    <div className={classes.root}>
      <Grid container spacing={1}>
        <Grid item xs={4}>
          <FormLabel component="legend" style={{ paddingTop: 20 }}>
            Choose your {displayPetname(collateralInfo.petname)} vault
            parameters
          </FormLabel>
          <div style={{ paddingTop: 20 }}>
            {fundPurseBalanceDisplay} {displayPetname(collateralInfo.petname)}{' '}
            Available from Funding Purse
          </div>
        </Grid>
        <Grid item xs={4}>
          <FundPurseSelector
            fundPurses={fundPurses}
            fundPurse={fundPurse}
            setFundPurse={setFundPurse}
          />
          <ToLockValueInput
            collateralPetname={displayPetname(collateralInfo.petname)}
            balanceExceeded={balanceExceeded}
            toLock={toLock}
            toLockDecimalPlaces={toLockDecimalPlaces}
            onChange={onLockChange}
          />
          <CollateralizationPercentInput
            collateralPercent={collateralPercent}
            onChange={onCollateralPercentChange}
            initialMargin={vaultCollateral.initialMargin}
            onError={handlePercentInputError}
            belowMinError={belowMinError}
          />
        </Grid>
        <Grid item xs={4}>
          <ToBorrowValueInput
            toBorrow={toBorrow}
            toBorrowDecimalPlaces={getPurseDecimalPlaces(dstPurse)}
            onChange={onBorrowChange}
          />
          <DstPurseSelector
            dstPurses={dstPurses}
            dstPurse={dstPurse}
            setDstPurse={setDstPurse}
          />
        </Grid>
        <Grid container justify="flex-end" alignItems="center">
          <CancelButton dispatch={dispatch} />
          <EnterButton
            dispatch={dispatch}
            balanceExceeded={balanceExceeded}
            vaultConfig={vaultConfig}
            belowMinError={belowMinError}
          />
        </Grid>
      </Grid>
    </div>
  );
}

export default VaultConfigure;
