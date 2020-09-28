// @ts-check
import '@agoric/zoe/src/types';

import { makeIssuerKit } from '@agoric/ertp';

import { assert, details, q } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { makeVault } from '../src/vault';
import { escrowAllTo, paymentFromZCFMint } from '../src/burn';

/**
 * 
 * @param {ContractFacet} zcf
 *
 */
export async function start(zcf) {
  console.log(`contract started`);

  const collateralKit = makeIssuerKit('Collateral');
  const { mint: collateralMint, amountMath: collateralMath, brand: collateralBrand } = collateralKit;
  await zcf.saveIssuer(collateralKit.issuer, 'Collateral'); // todo: CollateralETH, etc

  // const collateralKit = await zcf.makeZCFMint('Collateral');
  // const { amountMath: collateralMath, brand: collateralBrand } = collateralKit.getIssuerRecord();

  const sconeKit = await zcf.makeZCFMint('Scones');
  const { issuer: sconeIssuer, amountMath: sconeMath, brand: sconeBrand } = sconeKit.getIssuerRecord();
  const sconeDebt = sconeMath.make(10);

  const { zcfSeat: collateralSeat, userSeat: liqSeat } = zcf.makeEmptySeatKit();

  const autoswapMock = {
    getInputPrice(amountIn, brandOut) {
      assert.equal(brandOut, sconeBrand);
      return sconeMath.make(4 * amountIn.value);
    },
  };
  const managerMock = {
    getLiquidationMargin() { return 1.2; },
    getInitialMargin() { return 1.5; },
    collateralMath,
    collateralBrand,
  };
  const {
    vault,
    liquidate,
    checkMargin,
  } = makeVault(zcf, managerMock, collateralSeat, sconeDebt, sconeKit, autoswapMock);

  zcf.setTestJig(() => ({ collateralKit, sconeKit, vault }));

  async function makeHook(seat) {
    console.log(`makeHook invoked`, seat);
    // console.log(`-- collateralHoldingOffer is`, collateralSeat);
    const initialCollateralAmount = collateralMath.make(5);
    await escrowAllTo(zcf, collateralSeat,
      { Collateral: initialCollateralAmount },
      { Collateral: collateralMint.mintPayment(initialCollateralAmount) });

    seat.exit();

    return {
      vault,
      liquidationPayout: E(liqSeat).getPayout('Collateral'),
      sconeKit,
      collateralKit,
      actions: {
        liquidate,
        checkMargin,
        add() { return vault.makeAddCollateralInvitation(); },
      },
    };
  }

  console.log(`makeContract returning`);

  const vaultAPI = harden({
    liquidate,
    checkMargin,
    makeAddCollateralInvitation() { return vault.makeAddCollateralInvitation(); },
    mintScones(amount) {
      return paymentFromZCFMint(zcf, sconeKit, amount)
    },
  });

  const testInvitation = zcf.makeInvitation(makeHook, 'foo');
  return harden({ creatorInvitation: testInvitation, creatorFacet: vaultAPI });
}

