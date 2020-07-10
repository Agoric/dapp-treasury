/* global harden */

import { assert, details, q } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { makeZoeHelpers } from '@agoric/zoe/src/contractSupport';
import { burn, escrowAllTo } from './burn';
import { makeEmptyOfferWithResult } from './make-empty';

// a Vault is an individual loan, using some collateralType as the
// collateral, and lending Scones to the borrower

let debugInstance = 1;

export function makeVault(zcf, manager, collateralHolderOffer, sconeDebt, sconeKit, autoswap) {

  let debugCount = debugInstance++ * 1000 + 1;
  function debugTick(msg = '') {
    console.log('VV ', debugCount++, msg);
  }

  let active = true; // liquidation halts all user actions
  let accumulatedFee = 0;
  const collateralMath = manager.collateralMath;
  const collateralBrand = manager.collateralBrand;
  const collateralIssuer = zcf.getIssuerForBrand(collateralBrand);

  // 'collateralHolderOffer' is the Offer that currently holds the borrower's
  // collateral (zoe owns the tokens for the benefit of this Offer)
  const { mint: sconeMint, issuer: sconeIssuer, amountMath: sconeMath } = sconeKit;
  const { trade, checkHook, escrowAndAllocateTo } = makeZoeHelpers(zcf);
  const zoe = zcf.getZoeService();

  function addCollateralHook(offerHandle) {
    const {
      proposal: {
        give: { Collateral: collateralAmount },
      },
    } = zcf.getOffer(offerHandle);

    trade(
      {
        offerHandle: collateralHolderOffer,
        gains: { Collateral: collateralAmount },
      },
      { offerHandle, gains: {} },
    );
    zcf.complete([offerHandle]);
    return 'a warm fuzzy feeling that you are further away from default than ever before';
  }

  function makeAddCollateralInvite() {
    assert(active, 'vault has been liquidated');
    const expected = harden({
      give: { Collateral: null },
      want: { },
    });
    return zcf.makeInvitation(checkHook(addCollateralHook, expected), 'add collateral');
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

    trade(
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
    await burn(trade, collateralHolderOffer, { Scones: sconeDebt });
    // AWAIT

    zcf.complete([offerHandle]);

    return 'thank you for your business';
  }
  */

  async function paybackHook(offerHandle) {
    assert(active, 'vault has been liquidated');
    const {
      proposal: {
        give: { Scones: sconesReturned },
        want: { Collateral: collateralWanted },
      },
    } = zcf.getOffer(offerHandle);

    // precheckCollateral MUST NOT be relied on after a turn boundary
    const precheckCollateral = zcf.getCurrentAllocation(collateralHolderOffer).Collateral;
    assert(collateralMath.isGTE(precheckCollateral, collateralWanted), 'want is more collateral than is available');
    const remainingCollateral = collateralMath.subtract(precheckCollateral, collateralWanted);
    const salePrice = await E(autoswap).getCurrentPrice(remainingCollateral, sconeKit.brand);
    // AWAIT

    // IF THE COLLATERAL HAS CHANGED, RESTART
    const currentCollateral = zcf.getCurrentAllocation(collateralHolderOffer).Collateral;
    if (! collateralMath.isGTE(precheckCollateral, currentCollateral)) {
      // collateral has changed. Retry in the new world.
      return paybackHook(offerHandle);
    }

    // you might offer too much: we won't take more than you owe
    const acceptedScones = sconeMath.isGTE(sconesReturned, sconeDebt) ? sconeDebt : sconesReturned;
    // if we accept your scones, this is how much you'd still owe
    const remainingDebt = sconeMath.subtract(sconeDebt, acceptedScones);

    // that will require at least this much collateral:
    const margin = manager.getLiquidationMargin();
    const maxScones = sconeMath.make(Math.ceil(salePrice.extent / margin));
    // TODO is there a better policy than:
    //      don't reject if they are not taking out collateral
    if (!collateralMath.isEmpty(collateralWanted)) {
      assert(sconeMath.isGTE(maxScones, remainingDebt), 'insufficient remaining collateral');
    }

    trade(
      {
        offerHandle: collateralHolderOffer,
        gains: { Scones: acceptedScones }, // return any overpayment
      },
      { offerHandle,
        gains: { Collateral: collateralWanted },
      },
    );
    sconeDebt = sconeMath.subtract(sconeDebt, acceptedScones);
    zcf.complete([offerHandle]);

    // todo: have a separate offer just for burning, don't use
    // 'collateralHolderOffer'. burn offers are short-lived,
    // 'collateralHolderOffer' is long-lived

    // burn the scones. first we need zoe to make us a payment
    await burn(zcf, collateralHolderOffer, { Scones: acceptedScones });
    // AWAIT

    // note: the only way to delete the Vault completely is close()
    return 'thank you for your payment';
  }

  function makePaybackInvite() {
    assert(active, 'vault has been liquidated');
    const expected = harden({
      give: { Scones: null },
      want: { Collateral: null },
    });
    return zcf.makeInvitation(checkHook(paybackHook, expected), 'pay back partially');
  }


  async function closeHook(offerHandle) {
    assert(active, 'vault has been liquidated');
    const {
      proposal: {
        give: { Scones: sconesReturned },
        want: { Collateral: collateralWanted },
      },
    } = zcf.getOffer(offerHandle);

    // you're paying off the debt, you get everything back. If you were
    // underwater, we should have liquidated some collateral earlier: we
    // missed our chance.

    // you must pay off the entire remainder
    assert(sconeMath.isGTE(sconesReturned, sconeDebt));
    // but if you offer too much, we won't take more than you owe
    const acceptedScones = sconeMath.make(Math.min(sconesReturned.extent,
                                                   sconeDebt.extent));

    const { Collateral: currentCollateral } = zcf.getCurrentAllocation(collateralHolderOffer);

    trade(
      {
        offerHandle: collateralHolderOffer,
        gains: { Scones: acceptedScones }, // return any overpayment
      },
      { offerHandle,
        gains: { Collateral: currentCollateral },
      },
    );
    sconeDebt = sconeMath.getEmpty();
    zcf.complete([offerHandle]);

    // burn the scones. first we need zoe to make us a payment
    await burn(trade, collateralHolderOffer, { Scones: acceptedScones });
    // AWAIT
    
    // todo: close the vault
    active = false;
    // zcf.complete([collateralHolderOffer])

    return 'your loan is closed, thank you for your business';
  }

  function makeCloseInvite() {
    assert(active, 'vault has been liquidated');
    const expected = harden({
      give: { Scones: null },
      want: { Collateral: null },
    });
    return zcf.makeInvitation(checkHook(paybackHook, expected), 'pay off entire loan and close Vault');
  }

  async function liquidate() {
    // before anything else, stop any future activity on this vault
    active = false;

    debugTick();
    // First, take all the collateral away from collateralHolderOffer, so we
    // can sell it
    const liqOfferKit = await makeEmptyOfferWithResult(zcf);
    const liqOfferHandle = await liqOfferKit.offerHandle;
    // AWAIT
    const { Collateral: currentCollateral } = zcf.getCurrentAllocation(collateralHolderOffer);
    trade(
      {
        offerHandle: collateralHolderOffer,
        gains: { },
      },
      {
        offerHandle: liqOfferHandle,
        gains: { Collateral:  currentCollateral },
      },
    );
    debugTick();
    zcf.complete([liqOfferHandle]);
    const payout2 = await liqOfferKit.payout;
    const collateralPayment = await payout2.Collateral;
    const collateralPaymentAmount = await collateralIssuer.getAmountOf(collateralPayment);
    // AWAIT
    debugTick('separated collateral');
    console.log("RETRIEVED ", collateralPaymentAmount);
    // Then, sell off all their collateral. We really only need enough to
    // cover 'sconeDebt', but our autoswap API doesn't give us a way to
    // specify just the output amount yet.
    const swapInvite = E(autoswap).makeSwapInvite(); // really inviteP, that's ok
    const saleOffer = harden({
      give: { In: collateralPaymentAmount },
      want: { Out: sconeMath.getEmpty() }, // we'll take anything we can get
    });
    const swapResult = await E(zoe).offer(swapInvite, saleOffer, { In: collateralPayment });
    const salesPayout = await swapResult.payout;
    debugTick('swapping');
    // const { Scones: sconeProceeds, ...otherProceeds } = await salesPayoutP.Scones;
    const sconeProceeds = await salesPayout.Out;
    debugTick('retrieving');
    // we now claim enough from sconeProceeds to cover the debt (if there's
    // enough). They get back the rest, as well as any remaining scones.
    const sconeProceedsAmount = await sconeIssuer.getAmountOf(sconeProceeds);
    debugTick('swapped');

    const isUnderwater = !sconeMath.isGTE(sconeProceedsAmount, sconeDebt);
    const sconesToBurn = isUnderwater ? sconeProceedsAmount : sconeDebt;
    console.log("LIQ ", sconeDebt, sconeProceedsAmount, sconesToBurn);
    sconeDebt = sconeMath.subtract(sconeDebt, sconesToBurn);
    const [sconePaymentToBurn, sconePaymentToRefund] = await E(sconeIssuer).split(sconeProceeds, sconesToBurn);

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

    const sconeRefundAmount = await sconeIssuer.getAmountOf(sconePaymentToRefund);
    const refundAmounts = { Scones: sconeRefundAmount };
    const refunds = { Scones: sconePaymentToRefund };
    await escrowAllTo(zcf, collateralHolderOffer, refundAmounts, refunds);
    debugTick('escrowed refund');

    zcf.complete([collateralHolderOffer]);
    debugTick('complete');

    if (isUnderwater) {
      console.log(`underwater by`, sconeDebt);
      // todo: fall back to next recovery layer. The vaultManager holds
      // liquidity tokens, it will sell some to give us the needed scones.
      // moreSconesToBurn = vaultManager.helpLiquidateFallback(underwaterBy);
    }

    // finally burn
    await E(sconeIssuer).burn(sconePaymentToBurn);
    // await E(sconeIssuer).burn(moreSconesToBurn);
    debugTick('burned');
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
    const { Collateral: currentCollateral } = zcf.getCurrentAllocation(collateralHolderOffer);
    const salePrice = await E(autoswap).getCurrentPrice(currentCollateral, sconeKit.brand);
    // AWAIT
    if (!active) {
      return;
    }

    // compute how much debt is supported by the current collateral at that price
    const liquidationMargin = manager.getLiquidationMargin();
    const maxScones = sconeMath.make(salePrice.extent / liquidationMargin);

    if (!sconeMath.isGTE(maxScones, sconeDebt)) {
      liquidate();
    }

  }

  // todo: add liquidateSome(collateralAmount): sells some collateral, reduces some debt

  function getCollateralAmount() {
    // todo?: assert(active, 'vault has been liquidated');
    return zcf.isOfferActive(collateralHolderOffer) 
          ? zcf.getCurrentAllocation(collateralHolderOffer).Collateral 
          : collateralMath.getEmpty()
  }

  function getDebtAmount() {
    // todo?: assert(active, 'vault has been liquidated');
    return sconeDebt;
  }

  // how do I get a floating point number ration here?
  function getCollateralizationPercent() {
    return sconeDebt.extent / getCollateralAmount().extent;
  }

  const vault = harden({
    makeAddCollateralInvite,
    makePaybackInvite,
    makeCloseInvite,

    // for status/debugging
    getCollateralAmount,
    getDebtAmount,
    //getFeeAmount,
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
