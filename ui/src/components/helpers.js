// @ts-check
export const getPurseMathKind = purse =>
  (purse && purse.displayInfo && purse.displayInfo.amountMathKind) || undefined;
export const getPurseDecimalPlaces = purse =>
  (purse && purse.displayInfo && purse.displayInfo.decimalPlaces) || undefined;

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

export const getInfoForBrand = (brandToInfo, brand) => {
  const array = brandToInfo.find(([b]) => b === brand);
  if (array) {
    return array[1];
  }
  return undefined;
};
