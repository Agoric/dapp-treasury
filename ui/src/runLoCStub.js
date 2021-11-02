// @ts-check

import { makeRatio, multiplyRatios } from '@agoric/zoe/src/contractSupport';

/**
 *
 * @param {Collateral[]} collaterals
 * @returns { Promise<Collateral> }
 */
export const getRunLoCTerms = async collaterals => {
  const bldc =
    collaterals.find(c => `${c.brand}`.match(/\bBLD\b/)) ||
    assert.fail('no BLD collateral');

  /**
   * @param { bigint } s
   * @param { Ratio } r
   */
  const scalar = (s, r) =>
    multiplyRatios(r, makeRatio(100n * s, r.numerator.brand));
  const initialMargin = scalar(5n, bldc.initialMargin);
  const liquidationMargin = scalar(0n, bldc.liquidationMargin);
  const terms = { ...bldc, initialMargin, liquidationMargin };
  return terms;
};
