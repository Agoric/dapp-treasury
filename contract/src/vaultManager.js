// @ts-check
import '@agoric/zoe/exported';

import { assert, details, q } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { trade, assertProposalShape } from '@agoric/zoe/src/contractSupport';
import { makeVault } from './vault';
import { makeEmptyOfferWithResult } from './make-empty';

// Each VaultManager manages a single collateralType. It owns an autoswap
// instance which trades this collateralType against Scones. It also manages
// some number of outstanding loans, each called a Vault, for which the
// collateral is provided in exchanged for borrowed Scones.

// todo: two timers: one to increment fees, second (not really timer) when
// the autoswap price changes, to check if we need to liquidate

/**
 *
 * @typedef {Object} InnerVaultManager
 * @property {AmountMath} collateralMath
 * @property {Brand} collateralBrand
 * @property {() => number} getLiquidationMargin
 */

/**
 * @param {ContractFacet} zcf
 * @param {MultipoolAutoswap} autoswap
 * @param {ZCFMint} sconeMint
 * @param {Brand} collateralBrand
 */
export function makeVaultManager(zcf, autoswap, sconeMint, collateralBrand) {
  const { issuer: sconeIssuer, amountMath: sconeMath, brand: sconeBrand } = sconeMint.getIssuerRecord();
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
  function invest(collateralTokens) // -> Ownership Tokens
  {
    // we hold the liquidity tokens as an asset, and have the ownership
    // tokens as a liability

    // option 1: add only the collateralTokens to the autoswap's liquidity
    // pool, hold

    // option 2: get the current price from the autoswap, mint a matching
    // number of Scones for the collateral, add both (collateral+scones) into
    // the autoswap pool, hold the resulting liquidity tokens. When we redeem
    // the liquidity tokens, burn those scones.


    // ltokens = autoswap.addLiquidity(collateralTokens)
    // otokens = ownershipMint.mintPayment(count)
    // return otokens

    // this VM can choose to invest in other VMs, getting back ownership
    // shares in those VMs
  }

  /**
   * @param {any} ownershipTokens
   */
  function sellOwnershipTokens(ownershipTokens) // -> collateralTokens
  {}


  // end users can the SCM for loans with some collateral, and the SCM asks
  // us to make a new Vault

  // loans must initially have at least 1.5x collateralization
  const initialMargin = 1.5;
  // loans below this margin may be liquidated
  const liquidationMargin = 1.2;

  /** @type {InnerVaultManager} */
  const innerFacet = harden({
    getLiquidationMargin() { return liquidationMargin; },
    getInitialMargin() { return initialMargin; },
    collateralBrand,
    collateralMath,
  })

  function makeLoanInvitation() {
    /**
     * @param {ZCFSeat} seat
     */
    async function makeLoanHook(seat) {
      assertProposalShape(seat, {
        give: { Collateral: null },
        want: { Scones: null },
      });
      const {
        give: { Collateral: collateralAmount },
        want: { Scones: sconesWanted },
      } = seat.getProposal();

      // this offer will hold the collateral until the loan is retired. The
      // payout from it will be handed to the user: if the vault dies early
      // (because the StableCoinMachine vat died), they'll get all their
      // collateral back.
      const { zcfSeat: collateralSeat, userSeat } = zcf.makeEmptySeatKit();
      // get the payout to provide access to the collateral if the 
      // contract abandons
      const collateralPayoutP = E(userSeat).getPayouts();
      const salePrice = await E(autoswap).getInputPrice(collateralAmount, sconeBrand);
      //console.log("SALE PRICE  ", salePrice, salePrice.value / initialMargin);
      const maxScones = sconeMath.make(Math.ceil(salePrice.value / initialMargin)); // todo fee
      assert(sconeMath.isGTE(maxScones, sconesWanted), 'you ask for too much');
      // todo fee: maybe mint new Scones, send to reward pool, increment how
      // much must be paid back

      // todo trigger process() check right away, in case the price dropped while we ran

      // todo (from dean) use a different offer for newly minted stablecoins,
      // to prevent something something that lets them get back both their
      // collateral and the new coins

      sconeMint.mintGains({ Scones: sconesWanted }, collateralSeat);

      trade(zcf, 
        { seat: collateralSeat,
          gains: { Collateral: collateralAmount },
        },
        { seat: seat,
          gains: { Scones: sconesWanted },
        },
      );

      const sconeDebt = sconesWanted; // todo +fee
      const vaultKit = makeVault(zcf, innerFacet, collateralSeat, sconeDebt, sconeMint, autoswap);
      const {
        vault,
      } = vaultKit;
      allVaults.push(vaultKit);

      seat.exit();

      // todo: nicer to return single objects, find a better way to give them
      // the payout object
      return harden({
        vault,
        liquidationPayout: collateralPayoutP,
      });
    }

    return zcf.makeInvitation(makeLoanHook, 'make a loan');
  }


  // Called by the vault when liquidation is insufficient. We're expected to
  // come up with 'underwaterBy' Scones.
  /**
   * @param {any} underwaterBy
   */
  function helpLiquidateFallback(underwaterBy) {
  }

  return harden({
    makeLoanInvitation,
    getLiquidationMargin() { return liquidationMargin; },
    getInitialMargin() { return initialMargin; },
    liquidateAll,
  });
}
