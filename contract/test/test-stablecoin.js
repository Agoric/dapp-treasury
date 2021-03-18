// @ts-check
/* global require */

import '@agoric/zoe/tools/prepare-test-env';
import '@agoric/zoe/exported';
import '../src/types';

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { E } from '@agoric/eventual-send';
import bundleSource from '@agoric/bundle-source';

import { makeFakeVatAdmin } from '@agoric/zoe/src/contractFacet/fakeVatAdmin';
import { makeLoopback } from '@agoric/captp';

import { makeZoe } from '@agoric/zoe';
import { makeIssuerKit, MathKind } from '@agoric/ertp';

import { makeFakePriceAuthority } from '@agoric/zoe/tools/fakePriceAuthority';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';
import { makeRatio, multiplyBy } from '@agoric/zoe/src/contractSupport/ratio';
import { makePromiseKit } from '@agoric/promise-kit';
import { makeTracer } from '../src/makeTracer';

const stablecoinRoot = '../src/stablecoinMachine.js';
const autoswapRoot =
  '@agoric/zoe/src/contracts/multipoolAutoswap/multipoolAutoswap';
const trace = makeTracer('TestST');

const BASIS_POINTS = 10000n;
const PERCENT = 100n;

/**
 * The properties will be asssigned by `setTestJig` in the contract.
 *
 * @typedef {Object} TestContext
 * @property {ContractFacet} zcf
 * @property {IssuerRecord} stablecoin
 * @property {IssuerRecord} governance
 * @property {ERef<MultipoolAutoswapPublicFacet>} autoswap
 */
/*
 * @type {TestContext}
 */
let testJig;
const setJig = jig => {
  testJig = jig;
};

const { makeFar, makeNear } = makeLoopback('zoeTest');
let isFirst = true;
function makeRemote(arg) {
  const result = isFirst ? makeNear(arg) : arg;
  isFirst = !isFirst;
  return result;
}

/** @type {ERef<ZoeService>} */
const zoe = makeFar(makeZoe(makeFakeVatAdmin(setJig, makeRemote).admin));
trace('makeZoe');

async function makeInstall(sourceRoot) {
  const path = require.resolve(sourceRoot);
  const contractBundle = await bundleSource(path);
  const install = E(zoe).install(contractBundle);
  trace('install', sourceRoot, install);
  return install;
}

function setupAssets() {
  // setup collateral assets
  const aethKit = makeIssuerKit('aEth');
  // const { mint: aethMint, amountMath: aethMath } = aethKit;

  // const abtcKit = produceIssuer('aBtc');
  // const { mint: abtcMint, amountMath: abtcMath } = abtcKit;
  trace('setup assets');
  return harden({
    aethKit,
  });
}

const makePriceAuthority = (
  mathIn,
  mathOut,
  priceList,
  tradeList,
  timer,
  quoteMint,
  unitAmountIn,
) => {
  const options = {
    mathIn,
    mathOut,
    priceList,
    tradeList,
    timer,
    quoteMint,
    unitAmountIn,
  };
  return makeFakePriceAuthority(options);
};

function makeRates(sconesBrand, aethBrand) {
  return harden({
    // exchange rate
    initialPrice: makeRatio(201n, sconesBrand, PERCENT, aethBrand),
    // margin required to open a loan
    initialMargin: makeRatio(120n, sconesBrand),
    // margin required to maintain a loan
    liquidationMargin: makeRatio(105n, sconesBrand),
    // periodic interest rate (per charging period)
    interestRate: makeRatio(100n, sconesBrand, BASIS_POINTS),
    // charge to create or increase loan balance
    loanFee: makeRatio(500n, sconesBrand, BASIS_POINTS),
  });
}

