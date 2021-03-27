import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeFakePriceAuthority } from '@agoric/zoe/tools/fakePriceAuthority';
import { makeIssuerKit, MathKind } from '@agoric/ertp';
import { allComparable } from '@agoric/same-structure';

export async function start(zcf) {
  const { issuerToTrades, timer, sconesBrand } = zcf.getTerms();
  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  // start with issuerToTrades, which has { issuer, fTGC, fTGO }, map to a list
  // with promise for brand instead of the issuer. Use allComparable() to
  // resolve the promises, then map to a list with priceAuthorities and brands.

  const addedBrandPromises = issuerToTrades.map(
    ({ issuer, fakeTradesGivenCentral, fakeTradesGivenOther }) => {
      return harden({
        brand: E(issuer).getBrand(),
        fakeTradesGivenCentral,
        fakeTradesGivenOther,
      });
    },
  );

  const addedBrands = await allComparable(harden(addedBrandPromises));

  const priceAuthorities = [];
  addedBrands.forEach(
    ({ brand, fakeTradesGivenCentral, fakeTradesGivenOther }) => {
      const sconesInPriceAuthority = makeFakePriceAuthority({
        actualBrandIn: sconesBrand,
        actualBrandOut: brand,
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
        actualBrandIn: brand,
        actualBrandOut: sconesBrand,
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
