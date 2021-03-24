// @ts-check
export const getPurseMathKind = purse =>
  (purse && purse.displayInfo && purse.displayInfo.amountMathKind) || undefined;
export const getPurseDecimalPlaces = purse =>
  (purse && purse.displayInfo && purse.displayInfo.decimalPlaces) || undefined;
