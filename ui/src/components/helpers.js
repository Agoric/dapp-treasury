// @ts-check
export const getPurseMathKind = purse =>
  (purse && purse.displayInfo && purse.displayInfo.amountMathKind) || undefined;
export const getPurseDecimalPlaces = purse =>
  (purse && purse.displayInfo && purse.displayInfo.decimalPlaces) || undefined;

/**
 * From an array of brands to brandInfo, make a function that gives
 * the decimalPlaces if given a brand
 *
 * @param {Array<any>} brands
 * @returns {(brand: Brand) => number}
 */
export const makeGetDecimalPlaces = brands => {
  /** @type {Map<Brand, { decimalPlaces: number }>} */
  const brandMap = new Map(brands);
  const getDecimalPlaces = brand => {
    const brandInfo = brandMap.get(brand);
    console.log(brand, brandInfo);
    return brandInfo.decimalPlaces;
  };
  return getDecimalPlaces;
};

export const findPurseByPetname = (purses, petname) =>
  purses.find(
    ({ pursePetname }) =>
      JSON.stringify(pursePetname) === JSON.stringify(petname),
  );

export const displayPetname = pn => (Array.isArray(pn) ? pn.join('.') : pn);

export const filterPursesByBrand = (purses, desiredBrand) =>
  purses.filter(({ brand }) => brand === desiredBrand);

export const comparePurses = (a, b) =>
  displayPetname(a.pursePetname) > displayPetname(b.pursePetname) ? 1 : -1;

export const sortPurses = purses => purses.sort(comparePurses);
