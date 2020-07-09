/* global harden */
import '@agoric/install-ses';
import tap from 'tap';
import { E } from '@agoric/eventual-send';
import { makeZoe } from '@agoric/zoe';
import bundleSource from '@agoric/bundle-source';

import produceIssuer from '@agoric/ertp';
import { makeVault } from '../src/vault';

async function setup(zoe) {
  const contractBundle = await bundleSource(require.resolve('./vault-contract-wrapper.js'));
  const installationHandle = await E(zoe).install(contractBundle);
  const { invite: adminInvite } = await E(zoe).makeInstance(installationHandle);
  return E(zoe).offer(adminInvite);
}

tap.test('first', async t => {
  const zoe = makeZoe();
  const offerKit = await setup(zoe);

  // Our wrapper gives us a Vault which holds 5 Collateral, has lent out 10
  // Scones, which uses an autoswap that presents a fixed price of 4 Scones
  // per Collateral.

  const { vault,
        sconeKit: { mint: sconeMint, amountMath: sconeMath },
          collateralKit: {  mint: cMint, issuer: cIssuer, amountMath: cMath },
        } = await offerKit.outcome;
  t.ok(cMath.isEqual(vault.getCollateralAmount(), cMath.make(5)),
       'vault holds 5 Collateral');
  t.ok(sconeMath.isEqual(vault.getDebtAmount(), sconeMath.make(10)),
       'vault lent 10 Scones');

  // Add more collateral to an existing loan. We get nothing back but a warm
  // fuzzy feeling.

  const collateralAmount = cMath.make(2);
  await E(zoe).offer(
    vault.makeAddCollateralInvite(),
    harden({ 
      give: { Collateral: collateralAmount },
      want: { }, //Scones: sconeMath.make(2) },
    }),
    harden({
      Collateral: cMint.mintPayment(collateralAmount),
    }));

  t.ok(cMath.isEqual(vault.getCollateralAmount(), cMath.make(7)),
    'vault holds 7 Collateral');

  // partially payback
  const collateralWanted = cMath.make(1);
  const paybackAmount = sconeMath.make(3);
  const { payout, outcome } = await E(zoe).offer(
    vault.makePaybackInvite(),
    harden({
      give: { Scones: paybackAmount },
      want: { Collateral: collateralWanted },
    }),
    harden({
      Scones: sconeMint.mintPayment(paybackAmount),
    }));
  const message = await outcome;
  t.equals(message, 'thank you for your payment');

  const { Collateral: returnedCollateral } = await payout;
  const returnedAmount = await cIssuer.getAmountOf(returnedCollateral);
  t.ok(sconeMath.isEqual(vault.getDebtAmount(), sconeMath.make(7)),
    'debt reduced to 7 scones');
  t.ok(cMath.isEqual(vault.getCollateralAmount(), cMath.make(6)),
    'vault holds 6 Collateral');
  t.ok(cMath.isEqual(returnedAmount, cMath.make(1)),
    'withdrew 1 collateral');

  //   makeCloseInvite
  t.end();
});

tap.test('bad collateral', async t => {
  const zoe = makeZoe();
  const offerKit = await setup(zoe);

  // Our wrapper gives us a Vault which holds 5 Collateral, has lent out 10
  // Scones, which uses an autoswap that presents a fixed price of 4 Scones
  // per Collateral.

  const { vault,
    sconeKit: { amountMath: sconeMath },
    collateralKit: { mint: cMint, amountMath: cMath },
  } = await offerKit.outcome;
  t.ok(cMath.isEqual(vault.getCollateralAmount(), cMath.make(5)),
    'vault holds 5 Collateral');
  t.ok(sconeMath.isEqual(vault.getDebtAmount(), sconeMath.make(10)),
    'vault lent 10 Scones');

  const collateralAmount = cMath.make(2);

  // adding the wrong kind of collateral should be rejected
  const wrongKit = produceIssuer('wrong');
  const wrongAmount = wrongKit.amountMath.make(2);
  const p = E(zoe).offer(vault.makeAddCollateralInvite(),
    harden({
      give: { Collateral: collateralAmount },
      want: {},
    }),
    harden({
      Collateral: wrongKit.mint.mintPayment(wrongAmount),
    }));
  try {
    await p;
    t.fail('not rejected when it should have been');
  } catch (e) {
    console.log(`yup, it was rejected`);
    t.ok(true, 'yay rejection');
  }
  //p.then(_ => console.log('oops passed'),
  //       rej => console.log('reg', rej));
  //t.rejects(p, / /, 'addCollateral requires the right kind', {});
  //t.throws(async () => { await p; }, /payment not found for/);

  t.end();
});
