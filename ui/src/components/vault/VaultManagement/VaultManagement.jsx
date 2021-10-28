// @ts-check

import React, { useEffect, useState } from 'react';
import { Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import {
  multiplyBy,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport';
import { amountMath } from '@agoric/ertp';
import { Nat } from '@agoric/nat';
import { E } from '@agoric/eventual-send';

import AdjustVaultForm from './AdjustVaultForm';
import UnchangeableValues from './UnchangeableValues';
import ChangesTable from './ChangesTable';
import CloseVaultForm from './CloseVaultForm';
import ErrorBoundary from '../../ErrorBoundary';

import { useApplicationContext } from '../../../contexts/Application';
import { makeDisplayFunctions } from '../../helpers';

const useStyles = makeStyles(theme => ({
  root: {
    marginBottom: theme.spacing(3),
  },
  header: {
    marginTop: theme.spacing(3),
    marginBottom: theme.spacing(1),
    marginLeft: theme.spacing(1),
    padding: theme.spacing(2),
    '& > .MuiTypography-root': {
      fontFamily: 'Inter',
      fontWeight: '500',
      color: '#707070',
      fontSize: '22px',
    },
    '& > .MuiTypography-h3': {
      fontSize: '40px',
      lineHeight: '48px',
    },
  },
  valuesTable: {
    marginBottom: theme.spacing(3),
  },
}));

const VaultManagement = () => {
  const classes = useStyles();

  const { state, walletP } = useApplicationContext();

  const {
    purses,
    vaults,
    vaultToManageId,
    brandToInfo,
    autoswap: { ammAPI },
  } = state;

  /** @type { import('../../../store').VaultData } */
  let vaultToManage = {
    collateralizationRatio: null,
    debt: null,
    interestRate: null,
    liquidationRatio: null,
    locked: null,
  };
  if (vaultToManageId && vaults) {
    vaultToManage = vaults[vaultToManageId];
  }

  const {
    debt,
    interestRate,
    // liquidated,
    liquidationRatio,
    locked,
    // status,
  } = vaultToManage;

  assert(locked, 'locked missing from vaultToManage???');
  assert(debt, 'debt missing from vaultToManage???');

  const [lockedAfterDelta, setLockedAfterDelta] = useState(locked);
  const [debtAfterDelta, setDebtAfterDelta] = useState(debt);
  const noRatio = /** @type { Ratio | null } */ (null);
  const [newCollateralizationRatio, setNewCollateralizationRatio] = useState(
    noRatio,
  );
  const [marketPrice, setMarketPrice] = useState(noRatio);
  // calculate based on market price
  const [collateralizationRatio, setCollateralizationRatio] = useState(noRatio);

  if (vaultToManage.locked === null) {
    return <div>Please select a vault to manage.</div>;
  }

  const {
    displayBrandPetname,
    displayAmount,
    getDecimalPlaces,
  } = makeDisplayFunctions(brandToInfo);
  const lockedPetname = displayBrandPetname(locked.brand);

  /**
   * Collateralization ratio is the value of collateral to debt.
   *
   * @param {Ratio} priceRate
   * @param {Amount} newLock
   * @param {Amount} newBorrow
   */
  const calcRatio = (priceRate, newLock, newBorrow) => {
    const lockPrice = multiplyBy(newLock, priceRate);
    const newRatio = makeRatioFromAmounts(lockPrice, newBorrow);
    return newRatio;
  };

  // run once when component loaded.
  // TODO: use makeQuoteNotifier
  useEffect(() => {
    const decimalPlaces = getDecimalPlaces(locked.brand);

    // Make what would display as 1 unit of collateral
    const inputAmount = amountMath.make(
      10n ** Nat(decimalPlaces),
      locked.brand,
    );
    assert(ammAPI, 'ammAPI missing');
    const quoteP = E(ammAPI).getPriceGivenAvailableInput(
      inputAmount,
      debt.brand,
    );

    quoteP.then(({ amountIn, amountOut }) => {
      const newMarketPrice = makeRatioFromAmounts(
        amountOut, // RUN
        amountIn, // 1 unit of collateral
      );
      setMarketPrice(newMarketPrice);
      setCollateralizationRatio(calcRatio(newMarketPrice, locked, debt));
    });
  }, []);

  if (!marketPrice) {
    return <div>Finding the market price...</div>;
  }

  const onLockedDeltaChange = newLockedAfterDelta => {
    setLockedAfterDelta(newLockedAfterDelta);
    setNewCollateralizationRatio(
      calcRatio(marketPrice, newLockedAfterDelta, debtAfterDelta),
    );
  };

  const onDebtDeltaChange = newDebtAfterDelta => {
    setDebtAfterDelta(newDebtAfterDelta);
    setNewCollateralizationRatio(
      calcRatio(marketPrice, lockedAfterDelta, newDebtAfterDelta),
    );
  };

  const checkIfOfferInvalid = () => {
    if (!liquidationRatio) return false;
    const ratio = calcRatio(marketPrice, lockedAfterDelta, debtAfterDelta);
    const approxCollateralizationRatio =
      Number(ratio.numerator.value) / Number(ratio.denominator.value);
    const approxLiquidationRatio =
      Number(liquidationRatio.numerator.value) /
      Number(liquidationRatio.denominator.value);
    return approxCollateralizationRatio < approxLiquidationRatio;
  };

  const header = (
    <div className={classes.header}>
      <Typography variant="h3">
        {displayAmount(locked)} {lockedPetname} Locked
      </Typography>
      <Typography>Vault ID: {vaultToManageId}</Typography>
    </div>
  );

  return (
    <div className={classes.root}>
      <ErrorBoundary>
        {header}{' '}
        <UnchangeableValues
          marketPrice={marketPrice}
          liquidationRatio={liquidationRatio}
          interestRate={interestRate}
          brandToInfo={brandToInfo}
          debt={debt}
          locked={locked}
        />
        <div className={classes.valuesTable}>
          <ChangesTable
            locked={locked}
            lockedAfterDelta={lockedAfterDelta}
            collateralizationRatio={collateralizationRatio}
            newCollateralizationRatio={newCollateralizationRatio}
            debt={debt}
            debtAfterDelta={debtAfterDelta}
            brandToInfo={brandToInfo}
          />
        </div>
        <AdjustVaultForm
          purses={purses}
          walletP={walletP}
          vaultToManageId={vaultToManageId}
          debt={debt}
          locked={locked}
          onLockedDeltaChange={onLockedDeltaChange}
          onDebtDeltaChange={onDebtDeltaChange}
          brandToInfo={brandToInfo}
          invalidOffer={checkIfOfferInvalid()}
        />{' '}
        <CloseVaultForm
          purses={purses}
          walletP={walletP}
          vaultToManageId={vaultToManageId}
          debt={debt}
          locked={locked}
          brandToInfo={brandToInfo}
        />
      </ErrorBoundary>
    </div>
  );
};

export default VaultManagement;
