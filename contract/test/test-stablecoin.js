/* global harden */
import '@agoric/install-ses';
import tap from 'tap';
import { E } from '@agoric/eventual-send';
import { makeZoe } from '@agoric/zoe';
import bundleSource from '@agoric/bundle-source';

import produceIssuer from '@agoric/ertp';
import { makeVault } from '../src/vault';

const stablecoinRoot = '../src/stablecoinMachine.js';
const autoswapRoot = '@agoric/zoe/src/contracts/multipoolAutoswap';

function setupAssets(zoe) {
  // setup collateral assets
  const aethKit = produceIssuer('aEth');
  //const { mint: aethMint, amountMath: aethMath } = aethKit;

  // const abtcKit = produceIssuer('aBtc');
  // const { mint: abtcMint, amountMath: abtcMath } = abtcKit;
  return harden({ 
    aethKit,
  })
}

let debugCount = 0;

async function installRoot(zoe, sourceRoot) {
  const contractBundle = await bundleSource(require.resolve(sourceRoot));
  return E(zoe).install(contractBundle);
}

tap.test('first', async t => {
  const zoe = makeZoe();
  console.log('HERE ', debugCount++);
  const autoswapInstall = await installRoot(zoe, autoswapRoot);
  const stablecoinInstall = await installRoot(zoe, stablecoinRoot);
  const { invite: adminInvite } = await E(zoe).makeInstance(stablecoinInstall, {}, { autoswapInstall });
  console.log('HERE ', debugCount++);

  const assets = setupAssets(zoe);
  // console.log("ASSETS ", assets);
  const { aethKit: { mint: aethMint, issuer: aethIssuer, amountMath: aethMath }} = assets;

  const stablecoinKit = await E(zoe).offer(adminInvite);
  const adminHandle = await stablecoinKit.offerHandle;
  const stablecoineMachine = await stablecoinKit.outcome;
  const govMath = await E(stablecoineMachine.governanceIssuer).getAmountMath();
  //const govMath = await stablecoineMachine.stablecoinIssuer;
  // Our wrapper gives us a Vault which holds 5 Collateral, has lent out 10
  // Scones, which uses an autoswap that presents a fixed price of 4 Scones
  // per Collateral.

  const collateralAmount = aethMath.make(99);
  const aethVaultsKit = await E(zoe).offer(
    stablecoineMachine.makeAddTypeInvite(aethIssuer, "AEth", 201),
    harden({
      give: { Collateral: collateralAmount },
      want: { Governance: govMath.getEmpty() },
    }),
    harden({
      Collateral: aethMint.mintPayment(collateralAmount),
    }));

  const aethVaultManager = await aethVaultsKit.outcome;

  // t.ok(cMath.isEqual(vault.getCollateralAmount(), cMath.make(7)),
  //   'vault holds 7 Collateral');




  // const { vault,
  //     liquidationPayout,
  //     liquidate,
  //     sconeKit: { mint: sconeMint, amountMath: sconeMath },
  //     collateralKit: {  mint: cMint, issuer: cIssuer, amountMath: cMath },
  //   } = await offerKit.outcome;
  // t.ok(cMath.isEqual(vault.getCollateralAmount(), cMath.make(5)),
  //      'vault holds 5 Collateral');
  // t.ok(sconeMath.isEqual(vault.getDebtAmount(), sconeMath.make(10)),
  //      'vault lent 10 Scones');

  // // Add more collateral to an existing loan. We get nothing back but a warm
  // // fuzzy feeling.


  // // partially payback
  // const collateralWanted = cMath.make(1);
  // const paybackAmount = sconeMath.make(3);
  // const { payout, outcome } = await E(zoe).offer(
  //   vault.makePaybackInvite(),
  //   harden({
  //     give: { Scones: paybackAmount },
  //     want: { Collateral: collateralWanted },
  //   }),
  //   harden({
  //     Scones: sconeMint.mintPayment(paybackAmount),
  //   }));
  // const message = await outcome;
  // t.equals(message, 'thank you for your payment');

  // const { Collateral: returnedCollateral } = await payout;
  // const returnedAmount = await cIssuer.getAmountOf(returnedCollateral);
  // t.ok(sconeMath.isEqual(vault.getDebtAmount(), sconeMath.make(7)),
  //   'debt reduced to 7 scones');
  // t.ok(cMath.isEqual(vault.getCollateralAmount(), cMath.make(6)),
  //   'vault holds 6 Collateral');
  // t.ok(cMath.isEqual(returnedAmount, cMath.make(1)),
  //   'withdrew 1 collateral');

  // await liquidate();
  
  // const liqRecord = await liquidationPayout;
  // const cLiq = await liqRecord.Collateral;
  // const sLiq = await liqRecord.Scones;
  // const sLiqAmount = await cIssuer.getAmountOf(sLiq);
  // t.ok(sconeMath.isEqual(vault.getDebtAmount(), sconeMath.getEmpty()),
  //   'debt eliminated');
  // t.ok(cMath.isEqual(vault.getCollateralAmount(), cMath.getEmpty()),
  //   'collateral disposed');
  // t.ok(sconeMath.isEqual(sLiqAmount, sconeMath.make(7)),
  //   'remainder returned');
  // t.equals(cLiq, undefined, 'currently we sell all collateral on liquidation');

  //   makeCloseInvite
  t.end();
});
