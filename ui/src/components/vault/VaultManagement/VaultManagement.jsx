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
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
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

  console.log('vaults', vaults, 'vaultToManageId', vaultToManageId);

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

  const [lockedAfterDelta, setLockedAfterDelta] = useState(locked);
  const [debtAfterDelta, setDebtAfterDelta] = useState(debt);
  const [newCollateralizationRatio, setNewCollateralizationRatio] = useState(
    null,
  );
  const [marketPrice, setMarketPrice] = useState(null);
  // calculate based on market price
  const [collateralizationRatio, setCollateralizationRatio] = useState(null);

  if (vaultToManage.locked === null) {
    return <div>Please select a vault to manage.</div>;
  }

  const {
    displayBrandPetname,
    displayAmount,
    getDecimalPlaces,
  } = makeDisplayFunctions(brandToInfo);
  const lockedPetname = displayBrandPetname(locked.brand);

  // Collateralization ratio is the value of collateral to debt.
  const calcRatio = (priceRate, newLock, newBorrow) => {
    console.log(
      'priceRate',
      priceRate,
      'newLock',
      newLock,
      'newBorrow',
      newBorrow,
    );
    const lockPrice = multiplyBy(newLock, priceRate);
    const newRatio = makeRatioFromAmounts(lockPrice, newBorrow);
    console.log(newRatio);
    return newRatio;
  };

  // run once when component loaded.
  // TODO: use makeQuoteNotifier
  useEffect(() => {
    console.log('getting quote for marketPrice');
    const decimalPlaces = getDecimalPlaces(locked.brand);

    // Make what would display as 1 unit of collateral
    const inputAmount = amountMath.make(
      10n ** Nat(decimalPlaces),
      locked.brand,
    );
    const quoteP = E(ammAPI).getPriceGivenAvailableInput(
      inputAmount,
      debt.brand,
    );

    console.log('marketPrice inputAmount', inputAmount);

    quoteP.then(({ amountIn, amountOut }) => {
      console.log('setting marketPrice', amountIn, amountOut);
      const newMarketPrice = makeRatioFromAmounts(
        amountOut, // RUN
        amountIn, // 1 unit of collateral
      );
      console.log('marketPrice', marketPrice);
      setMarketPrice(newMarketPrice);
      setCollateralizationRatio(calcRatio(newMarketPrice, locked, debt));
    });
  }, []);

  if (!marketPrice) {
    return <div>Finding the market price...</div>;
  }

  console.log('newCollateralizationRatio', newCollateralizationRatio);

  const onLockedDeltaChange = newLockedAfterDelta => {
    setLockedAfterDelta(newLockedAfterDelta);
    setNewCollateralizationRatio(
      calcRatio(marketPrice, lockedAfterDelta, debtAfterDelta),
    );
  };

  const onDebtDeltaChange = newDebtAfterDelta => {
    setDebtAfterDelta(newDebtAfterDelta);
    setNewCollateralizationRatio(
      calcRatio(marketPrice, lockedAfterDelta, debtAfterDelta),
    );
  };

  const header = (
    <div className={classes.header}>
      <Typography>Vault {vaultToManageId}</Typography>
      <Typography variant="h3" gutterBottom>
        {displayAmount(locked)} {lockedPetname} locked
      </Typography>
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
          // liquidationPenalty={liquidationPenalty}
          brandToInfo={brandToInfo}
          debt={debt}
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
