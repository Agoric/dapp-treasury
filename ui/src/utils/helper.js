// @ts-check

const PERCENT_BASE = 100n;
// The decimalPlaces parameter attempts to allow control of the number of decimal
// places, but doesn't completely succeed. tpp(102.35) => 102,
// tpp(102.35, 1) => 102, tpp(102.35, 2) => 102.35, tpp(102.35, 3) => 102.35
export function toPrintedPercent(ratio, placesToShow = 0n) {
  if (ratio === null) {
    return '0';
  }
  const power = 10n ** placesToShow;
  const raw =
    (ratio.numerator.value * PERCENT_BASE * power) / ratio.denominator.value;
  return `${Number(raw) / Number(power)}`;
}
