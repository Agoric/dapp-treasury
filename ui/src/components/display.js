// @ts-check
import JSON5 from 'json5';
import { assert, details } from '@agoric/assert';
import { MathKind } from '@agoric/ertp';

const CONVENTIONAL_DECIMAL_PLACES = 2;

/**
 * @typedef {{ amountMathKind?: AmountMathKind  | 'big' } & DisplayInfo} AmountDisplayInfo
 */

export const BigNum = v => {
  if (typeof v === 'object') {
    console.log(v);
    throw Error(`could not make a bigInt ${v}`);
  }
  return v === undefined ? undefined : BigInt(v);
};

/**
 *
 * @param {number | string | bigint} from
 * @param {number} fromDecimals
 * @param {number} toDecimals
 */
export const convertBigint = (from, fromDecimals, toDecimals) => {
  if (fromDecimals < toDecimals) {
    const scale = BigInt(10) ** BigInt(toDecimals - fromDecimals);
    return BigNum(from) * scale;
  }
  const scale = BigInt(10) ** BigInt(fromDecimals - toDecimals);
  return BigNum(from) / scale;
};

/**
 *
 * @param {string} str
 * @param {AmountDisplayInfo} displayInfo
 * @param {boolean} strict
 */
export function parseValue(str, displayInfo, strict = false) {
  const { amountMathKind = MathKind.NAT, decimalPlaces = 0 } =
    displayInfo || {};

  assert.typeof(str, 'string', details`valueString ${str} is not a string`);

  if (amountMathKind !== MathKind.NAT && amountMathKind !== 'big') {
    // Punt to JSON5 parsing.
    return JSON5.parse(str);
  }

  // Parse the string as a number.
  const match = str.match(/^0*(\d*)(\.(\d*[1-9])?0*)?$/);
  assert(
    !strict || match,
    details`${str} must be a non-negative decimal number`,
  );

  const unitstr = (match && match[1]) || '0';
  const dec0str = (match && match[3]) || '';
  const dec0str0 = dec0str.padEnd(decimalPlaces, '0');
  assert(
    dec0str0.length <= decimalPlaces,
    details`${str} exceeds ${decimalPlaces} decimal places`,
  );

  if (amountMathKind === 'big') {
    return BigInt(`${unitstr}${dec0str0}`);
  }
  // FIXME: Nat!
  const n = parseInt(`${unitstr}${dec0str0}`, 10);
  assert(!strict || Number.isSafeInteger(n), `Not a safe integer ${n}`);
  return n;
}

/**
 *
 * @param {any} value
 * @param {AmountDisplayInfo} [displayInfo]
 * @returns {string}
 */
export function stringifyValue(value, displayInfo = undefined) {
  value = value || 0;
  const { amountMathKind = MathKind.NAT, decimalPlaces = 0 } =
    displayInfo || {};

  if (amountMathKind !== MathKind.NAT) {
    // Just return the size of the set.
    return `${value.length}`;
  }

  const bValue = BigNum(value);
  if (!decimalPlaces) {
    // Nothing else to do.
    return `${bValue}`;
  }

  const bScale = BigInt(10) ** BigInt(decimalPlaces);

  // Take integer division of the value by the scale.
  const unitstr = `${bValue / bScale}`;

  // Find the remainder of the value divided by the scale.
  const bDecimals = BigInt(bValue % bScale);

  // Create the decimal string.
  const decstr = `${bDecimals}`
    // Convert 100 to '0000100'.
    .padStart(decimalPlaces, '0')
    // Trim off trailing zeros.
    .replace(/0+$/, '')
    // Ensure we have at least CONVENTIONAL_DECIMAL_PLACES.
    .padEnd(CONVENTIONAL_DECIMAL_PLACES, '0');

  if (!decstr) {
    // No decimals to display.
    return `${unitstr}`;
  }

  // Display a decimal point with the units and decimals.
  return `${unitstr}.${decstr}`;
}

export const stringifyPurseValue = purse => {
  if (!purse) {
    return '0';
  }
  return stringifyValue(purse.value, purse.displayInfo);
};
