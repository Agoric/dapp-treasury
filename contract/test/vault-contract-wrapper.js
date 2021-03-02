// @ts-check
import '@agoric/zoe/src/types';

import { makeIssuerKit } from '@agoric/ertp';

import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';
import { makeFakePriceAuthority } from '@agoric/zoe/tools/fakePriceAuthority';
import { makePercent } from '@agoric/zoe/src/contractSupport/percentMath';
import { trade } from '@agoric/zoe/src/contractSupport';
import { makeVaultKit } from '../src/vault';
import { paymentFromZCFMint } from '../src/burn';
import { MathKind } from '../../_agstate/yarn-links/@agoric/ertp';

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
      return makePercent(105n, sconeMath, 100);
    },
    getInitialMargin() {
      return 150n;
    },
    getLoanFee() {
      return makePercent(500n, sconeMath, 10000);
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
