// @ts-check

import { E } from '@agoric/eventual-send';

import { setBrandToInfo, setInfoForBrand } from '../store';
import { getInfoForBrand } from '../components/helpers';

export const initializeBrandToInfo = async ({
  dispatch,
  issuerKeywordRecord,
  brandKeywordRecord,
}) => {
  const mathKindPs = [];
  const displayInfoPs = [];
  const brands = [];
  const issuers = [];
  const keywords = [];

  Object.entries(issuerKeywordRecord).forEach(([keyword, issuer]) => {
    const mathKindP = E(issuer).getAmountMathKind();
    const brand = brandKeywordRecord[keyword];
    const displayInfoP = E(brand).getDisplayInfo();

    issuers.push(issuers);
    brands.push(brand);
    mathKindPs.push(mathKindP);
    displayInfoPs.push(displayInfoP);
    keywords.push(keyword);
  });
  const [mathKinds, displayInfos] = await Promise.all([
    Promise.all(mathKindPs),
    Promise.all(displayInfoPs),
  ]);
  const brandToInfo = brands.map((brand, i) => {
    const decimalPlaces = displayInfos[i] && displayInfos[i].decimalPlaces;
    return [
      brand,
      {
        mathKind: mathKinds[i],
        decimalPlaces,
        issuer: issuers[i],
        petname: keywords[i],
      },
    ];
  });
  dispatch(setBrandToInfo(brandToInfo));
};

const addIssuerAndBrand = async ({
  dispatch,
  brandToInfo,
  issuer,
  brand,
  petname,
}) => {
  // O(n)
  const info = getInfoForBrand(brandToInfo, brand);

  // The info record already exists, so update the petname and return
  if (info !== undefined) {
    const newInfo = {
      ...info,
      petname,
    };

    // O(n)
    dispatch(setInfoForBrand({ brand, brandInfo: newInfo }));
    return newInfo;
  }

  const mathKindP = E(issuer).getAmountMathKind();
  const displayInfoP = E(brand).getDisplayInfo();

  const [mathKind, displayInfo] = await Promise.all([mathKindP, displayInfoP]);

  const decimalPlaces = displayInfo && displayInfo.decimalPlaces;

  const newInfo = {
    petname,
    issuer,
    mathKind,
    decimalPlaces,
  };

  // O(n)
  dispatch(setInfoForBrand({ brand, brandInfo: newInfo }));
  return newInfo;
};

export const updateBrandPetnames = ({
  dispatch,
  brandToInfo,
  issuersFromNotifier,
}) => {
  const resultPs = issuersFromNotifier.map(([petname, { brand, issuer }]) => {
    return addIssuerAndBrand({ dispatch, brandToInfo, issuer, brand, petname });
  });

  return Promise.all(resultPs);
};
