// I run in a vat

import produceIssuer from '@agoric/ertp';
import { makeZoeHelpers } from '@agoric/zoe/src/contractSupport';
import { makeVault } from '../src/vault';
import { makeEmptyOfferWithResult } from '../src/make-empty';

export async function makeContract(zcf) {
  console.log(`makeContract invoked`);

  const { escrowAndAllocateTo } = makeZoeHelpers(zcf);
  const collateralStuff = produceIssuer('collateral');
  const { mint: collateralMint, amountMath: collateralMath } = collateralStuff;

  const sconeStuff = produceIssuer('scone');
  const { mint: sconeMint, issuer: sconeIssuer, amountMath: sconeMath } = sconeStuff;
  const sconeDebt = sconeMath.make(10);
  await zcf.addNewIssuer(sconeIssuer, 'Scones');
  await zcf.addNewIssuer(collateralStuff.issuer, 'Collateral'); // todo: CollateralETH, etc

  async function makeHook(offerHandle) {
    console.log(`makeHook invoked`, offerHandle);
    //    const collateralHoldingOffer = (await makeEmptyOfferWithResult(zcf)).offerHandle;
    const x = await makeEmptyOfferWithResult(zcf);
    const collateralHoldingOffer = await x.offerHandle;
    console.log(`-- collateralHoldingOffer is`, collateralHoldingOffer);
    const initialCollateralAmount = collateralMath.make(5);
    await escrowAndAllocateTo({
      amount: initialCollateralAmount,
      payment: collateralMint.mintPayment(initialCollateralAmount),
      keyword: 'Collateral',
      recipientHandle: collateralHoldingOffer,
    });

    const autoswap = {
      getCurrentPrice() { return sconeMath.make(4); },
    };
    const vault = makeVault(zcf, collateralHoldingOffer, sconeDebt, sconeStuff, autoswap);

    zcf.complete([offerHandle]);

    return {
      vault,
      sconeStuff,
      collateralStuff,
      go() { console.log('go'); },
      add() { vault.makeAddCollateralInvite(); },
    };
  }

  console.log(`makeContract returning`);
  return zcf.makeInvitation(makeHook, 'foo');
}