test('first', async t => {
  const autoswapInstall = await makeInstall(autoswapRoot);

  const stablecoinInstall = await makeInstall(stablecoinRoot);

  const {
    aethKit: {
      mint: aethMint,
      issuer: aethIssuer,
      amountMath: aethMath,
      brand: aethBrand,
    },
  } = setupAssets();

  const priceAuthorityPromiseKit = makePromiseKit();
  const priceAuthorityPromise = priceAuthorityPromiseKit.promise;
  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };
  const manualTimer = buildManualTimer(console.log);
  const { creatorFacet: stablecoinMachine, publicFacet: lender } = await E(
    zoe,
  ).startInstance(
    stablecoinInstall,
    {},
    {
      autoswapInstall,
      priceAuthority: priceAuthorityPromise,
      loanParams,
      timerService: manualTimer,
    },
  );

  const { stablecoin, governance, autoswap: _autoswapAPI } = testJig;
  const {
    issuer: sconeIssuer,
    amountMath: sconeMath,
    brand: sconeBrand,
  } = stablecoin;

  const {
    issuer: _govIssuer,
    amountMath: govMath,
    brand: _govBrand,
  } = governance;

  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  // priceAuthority needs sconeMath, which isn't available till the
  // stablecoinMachine has been built, so resolve priceAuthorityPromiseKit here
  const priceAuthority = makePriceAuthority(
    aethMath,
    sconeMath,
    [500n, 15n],
    null,
    manualTimer,
    quoteMint,
    aethMath.make(900n),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a pool with 900 aeth collateral at a 201 aeth/scones rate
  const capitalAmount = aethMath.make(900n);
  const rates = makeRates(sconeBrand, aethBrand);
  const aethVaultSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: govMath.getEmpty() },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );
  trace('added aeth type', aethVaultSeat);

  /** @type {VaultManager} */
  const aethVaultManager = await E(aethVaultSeat).getOfferResult();

  // Create a loan for 470 scones with 1100 aeth collateral
  const collateralAmount = aethMath.make(1100n);
  const loanAmount = sconeMath.make(470n);
  const loanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { Scones: loanAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(collateralAmount),
    }),
  );

  const { vault, _liquidationPayout } = await E(loanSeat).getOfferResult();
  const debtAmount = await E(vault).getDebtAmount();
  const fee = multiplyBy(sconeMath.make(470n), rates.loanFee);
  t.deepEqual(
    debtAmount,
    sconeMath.add(loanAmount, fee),
    'vault lent 470 Scones',
  );
  trace('correct debt', debtAmount);

  const { Scones: lentAmount } = await E(loanSeat).getCurrentAllocation();
  const loanProceeds = await E(loanSeat).getPayouts();
  const sconesLent = await loanProceeds.Scones;
  // const lentAmount = await sconeIssuer.getAmountOf(sconesLent);
  t.deepEqual(lentAmount, loanAmount, 'received 47 Scones');
  t.deepEqual(
    vault.getCollateralAmount(),
    aethMath.make(1100n),
    'vault holds 1100 Collateral',
  );

  // Add more collateral to an existing loan. We get nothing back but a warm
  // fuzzy feeling.

  // partially payback
  const collateralWanted = aethMath.make(100n);
  const paybackAmount = sconeMath.make(200n);
  const [paybackPayment, _remainingPayment] = await E(sconeIssuer).split(
    sconesLent,
    paybackAmount,
  );

  const seat = await E(zoe).offer(
    vault.makePaybackInvitation(),
    harden({
      give: { Scones: paybackAmount },
      want: { Collateral: collateralWanted },
    }),
    harden({
      Scones: paybackPayment,
    }),
  );
  const message = await E(seat).getOfferResult();
  t.is(message, 'thank you for your payment');

  const { Collateral: returnedCollateral } = await E(seat).getPayouts();
  const returnedAmount = await aethIssuer.getAmountOf(returnedCollateral);
  t.deepEqual(
    vault.getDebtAmount(),
    sconeMath.make(293n),
    'debt reduced to 293 scones',
  );
  t.deepEqual(
    vault.getCollateralAmount(),
    aethMath.make(1000n),
    'vault holds 1000 Collateral',
  );
  t.deepEqual(returnedAmount, aethMath.make(100n), 'withdrew 100 collateral');

  console.log('preDEBT ', vault.getDebtAmount());

  await E(aethVaultManager).liquidateAll();
  console.log('DEBT ', vault.getDebtAmount());
  t.truthy(sconeMath.isEmpty(vault.getDebtAmount()), 'debt is paid off');
  console.log('COLLATERAL ', vault.getCollateralAmount());
  t.truthy(aethMath.isEmpty(vault.getCollateralAmount()), 'vault is cleared');

  t.deepEqual(stablecoinMachine.getRewardAllocation(), {
    Scones: sconeMath.make(23n),
  });
});

