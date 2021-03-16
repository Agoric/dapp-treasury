// @ts-check

import '@agoric/zoe/tools/prepare-test-env';
import '@agoric/zoe/exported';

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import { makeIssuerKit } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio';

import { makeInterestCalculator } from '../src/interest';

test('too soon', async t => {
  const { amountMath: math, brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(math, makeRatio(1, brand), 3n, 6n);
  const debtStatus = {
    currentDebt: math.make(1000),
    latestInterestUpdate: 10n,
  };
  t.deepEqual(calculator.calculate(debtStatus, 12n), {
    latestInterestUpdate: 10n,
    interest: math.make(0),
    newDebt: math.make(1000),
  });
});

test('basic charge 1 period', async t => {
  const { amountMath: math, brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(math, makeRatio(1, brand), 3, 6);
  const debtStatus = {
    currentDebt: math.make(100000),
    latestInterestUpdate: 10,
  };
  t.deepEqual(calculator.calculate(debtStatus, 13), {
    latestInterestUpdate: 13,
    interest: math.make(1000),
    newDebt: math.make(101000),
  });
});

test('basic 2 charge periods', async t => {
  const { amountMath: math, brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(math, makeRatio(1, brand), 3n, 6n);
  const debtStatus = {
    currentDebt: math.make(100000),
    latestInterestUpdate: 10n,
  };
  t.deepEqual(calculator.calculate(debtStatus, 16n), {
    latestInterestUpdate: 16n,
    interest: math.make(2010),
    newDebt: math.make(102010),
  });
});

test('partial periods', async t => {
  const { amountMath: math, brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(math, makeRatio(1, brand), 3n, 6n);
  const debtStatus = {
    currentDebt: math.make(100000),
    latestInterestUpdate: 10n,
  };
  // timestamp of 20 means that 10 has elapsed, charge for three periods
  t.deepEqual(calculator.calculate(debtStatus, 20n), {
    latestInterestUpdate: 19n,
    interest: math.make(3030),
    newDebt: math.make(103030),
  });
});

test('reportingPeriod: partial', async t => {
  const { amountMath: math, brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(math, makeRatio(1, brand), 3n, 6n);
  const debtStatus = {
    currentDebt: math.make(100000),
    latestInterestUpdate: 10n,
  };
  // timestamp of 20 means that 10 has elapsed, charge for two periods
  t.deepEqual(calculator.calculateReportingPeriod(debtStatus, 20n), {
    latestInterestUpdate: 16n,
    interest: math.make(2010),
    newDebt: math.make(102010),
  });
});

test('reportingPeriod: longer', async t => {
  const { amountMath: math, brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(math, makeRatio(1, brand), 3n, 6n);
  const debtStatus = {
    currentDebt: math.make(100000),
    latestInterestUpdate: 10n,
  };
  // timestamp of 20 means that 10 has elapsed, charge for two periods
  t.deepEqual(calculator.calculateReportingPeriod(debtStatus, 22n), {
    latestInterestUpdate: 22n,
    interest: math.make(4060),
    newDebt: math.make(104060),
  });
});

test('start charging later', async t => {
  const { amountMath: math, brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(math, makeRatio(1, brand), 3, 6);
  const debtStatus = {
    currentDebt: math.make(100000),
    latestInterestUpdate: 16,
  };
  t.deepEqual(calculator.calculate(debtStatus, 13), {
    latestInterestUpdate: 16,
    interest: math.make(0),
    newDebt: math.make(100000),
  });
  t.deepEqual(calculator.calculate(debtStatus, 19), {
    latestInterestUpdate: 19,
    interest: math.make(1000),
    newDebt: math.make(101000),
  });
});

test('reportingPeriod: longer reporting', async t => {
  const { amountMath: math, brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(math, makeRatio(1, brand), 3n, 12n);
  const debtStatus = {
    currentDebt: math.make(100000),
    latestInterestUpdate: 10n,
  };
  // timestamp of 20 means that 10 has elapsed, charge for two periods
  t.deepEqual(calculator.calculateReportingPeriod(debtStatus, 33n), {
    latestInterestUpdate: 22n,
    interest: math.make(4060),
    newDebt: math.make(104060),
  });
});

test('reportingPeriod shorter than charging', async t => {
  const { amountMath: math, brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(math, makeRatio(1, brand), 10n, 5n);
  let debtStatus = {
    currentDebt: math.make(100000),
    latestInterestUpdate: 10n,
  };
  const after10 = {
    latestInterestUpdate: 10n,
    interest: math.make(0),
    newDebt: math.make(100000),
  };
  t.deepEqual(calculator.calculate(debtStatus, 11n), after10);
  t.deepEqual(calculator.calculate(debtStatus, 13n), after10);
  t.deepEqual(calculator.calculate(debtStatus, 15n), after10);
  t.deepEqual(calculator.calculate(debtStatus, 17n), after10);
  t.deepEqual(calculator.calculate(debtStatus, 19n), after10);
  t.deepEqual(calculator.calculate(debtStatus, 20n), {
    latestInterestUpdate: 20n,
    interest: math.make(1000),
    newDebt: math.make(101000),
  });

  debtStatus = { currentDebt: math.make(101000), latestInterestUpdate: 20n };
  const after20 = {
    latestInterestUpdate: 20n,
    interest: math.make(0),
    newDebt: math.make(101000),
  };
  t.deepEqual(calculator.calculate(debtStatus, 21n), after20);
  t.deepEqual(calculator.calculate(debtStatus, 23n), after20);
  t.deepEqual(calculator.calculate(debtStatus, 25n), after20);
  t.deepEqual(calculator.calculate(debtStatus, 27n), after20);
  t.deepEqual(calculator.calculate(debtStatus, 29n), after20);
  t.deepEqual(calculator.calculate(debtStatus, 30n), {
    latestInterestUpdate: 30n,
    interest: math.make(1010),
    newDebt: math.make(102010),
  });
});

test('reportingPeriod shorter than charging; intermittent', async t => {
  const { amountMath: math, brand } = makeIssuerKit('ducats');
  const calculator = makeInterestCalculator(math, makeRatio(1, brand), 10n, 5n);
  let debtStatus = {
    currentDebt: math.make(100000),
    latestInterestUpdate: 10n,
  };
  const after10 = {
    latestInterestUpdate: 10n,
    interest: math.make(0),
    newDebt: math.make(100000),
  };
  t.deepEqual(calculator.calculate(debtStatus, 11n), after10);
  t.deepEqual(calculator.calculate(debtStatus, 13n), after10);
  t.deepEqual(calculator.calculate(debtStatus, 15n), after10);
  t.deepEqual(calculator.calculate(debtStatus, 17n), after10);
  t.deepEqual(calculator.calculate(debtStatus, 19n), after10);

  const after23 = {
    latestInterestUpdate: 20n,
    interest: math.make(1000),
    newDebt: math.make(101000),
  };
  t.deepEqual(calculator.calculate(debtStatus, 23n), after23);
  debtStatus = { currentDebt: math.make(101000), latestInterestUpdate: 20n };

  const after25 = {
    latestInterestUpdate: 20n,
    interest: math.make(0),
    newDebt: math.make(101000),
  };
  t.deepEqual(calculator.calculate(debtStatus, 27n), after25);
  t.deepEqual(calculator.calculate(debtStatus, 29n), after25);
  t.deepEqual(calculator.calculate(debtStatus, 30n), {
    latestInterestUpdate: 30n,
    interest: math.make(1010),
    newDebt: math.make(102010),
  });
});
