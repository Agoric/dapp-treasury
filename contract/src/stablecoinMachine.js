// @ts-check
import '@agoric/zoe/exported';
import '@agoric/zoe/src/contracts/exported';

// The StableCoinMachine owns a number of VaultManagers, and a mint for the
// "Scone" stablecoin.
import { E } from '@agoric/eventual-send';
import { assert, details } from '@agoric/assert';
import makeStore from '@agoric/store';
import {
  trade,
  assertProposalShape,
  offerTo,
  getAmountOut,
  getAmountIn,
} from '@agoric/zoe/src/contractSupport';

import {
  multiplyBy,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport/ratio';
import { makeTracer } from './makeTracer';
import { makeVaultManager } from './vaultManager';

const trace = makeTracer('ST');

/** @type {ContractStartFn} */
export async function start(zcf) {
  // loanParams has time limits for charging interest
  const {
    autoswapInstall,
    priceAuthority,
    loanParams,
    timerService,
  } = zcf.getTerms();

  const [sconeMint, govMint] = await Promise.all([
    zcf.makeZCFMint('Scones', undefined, { decimalPlaces: 3 }),
    zcf.makeZCFMint('Governance', undefined, { decimalPlaces: 6 }),
  ]);
  const {
    issuer: sconeIssuer,
    amountMath: sconeMath,
    brand: sconeBrand,
  } = sconeMint.getIssuerRecord();

  const {
    issuer: _govIssuer,
    amountMath: govMath,
    brand: _govBrand,
  } = govMint.getIssuerRecord();

  // This is a stand-in for a reward pool. For now, it's a place to squirrel
  // away fees so the tests show that the funds have been removed.
  const { zcfSeat: rewardPoolSeat } = zcf.makeEmptySeatKit();

  // We provide an easy way for the vaultManager and vaults to add rewards to
  // this seat, with directly exposing the seat to them.
  function stageReward(amount) {
    const priorReward = rewardPoolSeat.getAmountAllocated('Scones', sconeBrand);
    return rewardPoolSeat.stage({ Scones: sconeMath.add(priorReward, amount) });
  }

  // TODO sinclair+us: is there a scm/gov token per collateralType (joe says yes), or just one?
  /** @type {Store<Brand,VaultManager>} */
  const collateralTypes = makeStore(); // Brand -> vaultManager

  const zoe = zcf.getZoeService();

  // we assume the multipool-autoswap is public, so folks can buy/sell
  // through it without our involvement
  // Should it use creatorFacet, creatorInvitation, instance?
  /** @type {{ publicFacet: MultipoolAutoswapPublicFacet, instance: Instance}} */
  const { publicFacet: autoswapAPI, instance: autoswapInstance } = await E(
    zoe,
  ).startInstance(autoswapInstall, { Central: sconeIssuer });

  // We process only one offer per collateralType. They must tell us the
  // dollar value of their collateral, and we create that many Scones.
  // collateralKeyword = 'aEth'
  async function makeAddTypeInvitation(
    collateralIssuer,
    collateralKeyword,
    rates,
  ) {
    await zcf.saveIssuer(collateralIssuer, collateralKeyword);
    const collateralBrand = zcf.getBrandForIssuer(collateralIssuer);
    assert(!collateralTypes.has(collateralBrand));

    async function addTypeHook(seat) {
      assertProposalShape(seat, {
        give: { Collateral: null },
        want: { Governance: null },
      });
      const {
        give: { Collateral: collateralIn },
        want: { Governance: _govOut }, // ownership of the whole stablecoin machine
      } = seat.getProposal();
      assert(!collateralTypes.has(collateralBrand));
      // TODO check that hte collateral is of the expected type
      // of restructure so that's not an issue
      // TODO assert that the collateralIn is of the right brand
      trace('add collateral', collateralIn);
      const sconesAmount = multiplyBy(collateralIn, rates.initialPrice);
      const govAmount = govMath.make(sconesAmount.value); // TODO what's the right amount?

      // Create new governance tokens, trade them with the incoming offer for
      // collateral. The offer uses the keywords Collateral and Governance.
      // govSeat stores the collateral as Secondary. We then mint new Scones for
      // govSeat and store them as Central. govSeat then creates a liquidity
      // pool for autoswap, trading in Central and Secondary for governance
      // tokens as Liquidity. These governance tokens are held by govSeat
      const { zcfSeat: govSeat } = zcf.makeEmptySeatKit();
      // TODO this should create the seat for us
      govMint.mintGains({ Governance: govAmount }, govSeat);

      // trade the governance tokens for collateral, putting the
      // collateral on Secondary to be positioned for Autoswap
      trade(
        zcf,
        {
          seat,
          gains: { Governance: govAmount },
          losses: { Collateral: collateralIn },
        },
        { seat: govSeat, gains: { Secondary: collateralIn } },
      );
      // the collateral is now on the temporary seat

      // once we've done that, we can put both the collateral and the minted
      // scones into the autoswap, giving us liquidity tokens, which we store

      // mint the new scones to the Central position on the govSeat
      // so we can setup the autoswap pool
      sconeMint.mintGains({ Central: sconesAmount }, govSeat);

      // TODO: check for existing pool, use its price instead of the
      // user-provided 'rate'. Or throw an error if it already exists.
      // `addPool` should combine initial liquidity with pool setup

      const liquidityIssuer = await E(autoswapAPI).addPool(
        collateralIssuer,
        collateralKeyword,
      );
      const { amountMath: liquidityMath } = await zcf.saveIssuer(
        liquidityIssuer,
        `${collateralKeyword}_Liquidity`,
      );

      // inject both the collateral and the scones into the new autoswap, to
      // provide the initial liquidity pool
      const liqProposal = harden({
        give: { Secondary: collateralIn, Central: sconesAmount },
        want: { Liquidity: liquidityMath.getEmpty() },
      });
      const liqInvitation = E(autoswapAPI).makeAddLiquidityInvitation();

      const { deposited } = await offerTo(
        zcf,
        liqInvitation,
        undefined,
        liqProposal,
        govSeat,
      );

      const depositValue = await deposited;

      // TODO(hibbert): make use of these assets (Liquidity: 19899 Aeth)
      trace('depositValue', depositValue);

      // const { payout: salesPayoutP } = await E(zoe).offer(swapInvitation, saleOffer, payout2);
      // const { Scones: sconeProceeds, ...otherProceeds } = await salesPayoutP;

      // do something with the liquidity we just bought
      const vm = makeVaultManager(
        zcf,
        autoswapAPI,
        sconeMint,
        collateralBrand,
        priceAuthority,
        rates,
        stageReward,
        timerService,
        loanParams,
      );
      collateralTypes.init(collateralBrand, vm);
      return vm;
    }

    return zcf.makeInvitation(
      addTypeHook,
      'add a new kind of collateral to the machine',
    );
  }

  /**
   * Make a loan in the vaultManager based on the collateral type.
   */
  function makeLoanInvitation() {
    /**
     * @param {ZCFSeat} seat
     */
    async function makeLoanHook(seat) {
      assertProposalShape(seat, {
        give: { Collateral: null },
        want: { Scones: null },
      });
      const {
        give: { Collateral: collateralAmount },
      } = seat.getProposal();
      const { brand: brandIn } = collateralAmount;
      assert(
        collateralTypes.has(brandIn),
        details`Not a supported collateral type ${brandIn}`,
      );
      /** @type {VaultManager} */
      const mgr = collateralTypes.get(brandIn);
      return mgr.makeLoanKit(seat);
    }

    return zcf.makeInvitation(makeLoanHook, 'make a loan');
  }

  // function recapitalizeHook(seat) {
  //   const {
  //     give: { Collateral: collateralIn },
  //     want: { Governance: govOut }, // ownership of the whole stablecoin machine
  //   } = seat.getProposal();
  //   assert(collateralTypes.has(collateralIn.ISSUER));
  // }

  // function makeRecapitalizeInvitation() {}

  // this overarching SCM holds ownershipTokens in the individual per-type
  // vaultManagers

  // one exposed (but closely held) method is to add a brand new collateral
  // type. This gets to specify the initial exchange rate
  // function invest_new(collateral, price) -> govTokens

  // a second closely held method is to add a collateral type for which there
  // was an existing pool. We ask the pool for the current price, and then
  // call x_new(). The price will be stale, but it's the same kind of stale
  // as addLiquidity
  // function invest_existing(collateral) -> govTokens

  // govTokens entitle you to distributions, but you can't redeem them
  // outright, that would drain the utility from the economy

  zcf.setTestJig(() => ({
    stablecoin: sconeMint.getIssuerRecord(),
    governance: govMint.getIssuerRecord(),
    autoswap: autoswapAPI,
  }));

  async function getCollaterals() {
    // should be collateralTypes.map((vm, brand) => ({
    return harden(
      Promise.all(
        collateralTypes.entries().map(async ([brand, vm]) => {
          const priceQuote = await vm.getCollateralQuote();
          return {
            brand,
            liquidationMargin: vm.getLiquidationMargin(),
            initialMargin: vm.getInitialMargin(),
            stabilityFee: vm.getLoanFee(),
            marketPrice: makeRatioFromAmounts(
              getAmountOut(priceQuote),
              getAmountIn(priceQuote),
            ),
          };
        }),
      ),
    );
  }

  // Eventually the reward pool will live elsewhere. For now it's here for
  // bookkeeping. It's needed in tests.
  function getRewardAllocation() {
    return rewardPoolSeat.getCurrentAllocation();
  }

  const publicFacet = harden({
    getAMM() {
      return autoswapInstance;
    },
    makeLoanInvitation,
    getCollaterals,
    // TODO this is in the terms, so could be retrieved from there.
    // This API is here to consider for usability/discoverability
    getSconeIssuer() {
      return sconeIssuer;
    },
  });

  /** @type {StablecoinMachine} */
  const stablecoinMachine = harden({
    makeAddTypeInvitation,
    getAMM() {
      return autoswapInstance;
    },
    getCollaterals,
    getRewardAllocation,
  });

  return harden({ creatorFacet: stablecoinMachine, publicFacet });
}
