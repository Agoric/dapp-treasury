// @ts-check
import '@agoric/zoe/exported';

import test from 'ava';

import { E } from '@agoric/eventual-send';
import { makeFakeVatAdmin } from '@agoric/zoe/src/contractFacet/fakeVatAdmin';
import { makeLoopback } from '@agoric/captp';
import { makeZoe } from '@agoric/zoe';
import bundleSource from '@agoric/bundle-source';

import { makeIssuerKit } from '@agoric/ertp';
import { whenAllProps } from '../src/burn';

import { makeTracer } from '../src/makeTracer';

const vaultRoot = './vault-contract-wrapper.js';
const trace = makeTracer('TestVault');

/**
 * The properties will be asssigned by `setTestJig` in the contract.
 *
 * @typedef {Object} TestContext
 * @property {ContractFacet} zcf
 * @property {ZCFMint} sconeKit
 * @property {IssuerKit} collateralKit
 * @property {Vault} vault
 */
/*
 * @type {TestContext}
 */
let testJig;
const setJig = jig => {
  testJig = jig;
};

const { makeFar, makeNear: makeRemote } = makeLoopback('zoeTest');

/** @type {ERef<ZoeService>} */
const zoe = makeFar(makeZoe(makeFakeVatAdmin(setJig, makeRemote).admin));
trace('makeZoe');

/**
 *
 * @param {ERef<ZoeService>} zoeP
 * @param {string} sourceRoot
 *
 */
async function launch(zoeP, sourceRoot) {
  const contractBundle = await bundleSource(require.resolve(sourceRoot));
  const installation = await E(zoeP).install(contractBundle);
  const { creatorInvitation, creatorFacet, instance } = await E(
    zoeP,
  ).startInstance(installation);
  return {
    creatorSeat: E(zoeP).offer(creatorInvitation),
    creatorFacet,
    instance,
  };
}

const helperContract = launch(zoe, vaultRoot);

test('first', async t => {
  const { creatorSeat, creatorFacet, _instance } = await helperContract;

  // Our wrapper gives us a Vault which holds 5 Collateral, has lent out 10
  // Scones, which uses an autoswap that presents a fixed price of 4 Scones
  // per Collateral.
  const { _liquidationPayout } = await E(creatorSeat).getOfferResult();

  const { sconeKit: sconeMint, collateralKit, vault } = testJig;

  const { issuer: cIssuer, amountMath: cMath, mint: cMint } = collateralKit;
  const {
    issuer: _sconeIssuer,
    amountMath: sconeMath,
    brand: _sconeBrand,
  } = sconeMint.getIssuerRecord();

  t.truthy(
    sconeMath.isEqual(vault.getDebtAmount(), sconeMath.make(10)),
    'vault lent 10 Scones',
  );
  t.truthy(
    cMath.isEqual(vault.getCollateralAmount(), cMath.make(5)),
    'vault holds 5 Collateral',
  );

  // Add more collateral to an existing loan. We get nothing back but a warm
  // fuzzy feeling.
  trace('vault starts correct', creatorFacet);

  const collateralAmount = cMath.make(2);
  const invite = await E(creatorFacet).makeAddCollateralInvitation();
  trace('invite collateral', invite);
  await E(zoe).offer(
    invite,
    harden({
      give: { Collateral: collateralAmount },
      want: {}, // Scones: sconeMath.make(2) },
    }),
    harden({
      // TODO
      Collateral: cMint.mintPayment(collateralAmount),
    }),
  );
  trace('addCollateral');
  t.truthy(
    cMath.isEqual(vault.getCollateralAmount(), cMath.make(7)),
    'vault holds 7 Collateral',
  );
  trace('addCollateral');

  // partially payback
  const collateralWanted = cMath.make(1);
  const paybackAmount = sconeMath.make(3);
  const payback = await E(creatorFacet).mintScones(paybackAmount);
  const paybackSeat = E(zoe).offer(
    vault.makePaybackInvitation(),
    harden({
      give: { Scones: paybackAmount },
      want: { Collateral: collateralWanted },
    }),
    harden({ Scones: payback }),
  );
  trace('payBack requested', paybackSeat);
  const message = await E(paybackSeat).getOfferResult();
  trace('result retrieved', message);
  t.is(message, 'thank you for your payment');

  trace('all payouts', await whenAllProps(E(paybackSeat).getPayouts()));
  const returnedCollateral = await E(paybackSeat).getPayout('Collateral');
  trace('returnedCollateral', returnedCollateral, cIssuer);
  const returnedAmount = await cIssuer.getAmountOf(returnedCollateral);
  trace('returnedAmount', returnedAmount, cMath.make(1));
  t.truthy(
    sconeMath.isEqual(vault.getDebtAmount(), sconeMath.make(7)),
    'debt reduced to 7 scones',
  );
  t.truthy(
    cMath.isEqual(vault.getCollateralAmount(), cMath.make(6)),
    'vault holds 6 Collateral',
  );
  t.truthy(
    cMath.isEqual(returnedAmount, cMath.make(1)),
    'withdrew 1 collateral',
  );
  // t.is(returnedAmount.value, 1, 'withdrew 1 collateral');
});

test('bad collateral', async t => {
  const { creatorSeat: offerKit } = await helperContract;

  const { sconeKit: sconeMint, collateralKit, vault } = testJig;

  // Our wrapper gives us a Vault which holds 5 Collateral, has lent out 10
  // Scones, which uses an autoswap that presents a fixed price of 4 Scones
  // per Collateral.
  await E(offerKit).getOfferResult();
  const { amountMath: cMath, mint: _cMint } = collateralKit;
  const { amountMath: sconeMath } = sconeMint.getIssuerRecord();

  t.assert(
    cMath.isEqual(vault.getCollateralAmount(), cMath.make(5)),
    'vault holds 5 Collateral',
  );
  t.assert(
    sconeMath.isEqual(vault.getDebtAmount(), sconeMath.make(10)),
    'vault lent 10 Scones',
  );

  const collateralAmount = cMath.make(2);

  // adding the wrong kind of collateral should be rejected
  const wrongKit = makeIssuerKit('wrong');
  const wrongAmount = wrongKit.amountMath.make(2);
  const p = E(zoe).offer(
    vault.makeAddCollateralInvitation(),
    harden({
      give: { Collateral: collateralAmount },
      want: {},
    }),
    harden({
      Collateral: wrongKit.mint.mintPayment(wrongAmount),
    }),
  );
  try {
    await p;
    t.fail('not rejected when it should have been');
  } catch (e) {
    console.log(`yup, it was rejected`);
    t.truthy(true, 'yay rejection');
  }
  // p.then(_ => console.log('oops passed'),
  //       rej => console.log('reg', rej));
  // t.rejects(p, / /, 'addCollateral requires the right kind', {});
  // t.throws(async () => { await p; }, /payment not found for/);
});