test('price drop', async t => {
  const autoswapInstall = await makeInstall(autoswapRoot);

  const stablecoinInstall = await makeInstall(stablecoinRoot);

  const {
    aethKit: {
      mint: aethMint,
      issuer: aethIssuer,
      amountMath: aethMath,
      brand: aethBrand,
    },
  } = setupAssets();

  const priceAuthorityPromiseKit = makePromiseKit();
  const priceAuthorityPromise = priceAuthorityPromiseKit.promise;
  // When the price falls to 160, the loan will get liquidated. 160 for 900
  // Aeth is 5.6 each. The loan is 470 scones, the collateral is worth 160.
  // The margin is 1.2, so at 160, the collateral could support a loan of 192.

  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };
  const manualTimer = buildManualTimer(console.log);

  const { creatorFacet: stablecoinMachine, publicFacet: lender } = await E(
    zoe,
  ).startInstance(
    stablecoinInstall,
    {},
    {
      autoswapInstall,
      priceAuthority: priceAuthorityPromise,
      loanParams,
      timerService: manualTimer,
    },
  );

  const { stablecoin, governance, autoswap: _autoswapAPI } = testJig;

  const {
    issuer: sconeIssuer,
    amountMath: sconeMath,
    brand: sconeBrand,
  } = stablecoin;
  const {
    issuer: _govIssuer,
    amountMath: govMath,
    brand: _govBrand,
  } = governance;

  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethMath,
    sconeMath,
    [1000n, 677n, 636n],
    null,
    manualTimer,
    quoteMint,
    aethMath.make(900n),
  );
  // priceAuthority needs sconeMath, which isn't available till the
  // stablecoinMachine has been built, so resolve priceAuthorityPromiseKit here
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a pool with 900 aeth at a 201 scones/aeth rate
  const capitalAmount = aethMath.make(900n);
  const rates = makeRates(sconeBrand, aethBrand);
  const aethVaultSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: govMath.getEmpty() },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );
  trace('added aeth type', aethVaultSeat);

  /** @type {VaultManager} */
  const aethVaultManager = await E(aethVaultSeat).getOfferResult();
  trace(aethVaultManager);

  // Create a loan for 270 scones with 40 aeth collateral
  const collateralAmount = aethMath.make(400n);
  const loanAmount = sconeMath.make(270n);
  const loanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { Scones: loanAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(collateralAmount),
    }),
  );

  const { vault, liquidationPayout, uiNotifier } = await E(
    loanSeat,
  ).getOfferResult();
  const debtAmount = await E(vault).getDebtAmount();
  const fee = multiplyBy(sconeMath.make(270n), rates.loanFee);
  t.deepEqual(
    debtAmount,
    sconeMath.add(loanAmount, fee),
    'borrower owes 283 Scones',
  );

  const notification1 = await uiNotifier.getUpdateSince();
  t.falsy(notification1.value.liquidated);
  t.deepEqual(
    await notification1.value.collateralizationRatio,
    makeRatio(444n, sconeBrand, 283n),
  );
  const { Scones: lentAmount } = await E(loanSeat).getCurrentAllocation();
  t.truthy(sconeMath.isEqual(lentAmount, loanAmount), 'received 470 Scones');
  t.deepEqual(
    vault.getCollateralAmount(),
    aethMath.make(400n),
    'vault holds 11 Collateral',
  );

  await manualTimer.tick();
  const notification2 = await uiNotifier.getUpdateSince();
  t.is(notification2.updateCount, 2);
  t.falsy(notification2.value.liquidated);

  await manualTimer.tick();
  const notification3 = await uiNotifier.getUpdateSince();
  t.is(notification3.updateCount, 2);
  t.falsy(notification3.value.liquidated);

  await manualTimer.tick();
  const notification4 = await uiNotifier.getUpdateSince(2);
  t.falsy(notification4.updateCount);
  t.truthy(notification4.value.liquidated);

  // 38 Aeth will be sold for 283, so the borrower will get 232 Aeth back
  const sconesPayout = await E.G(liquidationPayout).Scones;
  const sconesAmount = await E(sconeIssuer).getAmountOf(sconesPayout);
  t.deepEqual(sconesAmount, sconeMath.getEmpty());
  const aethPayout = await E.G(liquidationPayout).Collateral;
  const aethPayoutAmount = await E(aethIssuer).getAmountOf(aethPayout);
  t.deepEqual(aethPayoutAmount, aethMath.make(232n));
  const debtAmountAfter = await E(vault).getDebtAmount();
  const finalNotification = await uiNotifier.getUpdateSince();
  t.truthy(finalNotification.value.liquidated);
  t.deepEqual(
    await finalNotification.value.collateralizationRatio,
    makeRatio(0n, sconeBrand),
  );
  t.truthy(sconeMath.isEmpty(debtAmountAfter));

  t.deepEqual(stablecoinMachine.getRewardAllocation(), {
    Scones: sconeMath.make(13n),
  });
});

