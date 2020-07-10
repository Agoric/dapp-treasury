/* global harden */
import '@agoric/install-ses';
import tap from 'tap';
import { E } from '@agoric/eventual-send';
import { makeZoe } from '@agoric/zoe';
import bundleSource from '@agoric/bundle-source';

import produceIssuer from '@agoric/ertp';

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
  const sconeIssuer = stablecoineMachine.stablecoinIssuer;
  const sconeMath = await E(sconeIssuer).getAmountMath();
  //const govMath = await stablecoineMachine.stablecoinIssuer;
  // Our wrapper gives us a Vault which holds 5 Collateral, has lent out 10
  // Scones, which uses an autoswap that presents a fixed price of 4 Scones
  // per Collateral.

  // Add a pool with 99 aeth collateral at a 201 aeth/scones rate
  const capitalAmount = aethMath.make(99);
  const aethVaultsKit = await E(zoe).offer(
    stablecoineMachine.makeAddTypeInvite(aethIssuer, "AEth", 201),
    harden({
      give: { Collateral: capitalAmount },
      want: { Governance: govMath.getEmpty() },
    }),
    harden({
      Collateral: aethMint.mintPayment(capitalAmount),
    }));

  const aethVaultManager = await aethVaultsKit.outcome;

  // Create a loan for 47 scones with 11 aeth collateral
  const collateralAmount = aethMath.make(11);
  const loanAmount = sconeMath.make(47);
  const loanKit = await E(zoe).offer(
    aethVaultManager.makeLoanInvite(),
    harden({
      give: { Collateral: collateralAmount },
      want: { Scones: loanAmount },
    }),
    harden({
      Collateral: aethMint.mintPayment(collateralAmount),
    }));

  const {
    vault,
    liquidationPayout,
  } = await loanKit.outcome;
  t.ok(sconeMath.isEqual(vault.getDebtAmount(), loanAmount),
    'vault lent 47 Scones');

  const loanProceeds = await loanKit.payout;
  const sconesLent = await loanProceeds.Scones;
  const lentAmount = await sconeIssuer.getAmountOf(sconesLent);
  t.ok(sconeMath.isEqual(lentAmount, loanAmount), 'received 47 Scones');
  t.ok(aethMath.isEqual(vault.getCollateralAmount(), aethMath.make(11)),
       'vault holds 11 Collateral');

  // Add more collateral to an existing loan. We get nothing back but a warm
  // fuzzy feeling.

  // partially payback
  const collateralWanted = aethMath.make(1);
  const paybackAmount = sconeMath.make(5);
  const [paybackPayment, remainingPayment] = await E(sconeIssuer).split(sconesLent, paybackAmount);
  const { payout, outcome } = await E(zoe).offer(
    vault.makePaybackInvite(),
    harden({
      give: { Scones: paybackAmount },
      want: { Collateral: collateralWanted },
    }),
    harden({
      Scones: paybackPayment,
    }));
  const message = await outcome;
  t.equals(message, 'thank you for your payment');

  const { Collateral: returnedCollateral } = await payout;
  const returnedAmount = await aethIssuer.getAmountOf(returnedCollateral);
  t.ok(sconeMath.isEqual(vault.getDebtAmount(), sconeMath.make(42)),
    'debt reduced to 42 scones');
  t.ok(aethMath.isEqual(vault.getCollateralAmount(), aethMath.make(10)),
    'vault holds 10 Collateral');
  t.ok(aethMath.isEqual(returnedAmount, aethMath.make(1)),
    'withdrew 1 collateral');

  await aethVaultManager.liquidateAll();
  console.log("DEBT ", vault.getDebtAmount());
  t.ok(sconeMath.isEmpty(vault.getDebtAmount()), 'debt is paid off');
  console.log("COLLATERAL ", vault.getCollateralAmount());
  t.ok(aethMath.isEmpty(vault.getCollateralAmount()), 'vault is cleared');
  // t.ok(aethMath.isEqual(returnedAmount, aethMath.make(1)),
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

  // Yucky too many promise layers:
  // const { Scones: sconesLent } = await loanKit.payout;
  // console.log("GGR", sconesLent);
  // const lentAmount = await sconeIssuer.getAmountOf(sconesLent);
  // became
  // const sconesLent = await loanProceeds.Scones;
  // const lentAmount = await sconeIssuer.getAmountOf(sconesLent);
  // t.ok(sconeMath.isEqual(lentAmount, loanAmount), 'received 47 Scones');

  t.end();
});
