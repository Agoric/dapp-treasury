import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeFakePriceAuthority } from '@agoric/zoe/tools/fakePriceAuthority';
import { makeIssuerKit, MathKind } from '@agoric/ertp';
import { allComparable } from '@agoric/same-structure';

const QUOTE_INTERVAL = 30;

export async function start(zcf) {
  const { issuerToTrades, timer, runBrand } = zcf.getTerms();
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
      const runInPriceAuthority = makeFakePriceAuthority({
        actualBrandIn: runBrand,
        actualBrandOut: brand,
        tradeList: fakeTradesGivenCentral,
        timer,
        quoteMint,
        quoteInterval: QUOTE_INTERVAL,
      });
      priceAuthorities.push({
        pa: runInPriceAuthority,
        brandIn: runBrand,
        brandOut: brand,
      });

      const runOutPriceAuthority = makeFakePriceAuthority({
        actualBrandIn: brand,
        actualBrandOut: runBrand,
        tradeList: fakeTradesGivenOther,
        timer,
        quoteMint,
      });
      priceAuthorities.push({
        pa: runOutPriceAuthority,
        brandIn: brand,
        brandOut: runBrand,
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