test('price falls precipitously', async t => {
  const autoswapInstall = await makeInstall(autoswapRoot);
  const stablecoinInstall = await makeInstall(stablecoinRoot);

  const priceAuthorityPromiseKit = makePromiseKit();
  const priceAuthorityPromise = priceAuthorityPromiseKit.promise;
  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 10n,
  };

  const {
    aethKit: {
      mint: aethMint,
      issuer: aethIssuer,
      amountMath: aethMath,
      brand: aethBrand,
    },
  } = setupAssets();

  // The borrower will deposit 4 Aeth, and ask to borrow 470 scones. The
  // PriceAuthority's initial quote is 180. The max loan on 4 Aeth would be 600
  // (to make the margin 20%).
  // When the price falls to 123, the loan will get liquidated. At that point, 4
  // Aeth is worth 492, with a 5% margin, 493 is required.
  // The Autowap provides 534 scones for the 4 Aeth collateral, so the borrower
  // gets 41 back

  const manualTimer = buildManualTimer(console.log);
  const { creatorFacet: stablecoinMachine, publicFacet: lender } = await E(
    zoe,
  ).startInstance(
    stablecoinInstall,
    {},
    {
      autoswapInstall,
      priceAuthority: priceAuthorityPromise,
      loanParams,
      timerService: manualTimer,
    },
  );

  const { stablecoin, governance, autoswap: autoswapAPI } = testJig;

  const {
    issuer: sconeIssuer,
    amountMath: sconeMath,
    brand: sconeBrand,
  } = stablecoin;
  const {
    issuer: _govIssuer,
    amountMath: govMath,
    brand: _govBrand,
  } = governance;
  // Our wrapper gives us a Vault which holds 5 Collateral, has lent out 10
  // Scones, which uses an autoswap that presents a fixed price of 4 Scones
  // per Collateral.

  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  // priceAuthority needs sconeMath, which isn't available till the
  // stablecoinMachine has been built, so resolve priceAuthorityPromiseKit here
  const priceAuthority = makePriceAuthority(
    aethMath,
    sconeMath,
    [2200n, 19180n, 1650n, 150n],
    null,
    manualTimer,
    quoteMint,
    aethMath.make(900n),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a pool with 900 aeth at a 201 scones/aeth rate
  const capitalAmount = aethMath.make(900n);
  const rates = makeRates(sconeBrand, aethBrand);
  const aethVaultSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: govMath.getEmpty() },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );
  trace('added aeth type', aethVaultSeat);

  /** @type {VaultManager} */
  const aethVaultManager = await E(aethVaultSeat).getOfferResult();
  trace(aethVaultManager);

  // Create a loan for 370 scones with 400 aeth collateral
  const collateralAmount = aethMath.make(400n);
  const loanAmount = sconeMath.make(370n);
  const loanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { Scones: loanAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(collateralAmount),
    }),
  );

  const { vault, liquidationPayout } = await E(loanSeat).getOfferResult();
  const debtAmount = await E(vault).getDebtAmount();
  const fee = multiplyBy(sconeMath.make(370n), rates.loanFee);
  t.deepEqual(
    debtAmount,
    sconeMath.add(loanAmount, fee),
    'borrower owes 388 Scones',
  );
  trace('correct debt', debtAmount);

  const { Scones: lentAmount } = await E(loanSeat).getCurrentAllocation();
  t.deepEqual(lentAmount, loanAmount, 'received 470 Scones');
  t.deepEqual(
    vault.getCollateralAmount(),
    aethMath.make(400n),
    'vault holds 400 Collateral',
  );
  trace();

  // Sell some Eth to drive the value down
  const swapInvitation = E(autoswapAPI).makeSwapInvitation();
  const proposal = {
    give: { In: aethMath.make(200n) },
    want: { Out: sconeMath.make(0n) },
    exit: { onDemand: null },
  };
  await E(zoe).offer(
    swapInvitation,
    proposal,
    harden({
      In: aethMint.mintPayment(aethMath.make(200n)),
    }),
  );

  await manualTimer.tick();
  t.falsy(sconeMath.isEmpty(await E(vault).getDebtAmount()));
  await manualTimer.tick();
  t.falsy(sconeMath.isEmpty(await E(vault).getDebtAmount()));
  await manualTimer.tick();
  t.falsy(sconeMath.isEmpty(await E(vault).getDebtAmount()));
  await manualTimer.tick();
  const sconesPayout = await E.G(liquidationPayout).Scones;
  const sconesAmount = await E(sconeIssuer).getAmountOf(sconesPayout);
  t.deepEqual(sconesAmount, sconeMath.getEmpty());
  const aethPayout = await E.G(liquidationPayout).Collateral;
  const aethPayoutAmount = await E(aethIssuer).getAmountOf(aethPayout);
  t.deepEqual(aethPayoutAmount, aethMath.make(8n));
  t.truthy(sconeMath.isEmpty(await E(vault).getDebtAmount()));

  t.deepEqual(stablecoinMachine.getRewardAllocation(), {
    Scones: sconeMath.make(18n),
  });
});

