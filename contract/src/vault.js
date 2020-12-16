// @ts-check
import '@agoric/zoe/exported';

import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { trade, assertProposalShape } from '@agoric/zoe/src/contractSupport';
import { burn, escrowAllTo, whenAllProps } from './burn';
import { makeTracer } from './makeTracer';

// a Vault is an individual loan, using some collateralType as the
// collateral, and lending Scones to the borrower

/**
 * @typedef {import('./vaultManager').InnerVaultManager} InnerVaultManager
 */

/**
 * @typedef {ReturnType<typeof import('./vaultManager').makeVaultManager>} VaultManager
 * @typedef {ReturnType<typeof makeVault>} Vault
 * @param {ContractFacet} zcf
 * @param {InnerVaultManager} manager
 * @param {ZCFSeat} collateralSeat
 * @param {Amount} sconeDebt
 * @param {ZCFMint} sconeMint
 * @param {MultipoolAutoswap} autoswap
 */
export function makeVault(
  zcf,
  manager,
  collateralSeat,
  sconeDebt,
  sconeMint,
  autoswap,
) {
  const trace = makeTracer('VV');

  let active = true; // liquidation halts all user actions
  // eslint-disable-next-line no-unused-vars
  const accumulatedFee = 0;
  const collateralMath = manager.collateralMath;
  const collateralBrand = manager.collateralBrand;
  // eslint-disable-next-line no-unused-vars
  const collateralIssuer = zcf.getIssuerForBrand(collateralBrand);

  // 'collateralHolderOffer' is the Offer that currently holds the borrower's
  // collateral (zoe owns the tokens for the benefit of this Offer)
  const {
    issuer: _sconeIssuer,
    amountMath: sconeMath,
    brand: sconeBrand,
  } = sconeMint.getIssuerRecord();
  const zoe = zcf.getZoeService();

  // const FixMeEmptyGO = {};

  /**
   * @param {ZCFSeat} seat
   */
  function addCollateralHook(seat) {
    assertProposalShape(seat, {
      give: { Collateral: null },
      want: {},
    });
    const {
      give: { Collateral: collateralAmount },
    } = seat.getProposal();
    trade(
      zcf,
      { seat: collateralSeat, gains: { Collateral: collateralAmount } },
      { seat, gains: {} },
    );
    seat.exit();
    return 'a warm fuzzy feeling that you are further away from default than ever before';
  }
  function makeAddCollateralInvitation() {
    assert(active, 'vault has been liquidated');
    return zcf.makeInvitation(addCollateralHook, 'add collateral');
  }

  /*
  // this version can only pay back the whole loan
  async function paybackHook(offerHandle) {
    const {
      proposal: {
        give: { Scones: sconesReturned },
        want: { Collateral: collateralAmount }, // user should pre-measure the remaining collateral
      },
    } = zcf.getOffer(offerHandle);

    const { Collateral: haveCollateral } = zcf.getCurrentAllocation(collateralHolderOffer);

    assert(sconeMath.isGTE(sconesReturned, sconeDebt));

    trade(zcf, 
      {
        offerHandle: collateralHolderOffer,
        gains: { Scones: sconeDebt }, // return any overpayment
      },
      { offerHandle,
        gains: { Collateral: haveCollateral },
      },
    );
    sconeDebt = sconeMath.getEmpty();
    // burn the scones. first we need zoe to make us a payment
    await burn(zcf, collateralHolderOffer, { Scones: sconeDebt });
    // AWAIT

    offerHandle.exit();

    return 'thank you for your business';
  }
  */

  /**
   * @param {ZCFSeat} seat
   */
  async function paybackHook(seat) {
    assert(active, 'vault has been liquidated');
    assertProposalShape(seat, {
      give: { Scones: null },
      want: { Collateral: null },
    });
    const {
      give: { Scones: sconesReturned },
      want: { Collateral: collateralWanted },
    } = seat.getProposal();

    // precheckCollateral MUST NOT be relied on after a turn boundary
    const precheckCollateral = collateralSeat.getAmountAllocated(
      'Collateral',
      collateralBrand,
    );
    // const precheckCollateral = collateralSeat.getCurrentAllocation().Collateral;
    assert(
      collateralMath.isGTE(precheckCollateral, collateralWanted),
      'want is more collateral than is available',
    );
    const remainingCollateral = collateralMath.subtract(
      precheckCollateral,
      collateralWanted,
    );
    const salePrice = await E(autoswap).getInputPrice(
      remainingCollateral,
      sconeBrand,
    );
    // AWAIT

    // IF THE COLLATERAL HAS CHANGED, RESTART
    const currentCollateral = collateralSeat.getAmountAllocated(
      'Collateral',
      collateralBrand,
    );
    if (!collateralMath.isGTE(precheckCollateral, currentCollateral)) {
      // collateral has changed. Retry in the new world.
      return paybackHook(seat);
    }

    // you might offer too much: we won't take more than you owe
    const acceptedScones = sconeMath.isGTE(sconesReturned, sconeDebt)
      ? sconeDebt
      : sconesReturned;
    // if we accept your scones, this is how much you'd still owe
    const remainingDebt = sconeMath.subtract(sconeDebt, acceptedScones);

    // that will require at least this much collateral:
    const margin = manager.getLiquidationMargin();
    const maxScones = sconeMath.make(Math.ceil(salePrice.value / margin));
    // TODO is there a better policy than:
    //      don't reject if they are not taking out collateral
    if (!collateralMath.isEmpty(collateralWanted)) {
      assert(
        sconeMath.isGTE(maxScones, remainingDebt),
        'insufficient remaining collateral',
      );
    }

    trade(
      zcf,
      {
        seat: collateralSeat,
        gains: { Scones: acceptedScones }, // return any overpayment
      },
      {
        seat,
        gains: { Collateral: collateralWanted },
      },
    );
    sconeDebt = sconeMath.subtract(sconeDebt, acceptedScones);
    seat.exit();

    // todo: have a separate offer just for burning, don't use
    // 'collateralHolderOffer'. burn offers are short-lived,
    // 'collateralHolderOffer' is long-lived

    // burn the scones. first we need zoe to make us a payment
    sconeMint.burnLosses({ Scones: acceptedScones }, collateralSeat);

    // note: the only way to delete the Vault completely is close()
    return 'thank you for your payment';
  }

  function makePaybackInvitation() {
    assert(active, 'vault has been liquidated');
    return zcf.makeInvitation(paybackHook, 'pay back partially');
  }

  async function closeHook(seat) {
    assert(active, 'vault has been liquidated');
    assertProposalShape(seat, {
      give: { Scones: null },
      want: { Collateral: null },
    });
    const {
      give: { Scones: sconesReturned },
      want: { Collateral: _collateralWanted },
    } = seat.getProposal();

    // you're paying off the debt, you get everything back. If you were
    // underwater, we should have liquidated some collateral earlier: we
    // missed our chance.

    // you must pay off the entire remainder
    assert(sconeMath.isGTE(sconesReturned, sconeDebt));
    // but if you offer too much, we won't take more than you owe
    const acceptedScones = sconeMath.make(
      Math.min(sconesReturned.value, sconeDebt.value),
    );

    const currentCollateral = collateralSeat.getAmountAllocated(
      'Collateral',
      collateralBrand,
    );

    trade(
      zcf,
      {
        seat: collateralSeat,
        gains: { Scones: acceptedScones }, // return any overpayment
      },
      {
        seat,
        gains: { Collateral: currentCollateral },
      },
    );
    sconeDebt = sconeMath.getEmpty();
    seat.exit();

    // burn the scones. first we need zoe to make us a payment
    // TODO
    await burn(zcf, collateralSeat, { Scones: acceptedScones });
    // AWAIT

    // todo: close the vault
    active = false;
    // collateralHolderOffer.exit()

    return 'your loan is closed, thank you for your business';
  }

  function makeCloseInvitation() {
    assert(active, 'vault has been liquidated');
    return zcf.makeInvitation(closeHook, 'pay off entire loan and close Vault');
  }

  async function liquidate() {
    // Sell off all their collateral. We really only need enough to
    // cover 'sconeDebt', but earlier autoswap API didn't give a way to
    // specify just the output amount yet.
    // TODO change to SwapOut
    const currentCollateral = collateralSeat.getAmountAllocated(
      'Collateral',
      collateralBrand,
    );
    trace('liquidating', currentCollateral);

    // Move assets to a new seat to extract to Payments
    const { zcfSeat: swapSeat, userSeat } = zcf.makeEmptySeatKit();
    trade(
      zcf,
      {
        seat: collateralSeat,
        gains: {},
        losses: { Collateral: currentCollateral },
      },
      { seat: swapSeat, gains: { In: currentCollateral } },
    );
    swapSeat.exit();
    // extract the assets to Payments and make the offer
    const payments = await whenAllProps(E(userSeat).getPayouts());
    trace('selling collateral', payments);

    const liqProposal = harden({
      give: { In: currentCollateral },
      want: { Out: sconeMath.getEmpty() },
    });
    const swapInvitation = E(autoswap).makeSwapInvitation();
    const offerSeat = E(zoe).offer(swapInvitation, liqProposal, payments);
    const swapPayouts = await whenAllProps(E(offerSeat).getPayouts());
    const swapAmounts = await whenAllProps(E(offerSeat).getCurrentAllocation());
    trace('sold collateral', swapAmounts, swapPayouts);

    const cAmounts = {
      Scones: swapAmounts.Out,
      Collateral: swapAmounts.In,
    };
    const cPayments = {
      Scones: swapPayouts.Out,
      Collateral: swapPayouts.In,
    };
    await escrowAllTo(zcf, collateralSeat, cAmounts, cPayments);
    trace('re-escrowed', cAmounts, cPayments);

    // NOTE that this synchronously separates the collateral out, so it's not on the
    // collateralSeat while the sale is in progress.
    trace('');

    // Now we need to know how much was sold so we can payoff the debt
    const sconeProceedsAmount = collateralSeat.getAmountAllocated(
      'Scones',
      sconeBrand,
    );
    trace('scones', sconeProceedsAmount);

    // we now claim enough from sconeProceeds to cover the debt (if there's
    // enough). They get back the rest, as well as any remaining scones.

    const isUnderwater = !sconeMath.isGTE(sconeProceedsAmount, sconeDebt);
    const sconesToBurn = isUnderwater ? sconeProceedsAmount : sconeDebt;
    trace('LIQ ', sconeDebt, sconeProceedsAmount, sconesToBurn);
    sconeMint.burnLosses({ Scones: sconesToBurn }, collateralSeat);
    sconeDebt = sconeMath.subtract(sconeDebt, sconesToBurn);
    trace('burned', sconesToBurn);

    // refund any remaining scones, plus anything else leftover from the sale
    // (perhaps some collateral, who knows maybe autoswap threw in a free
    // toaster)

    // const collateralRefund = await salesPayout.In;
    // const collateralRefundAmount = await collateralRefund
    //     ? collateralIssuer.getAmountOf(collateralRefund)
    //     : collateralMath.getEmpty();

    // debugTick('refund1');
    // const refundAmounts = { Scones: sconeRefundAmount, Collateral: collateralRefundAmount };
    // const refunds = { Scones: sconePaymentToRefund, Collateral: collateralRefund };
    // debugTick('refund2');

    collateralSeat.exit();
    trace('refunded');

    if (isUnderwater) {
      trace(`underwater by`, sconeDebt);
      // todo: fall back to next recovery layer. The vaultManager holds
      // liquidity tokens, it will sell some to give us the needed scones.
      // moreSconesToBurn = vaultManager.helpLiquidateFallback(underwaterBy);
    }
  }

  // Call this each time the price changes, and after some other operations.
  // If the collateral no longer has sufficient value to meet the margin
  // requirement, this will sell off all the collateral, deduct (and burn)
  // the scones they still owe, and return any remaining scones. If the sale
  // didn't yield enough scones to cover their debt, liquidate() will appeal
  // to the next layer (the vaultManager).
  async function checkMargin() {
    if (!active) {
      return;
    }

    // get current price
    const currentCollateral = collateralSeat.getAmountAllocated(
      'Collateral',
      collateralBrand,
    );
    const salePrice = await E(autoswap).getInputPrice(
      currentCollateral,
      sconeBrand,
    );
    // AWAIT
    if (!active) {
      return;
    }

    // compute how much debt is supported by the current collateral at that price
    const liquidationMargin = manager.getLiquidationMargin();
    const maxScones = sconeMath.make(salePrice.value / liquidationMargin);

    if (!sconeMath.isGTE(maxScones, sconeDebt)) {
      liquidate();
    }
  }

  // todo: add liquidateSome(collateralAmount): sells some collateral, reduces some debt

  function getCollateralAmount() {
    // todo?: assert(active, 'vault has been liquidated');
    return collateralSeat.hasExited()
      ? collateralMath.getEmpty()
      : collateralSeat.getAmountAllocated('Collateral', collateralBrand);
  }

  function getDebtAmount() {
    // todo?: assert(active, 'vault has been liquidated');
    return sconeDebt;
  }

  // how do I get a floating point number ration here?
  // function getCollateralizationPercent() {
  //   return sconeDebt.value / getCollateralAmount().value;
  // }

  const vault = harden({
    makeAddCollateralInvitation,
    makePaybackInvitation,
    makeCloseInvitation,

    // for status/debugging
    getCollateralAmount,
    getDebtAmount,
    // getFeeAmount,
  });

  return harden({
    vault,
    liquidate,
    checkMargin,
  });
}

// payback could be split into:
// * returnScones: reduces sconeDebt
// * withdrawSomeCollateral: do margin check, remove collateral
// * close: do margin check, remove all collateral, close Vault
//
// the downside is that a buggy vault contract could accept returnScones()
// but break before withdrawSomeCollateral() finishes

// consider payback() and close()
