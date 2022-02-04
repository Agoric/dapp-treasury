// @ts-check

import { E } from '@endo/eventual-send';
import { makeRatio } from '@agoric/zoe/src/contractSupport';
import { assert } from '@agoric/assert';

/**
 * @param {[string, { brand: Brand, issuer: Issuer }][]} issuers
 * @returns { Promise<{ terms: CollateralInfo, brandInfo: BrandInfo }> }
 */
export const getRunLoCTerms = async issuers => {
  const [_1, { brand: runBrand }] =
    issuers.find(([_2, { brand }]) => `${brand}`.match(/\bRUN\b/)) ||
    assert.fail();
  const [_4, { brand: bldBrand, issuer: bldIssuer }] =
    issuers.find(([_3, { brand }]) => `${brand}`.match(/\bBLD\b/)) ||
    assert.fail();

  const { assetKind, decimalPlaces } = await E(bldBrand).getDisplayInfo();
  const brandInfo = {
    brand: bldBrand,
    issuer: bldIssuer,
    assetKind,
    decimalPlaces,
    petname: 'BLD',
  };

  const terms = {
    brand: bldBrand,
    initialMargin: makeRatio(750n, bldBrand),
    liquidationMargin: makeRatio(0n, bldBrand),
    marketPrice: makeRatio(123n, runBrand, 100n, bldBrand),
    stabilityFee: makeRatio(0n, runBrand),
    petname: 'BLD',
    interestRate: makeRatio(0n, bldBrand),
  };
  return { terms, brandInfo };
};