test('stablecoin display collateral', async t => {
  const autoswapInstall = await makeInstall(autoswapRoot);
  const stablecoinInstall = await makeInstall(stablecoinRoot);

  const {
    aethKit: {
      mint: aethMint,
      issuer: aethIssuer,
      amountMath: aethMath,
      brand: aethBrand,
    },
  } = setupAssets();

  const priceAuthorityPromiseKit = makePromiseKit();
  const priceAuthorityPromise = priceAuthorityPromiseKit.promise;
  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 6n,
  };
  const manualTimer = buildManualTimer(console.log);
  const { creatorFacet: stablecoinMachine } = await E(zoe).startInstance(
    stablecoinInstall,
    {},
    {
      autoswapInstall,
      priceAuthority: priceAuthorityPromise,
      loanParams,
      timerService: manualTimer,
    },
  );

  const { stablecoin, governance, autoswap: _autoswapAPI } = testJig;
  const { amountMath: sconeMath, brand: sconeBrand } = stablecoin;
  const { amountMath: govMath, brand: _govBrand } = governance;
  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethMath,
    sconeMath,
    [500n, 1500n],
    null,
    manualTimer,
    quoteMint,
    aethMath.make(90n),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a vaultManager with 900 aeth collateral at a 201 aeth/scones rate
  const capitalAmount = aethMath.make(900n);
  const rates = harden({
    initialPrice: makeRatio(201n, sconeBrand, PERCENT, aethBrand),
    initialMargin: makeRatio(120n, sconeBrand),
    liquidationMargin: makeRatio(105n, sconeBrand),
    interestRate: makeRatio(100n, sconeBrand, BASIS_POINTS),
    loanFee: makeRatio(530n, sconeBrand, BASIS_POINTS),
  });
  const aethVaultManagerSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: govMath.getEmpty() },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  await E(aethVaultManagerSeat).getOfferResult();

  const collaterals = await E(stablecoinMachine).getCollaterals();

  t.deepEqual(collaterals[0], {
    brand: aethBrand,
    liquidationMargin: makeRatio(105n, sconeBrand),
    initialMargin: makeRatio(120n, sconeBrand),
    stabilityFee: makeRatio(530n, sconeBrand, BASIS_POINTS),
    marketPrice: sconeMath.make(5n),
  });
});

