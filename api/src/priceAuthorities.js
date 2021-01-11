import { E } from '@agoric/eventual-send';
import { makeFakePriceAuthority } from '@agoric/zoe/tools/fakePriceAuthority';
import { makeIssuerKit, makeLocalAmountMath, MathKind } from '@agoric/ertp';
import { allComparable } from '@agoric/same-structure';

export default harden(async ({ sconesIssuer, issuerToTrades, timer }) => {
  const sconesMath = await makeLocalAmountMath(sconesIssuer);
  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  // start with issuerToTrades, which has { issuer, fTGC, fTGO }, map to a list
  // with promises for localAmountMaths added. Use allComparable to resolve the
  // promises, then map to a list with priceAuthorities and brands.

  const addedMathPromises = issuerToTrades.map(
    ({ issuer, fakeTradesGivenCentral, fakeTradesGivenOther }) => {
      return harden({
        issuer,
        amountMath: makeLocalAmountMath(issuer),
        fakeTradesGivenCentral,
        fakeTradesGivenOther,
      });
    },
  );

  const addedAmountMaths = await allComparable(harden(addedMathPromises));

  const priceAuthorities = [];
  addedAmountMaths.forEach(
    ({ issuer, amountMath, fakeTradesGivenCentral, fakeTradesGivenOther }) => {
      const sconesInPriceAuthority = makeFakePriceAuthority({
        mathIn: sconesMath,
        mathOut: amountMath,
        tradeList: fakeTradesGivenCentral,
        timer,
        quoteMint,
      });
      priceAuthorities.push({
        priceAuthority: sconesInPriceAuthority,
        brandIn: E(sconesMath).getBrand(),
        brandOut: E(issuer).getBrand(),
      });

      const sconesOutPriceAuthority = makeFakePriceAuthority({
        mathIn: amountMath,
        mathOut: sconesMath,
        tradeList: fakeTradesGivenOther,
        timer,
        quoteMint,
      });
      priceAuthorities.push({
        priceAuthority: sconesOutPriceAuthority,
        brandIn: E(issuer).getBrand(),
        brandOut: E(sconesMath).getBrand(),
      });
    },
  );

  return harden(priceAuthorities);
});
