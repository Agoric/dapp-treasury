// I run in a vat

import produceIssuer from '@agoric/ertp';
import { makeVault } from '../src/vault';
import { makeEmptyOfferWithResult } from '../src/make-empty';

export async function makeContract(zcf) {
  console.log(`makeContract invoked`);

  const collateralStuff = produceIssuer('collateral');

  const sconeStuff = produceIssuer('scone');
  const { mint: sconeMint, issuer: sconeIssuer, amountMath: sconeMath } = sconeStuff;
  const sconeDebt = sconeMath.make(10);
  await zcf.addNewIssuer(sconeIssuer, 'Scones');
  await zcf.addNewIssuer(collateralStuff.issuer, 'Collateral'); // todo: CollateralETH, etc

  async function makeHook(offerHandle) {
    console.log(`makeHook invoked`);
    //    const collateralHoldingOffer = (await makeEmptyOfferWithResult(zcf)).offerHandle;
    const x = await makeEmptyOfferWithResult(zcf);
    const collateralHoldingOffer = await x.offerHandle;
    console.log(`-- collateralHoldingOffer is`, collateralHoldingOffer);
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

