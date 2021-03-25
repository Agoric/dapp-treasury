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
