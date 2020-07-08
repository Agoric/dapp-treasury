/* global harden */
import '@agoric/install-ses';
import tap from 'tap';
import { E } from '@agoric/eventual-send';
import { makeZoe } from '@agoric/zoe';
import bundleSource from '@agoric/bundle-source';

import produceIssuer from '@agoric/ertp';
import { makeVault } from '../src/vault';

tap.test('first', async t => {
  const zoe = makeZoe();
  const inviteIssuer = await E(zoe).getInviteIssuer();
  const contractBundle = await bundleSource(require.resolve('./vault-contract-wrapper.js'));
  const installationHandle = await E(zoe).install(contractBundle);
  const { invite: adminInvite, instanceRecord } = await E(zoe).makeInstance(installationHandle);
  const r = await E(zoe).offer(adminInvite);
  //console.log(`r is `, r);

  // Our wrapper gives us a Vault which holds 5 Collateral, has lent out 10
  // Scones, which uses an autoswap that presents a fixed price of 4 Scones
  // per Collateral.

  const { vault,
          sconeStuff: { amountMath: sconeMath },
          collateralStuff: { mint: cMint,
                             amountMath: cMath,
                           },
        } = await r.outcome;
  //await E(outcome).go();
  t.ok(cMath.isEqual(vault.getCollateralAmount(), cMath.make(5)),
       'vault holds 5 Collateral');
  t.ok(sconeMath.isEqual(vault.getDebtAmount(), sconeMath.make(10)),
       'vault lent 10 Scones');

  // Add more collateral to an existing loan. We get nothing back but a warm
  // fuzzy feeling.

  const addInvite = vault.makeAddCollateralInvite();
  const collateralAmount = cMath.make(2);
  await E(zoe).offer(addInvite,
                     harden({ give: { Collateral: collateralAmount },
                              want: { }, //Scones: sconeMath.make(2) },
                            }),
                     harden({
                       Collateral: cMint.mintPayment(collateralAmount),
                     }));

  t.ok(cMath.isEqual(vault.getCollateralAmount(), cMath.make(7)),
       'vault holds 7 Collateral');

  // adding the wrong kind of collateral should be rejected
  const wrong = produceIssuer('wrong');

  const wrongAmount = wrong.amountMath.make(2);
  const p = E(zoe).offer(vault.makeAddCollateralInvite(),
                         harden({ give: { Collateral: collateralAmount },
                                  want: { },
                                }),
                         harden({
                           Collateral: wrong.mint.mintPayment(wrongAmount),
                         }));
  try {
    await p;
    t.fail('not rejected when it should have been');
  } catch(e) {
    console.log(`yup, it was rejected`);
    t.ok(true, 'yay rejection');
  }
  //p.then(_ => console.log('oops passed'),
  //       rej => console.log('reg', rej));
  //t.rejects(p, / /, 'addCollateral requires the right kind', {});
  //t.throws(async () => { await p; }, /payment not found for/);

  t.end();
});
