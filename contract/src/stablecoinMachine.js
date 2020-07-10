// The StableCoinMachine owns a number of VaultManagers, and a mint for the
// "Scone" stablecoin.

import { E } from '@agoric/eventual-send';
import makeStore from '@agoric/store';
import produceIssuer from '@agoric/ertp';
import { makeZoeHelpers } from '@agoric/zoe/src/contractSupport';
import { makeVaultManager } from './vaultManager';
import { makeEmptyOfferWithResult } from './make-empty';

async function installRoot(zoe, sourceRoot) {
  const contractBundle = await bundleSource(require.resolve(sourceRoot));
  return E(zoe).install(contractBundle);
}

let debugCount = 1;
function debugTick(msg = '') {
  console.log('SC ', debugCount++, msg);
}
export async function makeContract(zcf) {

  const { trade, checkHook, escrowAndAllocateTo } = makeZoeHelpers(zcf);

  const sconeKit = produceIssuer('scone');
  const { mint: sconeMint, issuer: sconeIssuer, amountMath: sconeMath } = sconeKit;
  const govKit = produceIssuer('governance');
  const { mint: govMint, issuer: govIssuer, amountMath: govMath } = govKit;
  await Promise.all([zcf.addNewIssuer(sconeIssuer, "Scones"),
                     zcf.addNewIssuer(govIssuer, "Governance")]);

  // TODO sinclair+us: is there a scm/gov token per collateralType (joe says yes), or just one?
  const collateralTypes = makeStore(); // Issuer -> xxx

  const {
    publicAPI,
    terms: { autoswapInstall },
  } = zcf.getInstanceRecord();

  const zoe = zcf.getZoeService();
  
  // we assume the multipool-autoswap is public, so folks can buy/sell
  // through it without our involvement
  const { 
    instanceRecord: { publicAPI: autoswapAPI, handle },
  } = await E(zoe).makeInstance(autoswapInstall, { CentralToken: sconeIssuer });
  // console.log("SC:  ", autoswapAPI);
  
  // We process only one offer per collateralType. They must tell us the
  // dollar value of their collateral, and we create that make Scones.
  // collateralKeyword = 'aEth'
  async function makeAddTypeInvite(collateralIssuer, collateralKeyword, rate) {
    assert(!collateralTypes.has(collateralIssuer));
    await zcf.addNewIssuer(collateralIssuer, collateralKeyword);
    const collateralBrand = await collateralIssuer.getBrand();
    
    async function addTypeHook(offerHandle) {

      const {
        proposal: {
          give: { Collateral: collateralIn },
          want: { Governance: govOut }, // ownership of the whole stablecoin machine
        },
      } = zcf.getOffer(offerHandle);
      assert(!collateralTypes.has(collateralIssuer));
      //TODO assert that the collateralIn is of the right brand
      debugTick();
      const sconesAmount = sconeMath.make(rate * collateralIn.extent);
      const govAmount = govMath.make(sconesAmount.extent); //TODO what's the right amount?

      // Create new governance tokens, trade with the incoming offer to 
      // provide them in exchange for the collateral
      const govOfferKit = await makeEmptyOfferWithResult(zcf);
      const govOffer = await govOfferKit.offerHandle;
      console.log(`-- govHoldingOffer is`, govOffer);
      await escrowAndAllocateTo({
        amount: govAmount,
        payment: govMint.mintPayment(govAmount),
        keyword: 'Governance',
        recipientHandle: govOffer,
      });
      trade(
        {
          offerHandle: offerHandle,
          gains: { Governance: govAmount },
        },
        {
          offerHandle: govOffer,
          gains: { Collateral: collateralIn },
        },
      );
      zcf.complete([offerHandle, govOffer]);
      const govPayout = await govOfferKit.payout;
      const collateralPayment= await govPayout.Collateral;
      debugTick();

      // once we've done that, we can put both the collateral and the minted
      // scones into the autoswap, giving us liquidity tokens, which we store

      // TODO: check for existing pool, use it's price instead of the
      // user-provided 'rate'. Or throw an error if it already exists.
      // const collateralBrand = await collateralIn
      const {
        tokenIssuer,
        tokenBrand,
        liquidityIssuer,
        liquidityBrand,
        tokenKeyword,
        liquidityKeyword,
      } = await E(autoswapAPI).addPool(collateralIssuer, collateralKeyword);
      const liquidityMath = await zcf.getAmountMath(liquidityBrand);
      const liquidity = liquidityMath.make;
      debugTick();

      // mint the new scones
      const sconesPayment = sconeMint.mintPayment(sconesAmount);

      // inject both the collateral and the scones into the new autoswap, to
      // provide the initial liquidity pool
      const liqProposal = harden({
        give: { SecondaryToken: collateralIn, CentralToken: sconesAmount },
        want: { Liquidity: liquidityMath.getEmpty() },
      });
      const liqPayments = {
        SecondaryToken: collateralPayment,
        CentralToken: sconesPayment,
      };
      const {
        outcome: liquidityOkP,
        payout: liquidityPayoutP,
      } = await zoe.offer(E(autoswapAPI).makeAddLiquidityInvite(), liqProposal, liqPayments);
      debugTick();

      // const { payout: salesPayoutP } = await E(zoe).offer(swapInvite, saleOffer, payout2);
      // const { Scones: sconeProceeds, ...otherProceeds } = await salesPayoutP;

      // do something with the liquidity we just bought
      const vm = makeVaultManager(zcf, autoswapAPI, sconeKit, collateralBrand);
      // TODO add vm to table of vault manager
      return vm;
    }

    const expected = harden({
      give: { Collateral: null },
      want: { Governance: null },
    });
    return zcf.makeInvitation(checkHook(addTypeHook, expected), 'add a new kind of collateral to the machine');
  }

  function recapitalizeHook(offerHandle) {
    const {
      proposal: {
        give: { Collateral: collateralIn },
        want: { Governance: govOut }, // ownership of the whole stablecoin machine
      },
    } = zcf.getOffer(offerHandle);
    assert(collateralTypes.has(collateralIn.ISSUER));

  }
  function makeRecapitalizeInvite() {
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

  const stablecoinMachine = harden({
    makeAddTypeInvite,
    stablecoinIssuer: sconeIssuer,
    governanceIssuer: govIssuer,
    autoswap: autoswapAPI,
    // for status/debugging
  });

  return zcf.makeInvitation(handle => stablecoinMachine, 'stablecoin admin');
}

