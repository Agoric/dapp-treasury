// @ts-check
import '@agoric/zoe/exported';
import '../src/types';

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import { E } from '@agoric/eventual-send';
import bundleSource from '@agoric/bundle-source';

import { makeFakeVatAdmin } from '@agoric/zoe/src/contractFacet/fakeVatAdmin';
import { makeLoopback } from '@agoric/captp';

import { makeZoe } from '@agoric/zoe';
import { makeIssuerKit } from '@agoric/ertp';

import { makeFakePriceAuthority } from '@agoric/zoe/tools/fakePriceAuthority';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';
import { makeTracer } from '../src/makeTracer';
import { MathKind } from '../../_agstate/yarn-links/@agoric/ertp';
import { makePromiseKit } from '../../_agstate/yarn-links/@agoric/promise-kit';

const stablecoinRoot = '../src/stablecoinMachine.js';
const autoswapRoot =
  '@agoric/zoe/src/contracts/multipoolAutoswap/multipoolAutoswap';
const trace = makeTracer('TestST');

/**
 * The properties will be asssigned by `setTestJig` in the contract.
 *
 * @typedef {Object} TestContext
 * @property {ContractFacet} zcf
 * @property {IssuerRecord} stablecoin
 * @property {IssuerRecord} governance
 * @property {MultipoolAutoswap} autoswap
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

test('first', async t => {
  const autoswapInstall = await makeInstall(autoswapRoot);

  const stablecoinInstall = await makeInstall(stablecoinRoot);

  const {
    aethKit: { mint: aethMint, issuer: aethIssuer, amountMath: aethMath },
  } = setupAssets();

  const priceAuthorityPromiseKit = makePromiseKit();
  const { creatorFacet: stablecoinMachine } = await E(zoe).startInstance(
    stablecoinInstall,
    {},
    { autoswapInstall, priceAuthority: priceAuthorityPromiseKit.promise },
  );
  trace('start stablecoin', stablecoinMachine);

  trace('got jig', testJig);
  const { stablecoin, governance, autoswap: _autoswapAPI } = testJig;

  trace('stablecoin machine', stablecoinMachine);
  const {
    issuer: sconeIssuer,
    amountMath: sconeMath,
    brand: _sconeBrand,
  } = stablecoin;
  const {
    issuer: _govIssuer,
    amountMath: govMath,
    brand: _govBrand,
  } = governance;
  trace('got math', govMath, sconeMath);
  // const govMath = await stablecoinMachine.stablecoinIssuer;
  // Our wrapper gives us a Vault which holds 5 Collateral, has lent out 10
  // Scones, which uses an autoswap that presents a fixed price of 4 Scones
  // per Collateral.

  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;
  const manualTimer = buildManualTimer(console.log);

  // priceAuthority needs sconeMath, which isn't available till the
  // stablecoinMachine has been built, so resolve priceAuthorityPromiseKit here
  const priceAuthority = makePriceAuthority(
    aethMath,
    sconeMath,
    [5, 15],
    null,
    manualTimer,
    quoteMint,
    aethMath.make(10),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a pool with 99 aeth collateral at a 201 aeth/scones rate
  const capitalAmount = aethMath.make(99);
  const aethVaultSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', 201),
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

  // Create a loan for 47 scones with 11 aeth collateral
  const collateralAmount = aethMath.make(11);
  const loanAmount = sconeMath.make(47);
  const loanSeat = await E(zoe).offer(
    E(aethVaultManager).makeLoanInvitation(),
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
  t.truthy(sconeMath.isEqual(debtAmount, loanAmount), 'vault lent 47 Scones');
  trace('correct debt', debtAmount);

  const { Scones: lentAmount } = await E(loanSeat).getCurrentAllocation();
  const loanProceeds = await E(loanSeat).getPayouts();
  const sconesLent = await loanProceeds.Scones;
  // const lentAmount = await sconeIssuer.getAmountOf(sconesLent);
  t.truthy(sconeMath.isEqual(lentAmount, loanAmount), 'received 47 Scones');
  t.truthy(
    aethMath.isEqual(vault.getCollateralAmount(), aethMath.make(11)),
    'vault holds 11 Collateral',
  );
  trace();

  // Add more collateral to an existing loan. We get nothing back but a warm
  // fuzzy feeling.

  // partially payback
  const collateralWanted = aethMath.make(1);
  const paybackAmount = sconeMath.make(5);
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
  t.truthy(
    sconeMath.isEqual(vault.getDebtAmount(), sconeMath.make(42)),
    'debt reduced to 42 scones',
  );
  t.truthy(
    aethMath.isEqual(vault.getCollateralAmount(), aethMath.make(10)),
    'vault holds 10 Collateral',
  );
  t.truthy(
    aethMath.isEqual(returnedAmount, aethMath.make(1)),
    'withdrew 1 collateral',
  );

  console.log('preDEBT ', vault.getDebtAmount());

  await E(aethVaultManager).liquidateAll();
  console.log('DEBT ', vault.getDebtAmount());
  t.truthy(sconeMath.isEmpty(vault.getDebtAmount()), 'debt is paid off');
  console.log('COLLATERAL ', vault.getCollateralAmount());
  t.truthy(aethMath.isEmpty(vault.getCollateralAmount()), 'vault is cleared');
  // t.truthy(aethMath.isEqual(returnedAmount, aethMath.make(1)),
  //   'withdrew 1 collateral');

  // await liquidate();

  // const liqRecord = await liquidationPayout;
  // const cLiq = await liqRecord.Collateral;
  // const sLiq = await liqRecord.Scones;
  // const sLiqAmount = await cIssuer.getAmountOf(sLiq);
  // t.truthy(sconeMath.isEqual(vault.getDebtAmount(), sconeMath.getEmpty()),
  //   'debt eliminated');
  // t.truthy(cMath.isEqual(vault.getCollateralAmount(), cMath.getEmpty()),
  //   'collateral disposed');
  // t.truthy(sconeMath.isEqual(sLiqAmount, sconeMath.make(7)),
  //   'remainder returned');
  // t.equals(cLiq, undefined, 'currently we sell all collateral on liquidation');

  //   makeCloseInvitation

  // Yucky too many promise layers:
  // const { Scones: sconesLent } = await loanKit.payout;
  // console.log("GGR", sconesLent);
  // const lentAmount = await sconeIssuer.getAmountOf(sconesLent);
  // became
  // const sconesLent = await loanProceeds.Scones;
  // const lentAmount = await sconeIssuer.getAmountOf(sconesLent);
  // t.truthy(sconeMath.isEqual(lentAmount, loanAmount), 'received 47 Scones');
});

test('price drop', async t => {
  const autoswapInstall = await makeInstall(autoswapRoot);

  const stablecoinInstall = await makeInstall(stablecoinRoot);

  const {
    aethKit: { mint: aethMint, issuer: aethIssuer, amountMath: aethMath },
  } = setupAssets();

  const priceAuthorityPromiseKit = makePromiseKit();
  const { creatorFacet: stablecoinMachine } = await E(zoe).startInstance(
    stablecoinInstall,
    {},
    { autoswapInstall, priceAuthority: priceAuthorityPromiseKit.promise },
  );
  trace('start stablecoin', stablecoinMachine);

  trace('got jig', testJig);
  const { stablecoin, governance, autoswap: _autoswapAPI } = testJig;

  trace('stablecoin machine', stablecoinMachine);
  const {
    issuer: _sconeIssuer,
    amountMath: sconeMath,
    brand: _sconeBrand,
  } = stablecoin;
  const {
    issuer: _govIssuer,
    amountMath: govMath,
    brand: _govBrand,
  } = governance;
  trace('got math', govMath, sconeMath);
  // Our wrapper gives us a Vault which holds 5 Collateral, has lent out 10
  // Scones, which uses an autoswap that presents a fixed price of 4 Scones
  // per Collateral.
  const quoteMint = makeIssuerKit('quote', MathKind.SET).mint;
  const manualTimer = buildManualTimer(console.log);

  // priceAuthority needs sconeMath, which isn't available till the
  // stablecoinMachine has been built, so resolve priceAuthorityPromiseKit here
  const priceAuthority = makePriceAuthority(
    aethMath,
    sconeMath,
    [60, 32, 6, 5],
    null,
    manualTimer,
    quoteMint,
    aethMath.make(10),
  );
  priceAuthorityPromiseKit.resolve(priceAuthority);

  // Add a pool with 99 aeth collateral at a 201 aeth/scones rate
  const capitalAmount = aethMath.make(99);
  const aethVaultSeat = await E(zoe).offer(
    E(stablecoinMachine).makeAddTypeInvitation(aethIssuer, 'AEth', 201),
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

  // Create a loan for 47 scones with 11 aeth collateral
  const collateralAmount = aethMath.make(11);
  const loanAmount = sconeMath.make(47);
  const loanSeat = await E(zoe).offer(
    E(aethVaultManager).makeLoanInvitation(),
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
  t.truthy(sconeMath.isEqual(debtAmount, loanAmount), 'vault lent 47 Scones');
  trace('correct debt', debtAmount);

  const initialNotification = await uiNotifier.getUpdateSince();
  t.falsy(initialNotification.value.liquidated);
  t.truthy((await initialNotification.value.collateralizationRatio) > 120);
  const { Scones: lentAmount } = await E(loanSeat).getCurrentAllocation();
  t.truthy(sconeMath.isEqual(lentAmount, loanAmount), 'received 47 Scones');
  t.truthy(
    aethMath.isEqual(vault.getCollateralAmount(), aethMath.make(11)),
    'vault holds 11 Collateral',
  );
  trace();

  await manualTimer.tick();
  t.falsy(sconeMath.isEmpty(await E(vault).getDebtAmount()));
  await manualTimer.tick();
  t.falsy(sconeMath.isEmpty(await E(vault).getDebtAmount()));
  await manualTimer.tick();
  t.falsy(sconeMath.isEmpty(await E(vault).getDebtAmount()));
  await manualTimer.tick();
  await liquidationPayout;
  const debtAmountAfter = await E(vault).getDebtAmount();
  const finalNotification = await uiNotifier.getUpdateSince(
    initialNotification.updateCount,
  );
  t.truthy(finalNotification.value.liquidated);
  t.is(await finalNotification.value.collateralizationRatio, 0);
  t.truthy(sconeMath.isEmpty(debtAmountAfter));
});
