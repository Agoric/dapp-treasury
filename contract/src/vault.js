// @ts-check
import '@agoric/zoe/exported';

import { assert, details } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import {
  trade,
  assertProposalShape,
  offerTo,
  divideBy,
  multiplyBy,
  getAmountOut,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport';
import { makeNotifierKit } from '@agoric/notifier';

import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio';
import { burn } from './burn';
import { makeTracer } from './makeTracer';

const AutoswapInsufficientMsg = / is insufficient to buy amountOut /;

// a Vault is an individual loan, using some collateralType as the
// collateral, and lending Scones to the borrower

/*
 * TODO(hibbert) add invitations for the following:
 * Borrow
 *   give: { Collateral }, want: { Scones },
 *
 * repay and borrowMore might have Collateral as either give or want
 * repayDebt
 *   give: { Scones }
 * borrowMore
 *   want: { Scones }
 *
 * recapitalize and withdrawCollateral might also have Scones as give or want
 * recapitalize
 *   give: { Collateral }
 * withdrawCollateral
 *   want: { Collateral }
 *
 * close supports aptionally giving Scones
 * close
 *   want: { Collateral }
 *   want: { Collateral } give: Scones
 */

/** @type {MakeVaultKit} */
export function makeVaultKit(
  zcf,
  manager,
  sconeMint,
  autoswap,
  priceAuthority,
  rewardPoolStaging,
) {
  const trace = makeTracer('VV');
  const { updater: uiUpdater, notifier } = makeNotifierKit();

  let active = true; // liquidation halts all user actions
  const collateralMath = manager.collateralMath;
  const collateralBrand = manager.collateralBrand;

  // this seat will hold the collateral until the loan is retired. The
  // payout from it will be handed to the user: if the vault dies early
  // (because the StableCoinMachine vat died), they'll get all their
  // collateral back. If that happens, the isuser for the Scones will be dead,
  // so their loan will be worthless.
  const { zcfSeat: collateralSeat, userSeat } = zcf.makeEmptySeatKit();

  const {
    amountMath: sconeMath,
    brand: sconeBrand,
  } = sconeMint.getIssuerRecord();
  let sconeDebt = sconeMath.getEmpty();

  function getCollateralAmount() {
    // todo?: assert(active, 'vault has been liquidated');
    return collateralSeat.hasExited()
      ? collateralMath.getEmpty()
      : collateralSeat.getAmountAllocated('Collateral', collateralBrand);
  }

  async function getCollateralizationRatio() {
    if (collateralMath.isEmpty(getCollateralAmount())) {
      return Promise.resolve(makeRatio(0, sconeBrand));
    }
    const quoteAmount = await E(priceAuthority).quoteGiven(
      getCollateralAmount(),
      sconeBrand,
    );
    const collateralValueInScones = getAmountOut(quoteAmount);
    return makeRatioFromAmounts(collateralValueInScones, sconeDebt);
  }

  // call this whenever anything changes!
  async function updateUiState() {
    // TODO(123): track down all calls and ensure that they all update a
    // lastKnownCollateralizationRatio (since they all know) so we don't have to
    // await quoteGiven() here
    // [https://github.com/Agoric/dapp-token-economy/issues/123]
    const collateralizationRatio = await getCollateralizationRatio();
    /** @type {UIState} */
    const uiState = harden({
      interestRate: manager.getInterestRate(),
      liquidationRatio: manager.getLiquidationMargin(),
      locked: getCollateralAmount(),
      debt: sconeDebt,
      collateralizationRatio,
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

    const margin = manager.getLiquidationMargin();
    // that collateral will support a loan of at most this many scones
    const maxScones = multiplyBy(salePrice, margin);
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
    sconeMint.burnLosses({ Scones: sconesToBurn }, collateralSeat);
    sconeDebt = sconeMath.subtract(sconeDebt, sconesToBurn);
    trace('burned', sconesToBurn);

    // any remaining scones plus anything else leftover from the sale are
    // refunded. (perhaps some collateral, who knows maybe autoswap threw in a
    // free toaster)

    collateralSeat.exit();
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
  async function scheduleLiquidation() {
    const liquidationMargin = manager.getLiquidationMargin();
    // how much collateral valuation is required to support the current debt
    const collateralSconesValueRequired = multiplyBy(
      sconeDebt,
      liquidationMargin,
    );
    const collateralAmountWhenScheduled = getCollateralAmount();
    const quote = await E(priceAuthority).quoteWhenLT(
      collateralAmountWhenScheduled,
      collateralSconesValueRequired,
    );
    // priceQuote is { amountIn, amountOut, timer, timestamp }
    const { amountIn, amountOut } = quote.quoteAmount.value[0];
    // If this quote doesn't correspond to the current balance, ignore it.
    if (collateralMath.isEqual(collateralAmountWhenScheduled, amountIn)) {
      checkMargin(amountOut);
    }
  }

  async function openLoan(seat) {
    assert(
      sconeMath.isEmpty(sconeDebt),
      details`vault must be empty initially`,
    );
    // get the payout to provide access to the collateral if the
    // contract abandons
    const {
      give: { Collateral: collateralAmount },
      want: { Scones: sconesWanted },
    } = seat.getProposal();

    const collateralPayoutP = E(userSeat).getPayouts();

    const salePrice = await E(autoswap).getInputPrice(
      collateralAmount,
      sconeBrand,
    );

    const maxScones = divideBy(salePrice, manager.getInitialMargin());
    assert(
      sconeMath.isGTE(maxScones, sconesWanted),
      details`Requested ${sconesWanted} exceeds max ${maxScones}`,
    );

    // todo trigger process() check right away, in case the price dropped while we ran

    const fee = multiplyBy(sconesWanted, manager.getLoanFee());
    if (sconeMath.isEmpty(fee)) {
      throw seat.exit('loan requested is too small; cannot accrue interest');
    }

    sconeDebt = sconeMath.add(sconesWanted, fee);
    await sconeMint.mintGains({ Scones: sconeDebt }, collateralSeat);
    const priorCollateral = collateralSeat.getAmountAllocated(
      'Collateral',
      collateralBrand,
    );

    const collateralSeatStaging = collateralSeat.stage({
      Collateral: collateralMath.add(priorCollateral, collateralAmount),
      Scones: sconeMath.getEmpty(),
    });
    const loanSeatStaging = seat.stage({
      Scones: sconesWanted,
      Collateral: collateralMath.getEmpty(),
    });
    zcf.reallocate(
      collateralSeatStaging,
      loanSeatStaging,
      rewardPoolStaging(fee, collateralSeat),
    );

    scheduleLiquidation();
    updateUiState();

    return { notifier, collateralPayoutP };
  }

  // todo: add liquidateSome(collateralAmount): sells some collateral, reduces some debt

  function getDebtAmount() {
    // todo?: assert(active, 'vault has been liquidated');
    return sconeDebt;
  }

  /** @type {Vault} */
  const vault = harden({
    makeAddCollateralInvitation,
    makePaybackInvitation,
    makeCloseInvitation,
    // repay, borrowMore, recapitalize, withdrawCollateral, close

    // for status/debugging
    getCollateralAmount,
    getDebtAmount,
    // getFeeAmount,
  });

  return harden({
    vault,
    liquidate,
    checkMargin,
    openLoan,
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
