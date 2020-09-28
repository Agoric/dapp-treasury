// @ts-check
import '@agoric/zoe/exported';
import '@agoric/zoe/src/contracts/exported';
// The StableCoinMachine owns a number of VaultManagers, and a mint for the
// "Scone" stablecoin.


import { E } from '@agoric/eventual-send';
import { assert, details, q } from '@agoric/assert';
import makeStore from '@agoric/store';
import { makeTracer } from '../src/makeTracer';

import {makeIssuerKit} from '@agoric/ertp';
import { trade, assertProposalShape } from '@agoric/zoe/src/contractSupport';
import { makeVaultManager } from './vaultManager';
import { makeEmptyOfferWithResult } from './make-empty';
import { offerTo } from './burn';

 /*
 * @param { Zoe } zoe
 * @param {string} sourceRoot
 */

const trace = makeTracer("ST");

/**
 * @type {ContractStartFn}
 */
export async function start(zcf) {
  const {
    autoswapInstall,
  } = zcf.getTerms();

  trace("terms", autoswapInstall);

  const [sconeMint, govMint] = await Promise.all([
        zcf.makeZCFMint('Scones'), 
        zcf.makeZCFMint('Governance')]);
  const { issuer: sconeIssuer, amountMath: sconeMath, brand: sconeBrand } = sconeMint.getIssuerRecord();
  const { issuer: govIssuer, amountMath: govMath, brand: govBrand } = govMint.getIssuerRecord();

  // TODO sinclair+us: is there a scm/gov token per collateralType (joe says yes), or just one?
  const collateralTypes = makeStore(); // Issuer -> xxx

  const zoe = zcf.getZoeService();
  
  // we assume the multipool-autoswap is public, so folks can buy/sell
  // through it without our involvement
  // Should it use creatorFacet, creatorInvitation, instance?
  /** @type {{ publicFacet: MultipoolAutoswap}} */
  const { publicFacet: autoswapAPI } = await E(zoe).startInstance(autoswapInstall, { Central: sconeIssuer });
  trace("autoswap", autoswapAPI);

  // We process only one offer per collateralType. They must tell us the
  // dollar value of their collateral, and we create that make Scones.
  // collateralKeyword = 'aEth'
  async function makeAddTypeInvitation(collateralIssuer, collateralKeyword, rate) {
    // TODO add to the issuer in the same turn
    assert(!collateralTypes.has(collateralIssuer));
    await zcf.saveIssuer(collateralIssuer, collateralKeyword);
    const collateralBrand = zcf.getBrandForIssuer(collateralIssuer);
    trace("collateralBrand", collateralBrand);

    async function addTypeHook(seat) {
      assertProposalShape(seat, {
        give: { Collateral: null },
        want: { Governance: null },
      });
      const {
        give: { Collateral: collateralIn },
        want: { Governance: govOut }, // ownership of the whole stablecoin machine
      } = seat.getProposal();
      assert(!collateralTypes.has(collateralIssuer));
      //TODO assert that the collateralIn is of the right brand
      trace("add collateral", collateralIn);
      const sconesAmount = sconeMath.make(rate * collateralIn.value);
      const govAmount = govMath.make(sconesAmount.value); //TODO what's the right amount?
      trace("math", sconesAmount);

      // Create new governance tokens, trade with the incoming offer to 
      // provide them in exchange for the collateral
      const { zcfSeat: govSeat } = zcf.makeEmptySeatKit();
      // TODO this should create the seat for us
      govMint.mintGains({ Governance: govAmount }, govSeat);
      trace("mint governance", govAmount);

      // trade the governance tokens for collateral, putting the 
      // collateral on Secondary to be positioned for Autoswap
      trade(zcf, 
        { seat,
          gains: { Governance: govAmount },
          losses: { Collateral: collateralIn },
        },
        { seat: govSeat,
          gains: { Secondary: collateralIn },
        },
      );
      // the collateral is now on the temporary seat
      // govSeat.exit();
      trace("traded");

      // once we've done that, we can put both the collateral and the minted
      // scones into the autoswap, giving us liquidity tokens, which we store

      // mint the new scones to teh Central position on the govSet
      // so we can setup the autoswap pool
      sconeMint.mintGains({ Central: sconesAmount }, govSeat);
      trace("prepped");

      // TODO: check for existing pool, use it's price instead of the
      // user-provided 'rate'. Or throw an error if it already exists.
      // `addPool` should combine initial liquidity with pool setup

      const liquidityIssuer = await E(autoswapAPI).addPool(collateralIssuer, collateralKeyword);
      const { brand: liquidityBrand, amountMath: liquidityMath} 
        = await zcf.saveIssuer(liquidityIssuer, `${collateralKeyword}_Liquidity`);
      trace("pool setup", liquidityMath);

      // inject both the collateral and the scones into the new autoswap, to
      // provide the initial liquidity pool
      // TODO I'm here in the conversion
      const liqProposal = harden({
        give: { Secondary: collateralIn, Central: sconesAmount },
        want: { Liquidity: liquidityMath.getEmpty() },
      });
      const liqInvitation = E(autoswapAPI).makeAddLiquidityInvitation();
      trace("liq prep", liqInvitation, liqProposal);
      const poolSeat = await offerTo(zcf, liqInvitation, govSeat, liqProposal, govSeat);
      // isComplete: () => done
      trace("liquidity setup");

      // const { payout: salesPayoutP } = await E(zoe).offer(swapInvitation, saleOffer, payout2);
      // const { Scones: sconeProceeds, ...otherProceeds } = await salesPayoutP;

      // do something with the liquidity we just bought
      const vm = makeVaultManager(zcf, autoswapAPI, sconeMint, collateralBrand);
      // TODO add vm to table of vault manager
      return vm;
    }

    return zcf.makeInvitation(addTypeHook, 'add a new kind of collateral to the machine');
  }

  function recapitalizeHook(seat) {
    const {
      give: { Collateral: collateralIn },
      want: { Governance: govOut }, // ownership of the whole stablecoin machine
    } = seat.getProposal();
    assert(collateralTypes.has(collateralIn.ISSUER));

  }
  function makeRecapitalizeInvitation() {
  }
  // this overarching SCM holds ownershipTokens in the individual per-type
  // vaultManagers

  // one exposed (but closely held) method is to add a brand new collateral
  // type. This gets to specify the initial exchange rate
  // function invest_new(collateral, price) -> govTokens

  // a second closely held method is to add a collateral type for which there
  // was an existing pool. We ask the pool for the current price, and then
  // call x_new(). The price will be stale, but it's the same kind of stale
  // as addLiquidity
  //function invest_existing(collateral) -> govTokens

  // govTokens entitle you to distributions, but you can't redeem them
  // outright, that would drain the utility form the economy


  zcf.setTestJig(() => ({
    stablecoin: sconeMint.getIssuerRecord(),
    governance: govMint.getIssuerRecord(),
    autoswap: autoswapAPI,
  }));
  
  /** @type {StablecoinMachine} */
  const stablecoinMachine = harden({
    makeAddTypeInvitation,
  });
return harden({ creatorFacet: stablecoinMachine });
}

