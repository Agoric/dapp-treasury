// @ts-check
import '@agoric/zoe/exported';

import { E } from '@agoric/eventual-send';
import { assertProposalShape } from '@agoric/zoe/src/contractSupport';
import { makePercent } from '@agoric/zoe/src/contractSupport/percentMath';
import { makeVaultKit } from './vault';

// Each VaultManager manages a single collateralType. It owns an autoswap
// instance which trades this collateralType against Scones. It also manages
// some number of outstanding loans, each called a Vault, for which the
// collateral is provided in exchange for borrowed Scones.

// todo: two timers: one to increment fees, second (not really timer) when
// the autoswap price changes, to check if we need to liquidate

const BASIS_POINTS = 10000;

/** @type {MakeVaultManager} */
export function makeVaultManager(
  zcf,
  autoswap,
  sconeMint,
  collateralBrand,
  priceAuthority,
  rates,
  rewardPoolStaging,
) {
  const {
    amountMath: sconeMath,
    brand: sconeBrand,
  } = sconeMint.getIssuerRecord();
  const collateralMath = zcf.getAmountMath(collateralBrand);

  // todo: sort by price at which we need to liquidate
  const allVaults = [];

  function liquidateAll() {
    const promises = allVaults.map(vaultKit => E(vaultKit).liquidate());
    return Promise.all(promises);
  }

  // the SCM can call invest. This will mint Scones and buy liquidity tokens
  // from the pool
  /**
   * @param {any} collateralTokens
   */
  // function invest(_collateralTokens) {
  //   // -> Ownership Tokens
  //   // we hold the liquidity tokens as an asset, and have the ownership
  //   // tokens as a liability
  //   // option 1: add only the collateralTokens to the autoswap's liquidity
  //   // pool, hold
  //   // option 2: get the current price from the autoswap, mint a matching
  //   // number of Scones for the collateral, add both (collateral+scones) into
  //   // the autoswap pool, hold the resulting liquidity tokens. When we redeem
  //   // the liquidity tokens, burn those scones.
  //   // ltokens = autoswap.addLiquidity(collateralTokens)
  //   // otokens = ownershipMint.mintPayment(count)
  //   // return otokens
  //   // this VM can choose to invest in other VMs, getting back ownership
  //   // shares in those VMs
  // }

  /**
   * @param {any} ownershipTokens
   */
  // function sellOwnershipTokens(ownershipTokens) {
  //   // -> collateralTokens
  // }

  // end users can ask the SCM for loans with some collateral, and the SCM asks
  // us to make a new Vault

  const loanFee = makePercent(rates.loanFeeBPs, sconeMath, BASIS_POINTS);

  // We want an inverted version. Ratio will support that, but Percent doesn't
  const liqMargin = makePercent(rates.liquidationMargin, sconeMath);

  const shared = {
    // loans below this margin may be liquidated
    getLiquidationMargin() {
      return liqMargin;
    },
    // loans must initially have at least 1.2x collateralization
    getInitialMargin() {
      return rates.initialMargin;
    },
    getLoanFee() {
      return loanFee;
    },
    async getCollateralQuote() {
      // get a quote for one unit of the collateral
      const displayInfo = await E(collateralBrand).getDisplayInfo();
      const decimalPlaces = (displayInfo && displayInfo.decimalPlaces) || 0;
      return E(priceAuthority).quoteGiven(
        collateralMath.make(10 ** decimalPlaces),
        sconeBrand,
      );
    },
  };

  /** @type {InnerVaultManager} */
  const innerFacet = harden({
    ...shared,
    collateralBrand,
    collateralMath,
  });

  /** @param {ZCFSeat} seat */
  async function makeLoanKit(seat) {
    assertProposalShape(seat, {
      give: { Collateral: null },
      want: { Scones: null },
    });

    // TODO check that it's for the right type of collateral

    const vaultKit = makeVaultKit(
      zcf,
      innerFacet,
      sconeMint,
      autoswap,
      priceAuthority,
      rewardPoolStaging,
    );

    const { vault, openLoan } = vaultKit;
    const { notifier, collateralPayoutP } = await openLoan(seat);
    allVaults.push(vaultKit);

    seat.exit();

    // TODO: nicer to return single objects, find a better way to give them
    // the payout object
    return harden({
      uiNotifier: notifier,
      vault,
      liquidationPayout: collateralPayoutP,
    });
  }

  // Called by the vault when liquidation is insufficient. We're expected to
  // come up with 'underwaterBy' Scones.
  /**
   * @param {any} underwaterBy
   */
  // function helpLiquidateFallback(underwaterBy) {}

  /** @type {VaultManager} */
  return harden({
    ...shared,
    makeLoanKit,
    liquidateAll,
  });
}
