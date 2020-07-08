/* global harden */

import { assert, details, q } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import makeAmountMath from '@agoric/ertp/src/amountMath';
import { makeZoeHelpers } from '@agoric/zoe/contractSupport';
import { burn } from './burn';

// a Vault is an individual loan, using some collateralType as the
// collateral, and lending Scones to the borrower

export function makeVault(zcf, o, sconeDebt, sconeStuff, autoswap) {
  // 'o' is the Offer that currently holds the borrower's collateral (zoe
  // owns the tokens for the benefit of this Offer)
  const { mint: sconeMint, issuer: sconeIssuer, amountMath: sconeMath } = sconeStuff;
  const { trade, checkHook } = makeZoeHelpers(zcf);

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

    const collateralMath = makeAmountMath(currentCollateral.brand, 'nat');
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
    sconeDebt = sconeMath.subtract(sconeDebt, acceptedScones);
    zcf.complete(offerHandle);

    // todo: have a separate offer just for burning, don't use 'o'. burn
    // offers are short-lived, 'o' is long-lived. 'o' is really
    // collateralHolderOffer

    // burn the scones. first we need zoe to make us a payment
    await burn(trade, o, { Scones: sconeIssuer }, { Scones: acceptedScones });
    // AWAIT

    // note: the only way to delete the Vault completely is close()
    return 'thank you for your payment';
  }

  function makeCloseInvite() {
    const expected = harden({
      give: { Scones: null },
      want: { Collateral: null },
    });
    return zcf.makeInvitation(checkHook(paybackHook, expected));
  }


  async function closeHook(offerHandle) {
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
    assert(sconeMath.isGTE(sconeDebt, sconesReturned));
    // but if you offer too much, we won't take more than you owe
    const acceptedScones = sconeMath.make(Math.min(sconesReturned.extent,
                                                   sconeDebt.extent));

    const { Collateral: currentCollateral } = zcf.getCurrentAllocation(o);

    trade(
      {
        offerHandle: o,
        gains: { Scones: acceptedScones }, // return any overpayment
      },
      { offerHandle,
        gains: { Collateral: currentCollateral },
      },
    );
    sconeDebt = sconeMath.getEmpty();
    zcf.complete(offerHandle);

    // burn the scones. first we need zoe to make us a payment
    await burn(trade, o, { Scones: sconeIssuer }, { Scones: acceptedScones });
    // AWAIT

    // todo: close the vault
    // zcf.complete(o)

    return 'your loan is closed, thank you for your business';
  }

  function makePaybackInvite() {
    const expected = harden({
      give: { Scones: null },
      want: { Collateral: null },
    });
    return zcf.makeInvitation(checkHook(paybackHook, expected));
  }


  // payback could be split into:
  // * returnScones: reduces sconeDebt
  // * withdrawSomeCollateral: do margin check, remove collateral
  // * close: do margin check, remove all collateral, close Vault
  //
  // the downside is that a buggy vault contract could accept returnScones()
  // but break before withdrawSomeCollateral() finishes

  // consider payback() and close()
}
