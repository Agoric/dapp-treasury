// @ts-check
import '@agoric/zoe/exported';

import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import {
  trade,
  assertProposalShape,
  natSafeMath,
} from '@agoric/zoe/src/contractSupport';
import { offerTo } from '@agoric/zoe/src/contractSupport/zoeHelpers';

import { burn } from './burn';
import { makeTracer } from './makeTracer';

const { floorDivide } = natSafeMath;
const AutoswapInsufficientMsg = / is insufficient to buy amountOut /;

// a Vault is an individual loan, using some collateralType as the
// collateral, and lending Scones to the borrower

/** @type {MakeVaultKit} */
export function makeVault(
  zcf,
  manager,
  collateralSeat,
  sconeDebt,
  sconeMint,
  autoswap,
  priceAuthority,
  uiUpdater,
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

  function getCollateralAmount() {
    // todo?: assert(active, 'vault has been liquidated');
    return collateralSeat.hasExited()
      ? collateralMath.getEmpty()
      : collateralSeat.getAmountAllocated('Collateral', collateralBrand);
  }

  function getCollateralizationRatio() {
    if (collateralMath.isEmpty(getCollateralAmount())) {
      return Promise.resolve(0);
    }
    return E(priceAuthority)
      .quoteGiven(getCollateralAmount(), sconeBrand)
      .then(({ quoteAmount }) => {
        const collateralValue = quoteAmount.value[0].amountOut.value;
        const numerator = natSafeMath.multiply(collateralValue, 100);
        const denominator = sconeDebt.value;
        return natSafeMath.floorDivide(numerator, denominator);
      });
  }

  // call this whenever anything changes!
  async function updateUiState() {
    /** @type {UIState} */
    const uiState = harden({
      interestRate: 0,
      // TODO(hibbert): change liquidationMargin to be an int.
      liquidationRatio: manager.getLiquidationMargin() * 100,
      locked: getCollateralAmount(),
      debt: sconeDebt,
      collateralizationRatio: await getCollateralizationRatio(),
      liquidated: !active,
    });

    if (active) {
      uiUpdater.updateState(uiState);
    } else {
      uiUpdater.finish(uiState);
    }
  }

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
    updateUiState();
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

    offerHandle.exit();
    updateUiState();

    return 'thank you for your business';
  }
  */

  /** @param {ZCFSeat} seat */
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
    const precheckCollateral = getCollateralAmount();
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

    // IF THE COLLATERAL HAS CHANGED, RESTART
    if (!collateralMath.isGTE(precheckCollateral, getCollateralAmount())) {
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

    updateUiState();
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

    trade(
      zcf,
      {
        seat: collateralSeat,
        gains: { Scones: acceptedScones }, // return any overpayment
      },
      {
        seat,
        gains: { Collateral: getCollateralAmount() },
      },
    );
    sconeDebt = sconeMath.getEmpty();
    seat.exit();

    // burn the scones. first we need zoe to make us a payment
    // TODO
    await burn(zcf, collateralSeat, { Scones: acceptedScones });

    // todo: close the vault
    active = false;
    updateUiState();
    // collateralHolderOffer.exit()

    return 'your loan is closed, thank you for your business';
  }

  function makeCloseInvitation() {
    assert(active, 'vault has been liquidated');
    return zcf.makeInvitation(closeHook, 'pay off entire loan and close Vault');
  }

  async function liquidate() {
    const collateralBefore = getCollateralAmount();
    const liqProposal = harden({
      give: { In: collateralBefore },
      want: { Out: sconeDebt },
    });
    const swapInvitation = E(autoswap).makeSwapOutInvitation();
    const keywordMapping = harden({
      Collateral: 'In',
      Scones: 'Out',
    });
    const { deposited, userSeatPromise: liqSeat } = await offerTo(
      zcf,
      swapInvitation,
      keywordMapping,
      liqProposal,
      collateralSeat,
    );

    // if swapOut failed for insufficient funds, we'll sell it all
    async function onSwapOutFail(error) {
      assert(
        error.message.match(AutoswapInsufficientMsg),
        `unable to liquidate: ${error}`,
      );
      const sellAllInvitation = E(autoswap).makeSwapInInvitation();
      const sellAllProposal = harden({
        give: { In: collateralBefore },
        want: { Out: sconeMath.make(0) },
      });

      const {
        deposited: sellAllDeposited,
        userSeatPromise: sellAllSeat,
      } = await offerTo(
        zcf,
        sellAllInvitation,
        keywordMapping,
        sellAllProposal,
        collateralSeat,
      );
      // await sellAllDeposited, but don't need the value
      await Promise.all([
        E(sellAllSeat).getOfferResult(),
        sellAllDeposited,
      ]).catch(sellAllError => {
        throw Error(`Unable to liquidate ${sellAllError}`);
      });
    }

    // await deposited, but we don't need the value. We'll need it to have
    // resolved in both branches, so can't put it in Promise.all.
    await deposited;
    await E(liqSeat)
      .getOfferResult()
      .catch(onSwapOutFail);

    // Now we need to know how much was sold so we can payoff the debt
    const sconeProceedsAmount = collateralSeat.getAmountAllocated(
      'Scones',
      sconeBrand,
    );
    trace('scones', sconeProceedsAmount);

    // we now claim enough from sconeProceeds to cover the debt (if there's
    // enough). They get the rest back, as well as any remaining scones.

    const isUnderwater = !sconeMath.isGTE(sconeProceedsAmount, sconeDebt);
    const sconesToBurn = isUnderwater ? sconeProceedsAmount : sconeDebt;
    trace('LIQ ', sconeDebt, sconeProceedsAmount, sconesToBurn);
    sconeMint.burnLosses({ Scones: sconesToBurn }, collateralSeat);
    sconeDebt = sconeMath.subtract(sconeDebt, sconesToBurn);
    trace('burned', sconesToBurn);

    // any remaining scones plus anything else leftover from the sale are
    // refunded. (perhaps some collateral, who knows maybe autoswap threw in a
    // free toaster)

    collateralSeat.exit();
    trace('refunded');
    active = false;
    updateUiState();

    if (isUnderwater) {
      trace(`underwater by`, sconeDebt);
      // todo: fall back to next recovery layer. The vaultManager holds
      // liquidity tokens, it will sell some to give us the needed scones.
      // moreSconesToBurn = vaultManager.helpLiquidateFallback(underwaterBy);
    }
  }

  // If the collateral no longer has sufficient value to meet the margin
  // requirement, this will sell off all the collateral, deduct (and burn)
  // the scones they still owe, and return any remaining scones. If the sale
  // didn't yield enough scones to cover their debt, liquidate() will appeal
  // to the next layer (the vaultManager).
  function checkMargin(saleProceeds) {
    if (!active) {
      return;
    }

    if (!sconeMath.isGTE(saleProceeds, sconeDebt)) {
      liquidate();
    }
  }

  // We're currently only calling this once, but as we add or remove collateral,
  // and as the debt accrues, it should be called multiple times. When we do,
  // previous requests for quotes will be able to fire, but should be ignored.
  function scheduleLiquidation() {
    const liquidationMargin = manager.getLiquidationMargin();
    // compute how much debt is supported by the current collateral
    const debtAllowed = collateralMath.make(
      floorDivide(getCollateralAmount().value, liquidationMargin),
    );
    E(priceAuthority)
      .quoteWhenLT(debtAllowed, sconeDebt)
      // priceQuote is { amountIn, amountOut, timer, timestamp }
      .then(quote => {
        const { amountIn, amountOut } = quote.quoteAmount.value[0];
        // If this quote doesn't correspond to the current balance, ignore it.
        if (collateralMath.isEqual(debtAllowed, amountIn)) {
          checkMargin(amountOut);
        }
      });
  }
  scheduleLiquidation();
  updateUiState();

  // todo: add liquidateSome(collateralAmount): sells some collateral, reduces some debt

  function getDebtAmount() {
    // todo?: assert(active, 'vault has been liquidated');
    return sconeDebt;
  }

  // how do I get a floating point number ration here?
  // function getCollateralizationPercent() {
  //   return sconeDebt.value / getCollateralAmount().value;
  // }

  /** @type {Vault} */
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
