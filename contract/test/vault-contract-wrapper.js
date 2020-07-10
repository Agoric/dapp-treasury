// I run in a vat

import { assert, details, q } from '@agoric/assert';
import produceIssuer from '@agoric/ertp';
import { makeZoeHelpers } from '@agoric/zoe/src/contractSupport';
import { makeVault } from '../src/vault';
import { makeEmptyOfferWithResult as makeEmptyOfferWithResult } from '../src/make-empty';

export async function makeContract(zcf) {
  console.log(`makeContract invoked`);

  const { escrowAndAllocateTo } = makeZoeHelpers(zcf);
  const collateralKit = produceIssuer('collateral');
  const { mint: collateralMint, amountMath: collateralMath, brand: collateralBrand } = collateralKit;

  const sconeKit = produceIssuer('scone');
  const { mint: sconeMint, issuer: sconeIssuer, amountMath: sconeMath, brand: sconeBrand } = sconeKit;
  const sconeDebt = sconeMath.make(10);
  await zcf.addNewIssuer(sconeIssuer, 'Scones');
  await zcf.addNewIssuer(collateralKit.issuer, 'Collateral'); // todo: CollateralETH, etc

  async function makeHook(offerHandle) {
    console.log(`makeHook invoked`, offerHandle);
    //    const collateralHoldingOffer = (await makeEmptyOfferWithResult(zcf)).offerHandle;
    const collateralResult = await makeEmptyOfferWithResult(zcf);
    const collateralHoldingOffer = await collateralResult.offerHandle;
    console.log(`-- collateralHoldingOffer is`, collateralHoldingOffer);
    const initialCollateralAmount = collateralMath.make(5);
    await escrowAndAllocateTo({
      amount: initialCollateralAmount,
      payment: collateralMint.mintPayment(initialCollateralAmount),
      keyword: 'Collateral',
      recipientHandle: collateralHoldingOffer,
    });

    const autoswap = {
      getCurrentPrice(amountIn, brandOut) {
        assert.equal(brandOut, sconeBrand);
        return sconeMath.make(4 * amountIn.extent); 
      },
    };
    const manager = {
      getLiquidationMargin() { return 1.2; },
      getInitialMargin() { return 1.5; },
      collateralMath,
      collateralBrand,
    };
    const {
      vault,
      liquidate,
      checkMargin,
    } = makeVault(zcf, manager, collateralHoldingOffer, sconeDebt, sconeKit, autoswap);

    zcf.complete([offerHandle]);

    return {
      vault,
      liquidationPayout: collateralResult.payout,
      sconeKit,
      collateralKit,
      liquidate,
      checkMargin,
      go() { console.log('go'); },
      add() { vault.makeAddCollateralInvite(); },
    };
  }

  console.log(`makeContract returning`);
  return zcf.makeInvitation(makeHook, 'foo');
}

