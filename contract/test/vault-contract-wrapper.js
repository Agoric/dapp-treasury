// @ts-check
import '@agoric/zoe/src/types';

import { makeIssuerKit } from '@agoric/ertp';

import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';
import { makeFakePriceAuthority } from '@agoric/zoe/tools/fakePriceAuthority';
import { makeNotifierKit } from '@agoric/notifier';
import { makeVault } from '../src/vault';
import { escrowAllTo, paymentFromZCFMint } from '../src/burn';
import { MathKind } from '../../_agstate/yarn-links/@agoric/ertp';

/** @param {ContractFacet} zcf */
export async function start(zcf) {
  console.log(`contract started`);

  const collateralKit = makeIssuerKit('Collateral');
  const {
    mint: collateralMint,
    amountMath: collateralMath,
    brand: collateralBrand,
  } = collateralKit;
  await zcf.saveIssuer(collateralKit.issuer, 'Collateral'); // todo: CollateralETH, etc

  // const collateralKit = await zcf.makeZCFMint('Collateral');
  // const { amountMath: collateralMath, brand: collateralBrand } = collateralKit.getIssuerRecord();

  const sconeKit = await zcf.makeZCFMint('Scones');
  const {
    issuer: _sconeIssuer,
    amountMath: sconeMath,
    brand: sconeBrand,
  } = sconeKit.getIssuerRecord();
  const sconeDebt = sconeMath.make(10);

  const { zcfSeat: collateralSeat, userSeat: liqSeat } = zcf.makeEmptySeatKit();

  const autoswapMock = {
    getInputPrice(amountIn, brandOut) {
      assert.equal(brandOut, sconeBrand);
      return sconeMath.make(4 * amountIn.value);
    },
  };
  const managerMock = {
    getLiquidationMargin() {
      return 1.2;
    },
    getInitialMargin() {
      return 1.5;
    },
    getStabilityFee() {
      return 0.02;
    },
    collateralMath,
    collateralBrand,
  };

  const options = {
    mathIn: collateralMath,
    mathOut: sconeMath,
    priceList: [80],
    tradeList: null,
    timer: buildManualTimer(console.log),
    quoteMint: makeIssuerKit('quote', MathKind.SET).mint,
  };
  const priceAuthority = makeFakePriceAuthority(options);

  const { updater, notifier: uiNotifier } = makeNotifierKit();
  const { vault, liquidate, checkMargin } = makeVault(
    zcf,
    managerMock,
    collateralSeat,
    sconeDebt,
    sconeKit,
    autoswapMock,
    priceAuthority,
    updater,
  );

  zcf.setTestJig(() => ({ collateralKit, sconeKit, vault, uiNotifier }));

  async function makeHook(seat) {
    console.log(`makeHook invoked`, seat);
    // console.log(`-- collateralHoldingOffer is`, collateralSeat);
    const initialCollateralAmount = collateralMath.make(5);
    await escrowAllTo(
      zcf,
      collateralSeat,
      { Collateral: initialCollateralAmount },
      { Collateral: collateralMint.mintPayment(initialCollateralAmount) },
    );

    seat.exit();

    return {
      vault,
      liquidationPayout: E(liqSeat).getPayout('Collateral'),
      sconeKit,
      collateralKit,
      actions: {
        liquidate,
        checkMargin,
        add() {
          return vault.makeAddCollateralInvitation();
        },
      },
    };
  }

  console.log(`makeContract returning`);

  const vaultAPI = harden({
    liquidate,
    checkMargin,
    makeAddCollateralInvitation() {
      return vault.makeAddCollateralInvitation();
    },
    mintScones(amount) {
      return paymentFromZCFMint(zcf, sconeKit, amount);
    },
  });

  const testInvitation = zcf.makeInvitation(makeHook, 'foo');
  return harden({ creatorInvitation: testInvitation, creatorFacet: vaultAPI });
}
