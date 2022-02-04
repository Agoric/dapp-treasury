// @ts-check
/// <reference types="ses"/>

import { E } from '@endo/eventual-send';

import { mergeBrandToInfo } from '../store';

// Note: brandToInfo may be outdated by the time we want to save the
// info for a particular brand. Therefore, we must only insert
// information about the brand and not overwrite brandToInfo entirely.
// brandToInfo should only be used here for saving roundtrips by not
// re-fetching data that already exists. Since we do not delete brands
// or change the assetKind or decimalPlaces for brands, this is mostly safe.
// At worst, a petname will be overwritten for a few seconds, then
// replaced by the correct petname from the user's wallet.

/**
 *
 * @param {Object} param0
 * @param {TreasuryDispatch} param0.dispatch
 * @param {Terms} param0.terms
 * @param {Array<[Brand, BrandInfo]>} param0.brandToInfo
 */
export const storeAllBrandsFromTerms = async ({
  dispatch,
  terms,
  brandToInfo,
}) => {
  const brandToInfoMap = new Map(brandToInfo);
  const displayInfoPs = [];
  const brands = /** @type { Brand[] } */ ([]);
  const issuers = [];
  const keywords = [];

  Object.entries(terms.brands).forEach(([keyword, brand]) => {
    // If we have already stored the data, just return
    if (brandToInfoMap.has(brand)) {
      return;
    }

    const issuer = terms.issuers[keyword];
    const displayInfoP = E(brand).getDisplayInfo();

    issuers.push(issuer);
    brands.push(brand);
    displayInfoPs.push(displayInfoP);
    keywords.push(keyword);
  });

  const displayInfos = await Promise.all(displayInfoPs);

  const newBrandToInfo = brands.map((brand, i) => {
    const decimalPlaces = displayInfos[i] && displayInfos[i].decimalPlaces;
    /** @type { [Brand, BrandInfo]} */
    const entry = [
      brand,
      {
        assetKind: displayInfos[i].assetKind,
        decimalPlaces,
        issuer: issuers[i],
        petname: keywords[i],
        brand,
      },
    ];
    return entry;
  });
  dispatch(mergeBrandToInfo(newBrandToInfo));
};

/**
 *
 * @param {Object} param0
 * @param {TreasuryDispatch} param0.dispatch
 * @param {Array<[Brand, BrandInfo]>} param0.brandToInfo
 * @param {Issuer} param0.issuer
 * @param {Brand} param0.brand
 * @param {string} param0.petname
 */
export const storeBrand = async ({
  dispatch,
  brandToInfo,
  issuer,
  brand,
  petname,
}) => {
  assert(brandToInfo);
  const brandToInfoMap = new Map(brandToInfo);
  const info = brandToInfoMap.get(brand);

  // The info record already exists, so update the petname and return
  if (info !== undefined) {
    const newInfo = {
      ...info,
      petname,
    };

    /** @type { [Brand, BrandInfo][]} */
    const newBrandToInfo = [[brand, newInfo]];
    dispatch(mergeBrandToInfo(newBrandToInfo));
    return newInfo;
  }

  // The info record does not exist, so we need to gather the information
  const displayInfo = await E(brand).getDisplayInfo();
  const decimalPlaces = displayInfo && displayInfo.decimalPlaces;

  const newInfo = {
    petname,
    issuer,
    brand,
    assetKind: displayInfo.assetKind,
    decimalPlaces,
  };

  /** @type { [Brand, BrandInfo][]} */
  const newBrandToInfo = [[brand, newInfo]];
  dispatch(mergeBrandToInfo(newBrandToInfo));
  return newInfo;
};

export const updateBrandPetnames = ({
  dispatch,
  brandToInfo,
  issuersFromNotifier,
}) => {
  console.log('BRANDS', issuersFromNotifier);
  const resultPs = issuersFromNotifier.map(([petname, { brand, issuer }]) => {
    return storeBrand({ dispatch, brandToInfo, issuer, brand, petname });
  });

  return Promise.all(resultPs);
};
