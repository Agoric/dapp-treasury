import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeFakePriceAuthority } from '@agoric/zoe/tools/fakePriceAuthority';
import { makeIssuerKit, makeLocalAmountMath, MathKind } from '@agoric/ertp';
import { allComparable } from '@agoric/same-structure';

export async function start(zcf) {
  const { sconesIssuer, issuerToTrades, timer } = zcf.getTerms();
  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;
  const sconesMath = await makeLocalAmountMath(sconesIssuer);
  const sconesBrand = sconesMath.getBrand();

  // start with issuerToTrades, which has { issuer, fTGC, fTGO }, map to a list
  // with promises for localAmountMaths and brand instead of the issuer. Use
  // allComparable() to resolve the promises, then map to a list with
  // priceAuthorities and brands.

  const addedMathPromises = issuerToTrades.map(
    ({ issuer, fakeTradesGivenCentral, fakeTradesGivenOther }) => {
      return harden({
        brand: E(issuer).getBrand(),
        amountMath: makeLocalAmountMath(issuer),
        fakeTradesGivenCentral,
        fakeTradesGivenOther,
      });
    },
  );

  const addedAmountMaths = await allComparable(harden(addedMathPromises));

  const priceAuthorities = [];
  addedAmountMaths.forEach(
    ({ brand, amountMath, fakeTradesGivenCentral, fakeTradesGivenOther }) => {
      const sconesInPriceAuthority = makeFakePriceAuthority({
        mathIn: sconesMath,
        mathOut: amountMath,
        tradeList: fakeTradesGivenCentral,
        timer,
        quoteMint,
      });
      priceAuthorities.push({
        pa: sconesInPriceAuthority,
        brandIn: sconesBrand,
        brandOut: brand,
      });

      const sconesOutPriceAuthority = makeFakePriceAuthority({
        mathIn: amountMath,
        mathOut: sconesMath,
        tradeList: fakeTradesGivenOther,
        timer,
        quoteMint,
      });
      priceAuthorities.push({
        pa: sconesOutPriceAuthority,
        brandIn: brand,
        brandOut: sconesBrand,
      });
    },
  );

  const creatorFacet = Far('PriceAuthorities', {
    getPriceAuthorities() {
      return priceAuthorities;
    },
  });

  return harden({ creatorFacet });
}
