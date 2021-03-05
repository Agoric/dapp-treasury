// @ts-check
import '@agoric/zoe/src/types';

import { makeIssuerKit, MathKind } from '@agoric/ertp';

import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';
import { makeFakePriceAuthority } from '@agoric/zoe/tools/fakePriceAuthority';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio';

import { makeVaultKit } from '../src/vault';
import { paymentFromZCFMint } from '../src/burn';

const BASIS_POINTS = 10000n;

/** @param {ContractFacet} zcf */
export async function start(zcf) {
  console.log(`contract started`);

  const collateralKit = makeIssuerKit('Collateral');
  const { amountMath: collateralMath, brand: collateralBrand } = collateralKit;
  await zcf.saveIssuer(collateralKit.issuer, 'Collateral'); // todo: CollateralETH, etc

  // const collateralKit = await zcf.makeZCFMint('Collateral');
  // const { amountMath: collateralMath, brand: collateralBrand } = collateralKit.getIssuerRecord();

  const sconeKit = await zcf.makeZCFMint('Scones');
  const {
    issuer: _sconeIssuer,
    amountMath: sconeMath,
    brand: sconeBrand,
  } = sconeKit.getIssuerRecord();

  const { zcfSeat: _collateralSt, userSeat: liqSeat } = zcf.makeEmptySeatKit();
  const { zcfSeat: stableCoinSeat } = zcf.makeEmptySeatKit();

  /** @type {MultipoolAutoswapPublicFacet} */
  const autoswapMock = {
    getInputPrice(amountIn, brandOut) {
      assert.equal(brandOut, sconeBrand);
      return sconeMath.make(4n * amountIn.value);
    },
  };

  /** @type {InnerVaultManager} */
  const managerMock = {
    getLiquidationMargin() {
      return makeRatio(105n, sconeBrand);
    },
    getInitialMargin() {
      return makeRatio(150n, sconeBrand);
    },
    getLoanFee() {
      return makeRatio(500n, sconeBrand, BASIS_POINTS);
    },
    getInterestRate() {
      return makeRatio(200, sconeBrand, BASIS_POINTS);
    },
    collateralMath,
    collateralBrand,
  };

  const options = {
    mathIn: collateralMath,
    mathOut: sconeMath,
    priceList: [80],
    tradeList: undefined,
    timer: buildManualTimer(console.log),
    quoteMint: makeIssuerKit('quote', MathKind.SET).mint,
  };
  const priceAuthority = makeFakePriceAuthority(options);

  function rewardPoolStaging(amount) {
    return stableCoinSeat.stage({ Scones: amount });
  }

  const { vault, openLoan } = await makeVaultKit(
    zcf,
    managerMock,
    sconeKit,
    autoswapMock,
    priceAuthority,
    rewardPoolStaging,
  );

  zcf.setTestJig(() => ({ collateralKit, sconeKit, vault }));

  async function makeHook(seat) {
    openLoan(seat);

    return {
      vault,
      liquidationPayout: E(liqSeat).getPayout('Collateral'),
      sconeKit,
      collateralKit,
      actions: {
        add() {
          return vault.makeAddCollateralInvitation();
        },
      },
    };
  }

  console.log(`makeContract returning`);

  const vaultAPI = harden({
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