test('interest on multiple vaults', async t => {
  const autoswapInstall = await makeInstall(autoswapRoot);
  const stablecoinInstall = await makeInstall(stablecoinRoot);

  const {
    aethKit: {
      mint: aethMint,
      issuer: aethIssuer,
      amountMath: aethMath,
      brand: aethBrand,
    },
  } = setupAssets();

  const priceAuthorityPromiseKit = makePromiseKit();
  const priceAuthorityPromise = priceAuthorityPromiseKit.promise;
  const loanParams = {
    chargingPeriod: 2n,
    recordingPeriod: 6n,
  };
  const manualTimer = buildManualTimer(console.log);
  const { creatorFacet: stablecoinMachine, publicFacet: lender } = await E(
    zoe,
  ).startInstance(
    stablecoinInstall,
    {},
    {
      autoswapInstall,
      priceAuthority: priceAuthorityPromise,
      loanParams,
      timerService: manualTimer,
    },
  );

  const { stablecoin, governance, autoswap: _autoswapAPI } = testJig;
  const {
    issuer: sconeIssuer,
    amountMath: sconeMath,
    brand: sconeBrand,
  } = stablecoin;
  const { amountMath: govMath, brand: _govBrand } = governance;
  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;

  const priceAuthority = makePriceAuthority(
    aethMath,
    sconeMath,
    [500n, 1500n],
    null,
    manualTimer,
    quoteMint,
    aethMath.make(90n),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a vaultManager with 900 aeth collateral at a 201 aeth/scones rate
  const capitalAmount = aethMath.make(900n);
  const rates = makeRates(sconeBrand, aethBrand);
  const aethVaultManagerSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', rates),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: govMath.getEmpty() },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }),
  );

  await E(aethVaultManagerSeat).getOfferResult();

  // Create a loan for Alice for 4700 scones with 1100 aeth collateral
  const collateralAmount = aethMath.make(1100n);
  const aliceLoanAmount = sconeMath.make(4700n);
  const aliceLoanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: { Scones: aliceLoanAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(collateralAmount),
    }),
  );
  const { vault: aliceVault, uiNotifier: aliceNotifier } = await E(
    aliceLoanSeat,
  ).getOfferResult();

  const debtAmount = await E(aliceVault).getDebtAmount();
  const fee = multiplyBy(aliceLoanAmount, rates.loanFee);
  t.deepEqual(
    debtAmount,
    sconeMath.add(aliceLoanAmount, fee),
    'vault lent 4700 Scones + fees',
  );

  const { Scones: lentAmount } = await E(aliceLoanSeat).getCurrentAllocation();
  const loanProceeds = await E(aliceLoanSeat).getPayouts();
  t.deepEqual(lentAmount, aliceLoanAmount, 'received 4700 Scones');

  const sconesLent = await loanProceeds.Scones;
  t.truthy(
    sconeMath.isEqual(
      await E(sconeIssuer).getAmountOf(sconesLent),
      sconeMath.make(4700n),
    ),
  );

  // Create a loan for Bob for 3200 scones with 800 aeth collateral
  const bobCollateralAmount = aethMath.make(800n);
  const bobLoanAmount = sconeMath.make(3200n);
  const bobLoanSeat = await E(zoe).offer(
    E(lender).makeLoanInvitation(),
    harden({
      give: { Collateral: bobCollateralAmount },
      want: { Scones: bobLoanAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(bobCollateralAmount),
    }),
  );
  const { vault: bobVault, uiNotifier: bobNotifier } = await E(
    bobLoanSeat,
  ).getOfferResult();

  const bobDebtAmount = await E(bobVault).getDebtAmount();
  const bobFee = multiplyBy(bobLoanAmount, rates.loanFee);
  t.deepEqual(
    bobDebtAmount,
    sconeMath.add(bobLoanAmount, bobFee),
    'vault lent 3200 Scones + fees',
  );

  const { Scones: bobLentAmount } = await E(bobLoanSeat).getCurrentAllocation();
  const bobLoanProceeds = await E(bobLoanSeat).getPayouts();
  t.deepEqual(bobLentAmount, bobLoanAmount, 'received 4700 Scones');

  const bobSconesLent = await bobLoanProceeds.Scones;
  t.truthy(
    sconeMath.isEqual(
      await E(sconeIssuer).getAmountOf(bobSconesLent),
      sconeMath.make(3200n),
    ),
  );

  // { chargingPeriod: 2, recordingPeriod: 6 }  charge 1% 3 times
  for (let i = 0; i < 10; i += 1) {
    manualTimer.tick();
  }

  await manualTimer.tick();
  await manualTimer.tick();
  await manualTimer.tick();
  const aliceUpdate = await aliceNotifier.getUpdateSince();
  const bobUpdate = await bobNotifier.getUpdateSince();
  const bobAddedDebt = 160n + 33n + 33n + 34n;
  t.deepEqual(bobUpdate.value.debt, sconeMath.make(3200n + bobAddedDebt));
  t.deepEqual(bobUpdate.value.interestRate, makeRatio(100n, sconeBrand, 10000n));
  t.deepEqual(
    bobUpdate.value.liquidationRatio,
    makeRatio(105n, sconeBrand, 100n),
  );
  const bobCollateralization = bobUpdate.value.collateralizationRatio;
  t.truthy(
    bobCollateralization.numerator.value >
      bobCollateralization.denominator.value,
  );

  const aliceAddedDebt = 235n + 49n + 49n + 50n;
  t.deepEqual(aliceUpdate.value.debt, sconeMath.make(4700n + aliceAddedDebt));
  t.deepEqual(
    aliceUpdate.value.interestRate,
    makeRatio(100n, sconeBrand, 10000n),
  );
  t.deepEqual(aliceUpdate.value.liquidationRatio, makeRatio(105n, sconeBrand));
  const aliceCollateralization = aliceUpdate.value.collateralizationRatio;
  t.truthy(
    aliceCollateralization.numerator.value >
      aliceCollateralization.denominator.value,
  );

  t.truthy(
    sconeMath.isEqual(
      stablecoinMachine.getRewardAllocation().Scones,
      sconeMath.make(aliceAddedDebt + bobAddedDebt),
    ),
    // reward includes 5% fees on two loans plus 1% interest three times on each
    `Should be ${aliceAddedDebt + bobAddedDebt}, was ${
      stablecoinMachine.getRewardAllocation().value
    }`,
  );
});
