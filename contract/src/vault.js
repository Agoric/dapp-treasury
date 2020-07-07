/* global harden */

import { assert, details, q } from '@agoric/assert';
import { E } from '@agoric/eventual-send';


// a Vault is an individual loan, using some collateralType as the
// collateral, and lending Scones to the borrower
import { makeZoeHelpers } from '@agoric/zoe/contractSupport';

function makeEmptyOfferWithResult(zoe, zcf) {
  const invite = zcf.makeInvitation(_ => undefined, 'empty offer');
  return E(zoe).offer(invite);  // Promise<OfferResultRecord>, 
}

// burn(zcf, o, { Scones: sconeIssuer }, { Scones: sconeMath.make(4) })
async function burn(zcf, fromOffer, issuers, what) {
  for (const name of what.keys()) {
    assert(issuers[what], details`missing issuers[${what}]`);
  }

  const { trade, makeEmptyOffer } = makeZoeHelpers(zcf);
  const resultRecord = await makeEmptyOfferWithResult();
  // AWAIT
  const burnOffer = await resultRecord.offerHandle;
  // AWAIT

  trade(
    { offerHandle: burnOffer, gains: what },
    { offerHandle: fromOffer, gains: {} },
  );
  zcf.complete(burnOffer);
  const payoutRecord = await resultRecord.payout;
  // AWAIT

  // todo: some .map and Promise.all() to appease eslint
  for (const name of what.keys()) {
    await E(issuers[name]).burn(payoutRecord[name], what[name]);
    // AWAIT
  }
}


function makeVault(zcf, o, sconeDebt, sconeMath, sconeIssuer) {
  // 'o' is the Offer that currently holds the borrower's collateral (zoe
  // owns the tokens for the benefit of this Offer)
  const {
    trade,
    rejectOffer,
    makeEmptyOffer,
    checkHook,
    assertKeywords,
    escrowAndAllocateTo,
    assertNatMathHelpers,
  } = makeZoeHelpers(zcf);

  function addCollateralHook(offerHandle) {
    const {
      proposal: {
        give: { Collateral: collateralAmount },
      },
    } = zcf.getOffer(offerHandle);
    
    trade(
      {
        offerHandle: o,
        gains: { Collateral: collateralAmount },
      },
      { offerHandle, gains: {} },
    );
    zcf.complete(offerHandle);
    return 'a warm fuzzy feeling that you are further away from default than ever before';
  }

  function makeAddCollateralInvite() {
    const expected = harden({
      give: { Collateral: null },
      want: { },
    });
    return zcf.makeInvitation(checkHook(addCollateralHook, expected));
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

    const { Collateral: haveCollateral } = zcf.getCurrentAllocation(o);

    assert(sconeMath.isGTE(sconesReturned, sconeDebt));

    trade(
      {
        offerHandle: o,
        gains: { Scones: sconeDebt }, // return any overpayment
      },
      { offerHandle,
        gains: { Collateral: haveCollateral },
      },
    );
    sconeDebt = sconeMath.getEmpty();
    // burn the scones. first we need zoe to make us a payment
    await burn(trade, o, { Scones: sconeIssuer }, { Scones: sconeDebt });
    // AWAIT

    zcf.complete(offerHandle);

    return 'thank you for your business';
  }
  */

  async function paybackHook(offerHandle) {
    const {
      proposal: {
        give: { Scones: sconesReturned },
        want: { Collateral: collateralWanted },
      },
    } = zcf.getOffer(offerHandle);

    const stalePrice = await E(autoswap).getCurrentPrice();
    // AWAIT

    // you might offer too much: we won't take more than you owe
    const acceptedScones = sconeMath.make(Math.min(sconesReturned.extent,
                                                   sconeDebt.extent));
    // if we accept your scones, this is how much you'd still owe
    const remainingDebt = sconeMath.subtract(sconeDebt, acceptedScones);
    const { Collateral: currentCollateral } = zcf.getCurrentAllocation(o);

    // and you'd have this much collateral left:
    const remainingCollateral = collateralMath.subtract(currentCollateral, collateralWanted);

    // that will require at least this much collateral:
    const margin = 1.5;
    const maxScones = sconeMath.make(stalePrice.extent * remainingCollateral.extent / margin);
    assert(sconeMath.isGTE(maxScones, remainingDebt), 'insufficient remaining collateral');

    trade(
      {
        offerHandle: o,
        gains: { Scones: acceptedScones }, // return any overpayment
      },
      { offerHandle,
        gains: { Collateral: collateralWanted },
      },
    );
    sconeDebt = sconeMath.getEmpty();
    // burn the scones. first we need zoe to make us a payment
    await burn(trade, o, { Scones: sconeIssuer }, { Scones: acceptedScones });
    // AWAIT

    zcf.complete(offerHandle);

    // todo: if sconeDebt == 0, close the Vault
    return 'thank you for your business';
  }

  function makePaybackHook() {
    const expected = harden({
      give: { Scones: null },
      want: { Collateral: null },
    });
    return zcf.makeInvitation(checkHook(makePaybackHook, expected));
  }

}
