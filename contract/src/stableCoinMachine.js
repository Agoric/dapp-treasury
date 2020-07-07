// The StableCoinMachine owns a number of VaultManagers, and a mint for the
// "Scone" stablecoin.

import { E } from '@agoric/eventual-send';
import produceIssuer from '@agoric/ertp';

function makeStableCoinMachine(zcf, multiPoolAutoSwapInstallHandle) {
  const { mint: sconeMint, issuer: sconeIssuer, amountMath: sconeMath } = produceIssuer('scone');
  const { mint: govMint, issuer: govIssuer, amountMath: govMath } = produceIssuer('governance');
  // TODO sinclair+us: is there a scm/gov token per collateralType (joe says yes), or just one?
  const collateralTypes = Map(); // Issuer -> xxx

  const mp = E(zoe).install(multiPoolAutoSwapInstallHandle);
  const mpAPI = xx;

  // We process only one offer per collateralType. They must tell us the
  // dollar value of their collateral, and we create that make Scones.
  // collateralKeyword = 'aEth'
  function makeAddTypeInvite(collateralIssuer, collateralKeyword, rate) {
    assert(!collateralTypes.has(collateralIssuer));
    function addTypeHook(offerHandle) {
      const { 
        proposal: {
          give: { Collateral: collateralIn },
          want: { Governance: govOut }, // ownership of the whole stablecoin machine
        },
      } = zcf.getOffer(offerHandle);
      assert(!collateralTypes.has(collateralIn.ISSUER));
      const newScones = rate * collateralIn.amount;
      const newGov = newScones; // TODO joe

      const vm = create_vault_manager(..);

      
      // first, we create the new governance tokens, satisfy the offer, then
      // we get the collateral.

      // once we've done that, we can put both the collateral and the minted
      // scones into the autoswap, giving us liquidity tokens, which we store

      // TODO: check for existing pool, use it's price instead of the
      // user-provided 'rate'. Or throw an error if it already exists.
      const autoswap = E(mpAPI).addPool(collateralIn.ISSUER, collateralKeyword);
      // mint the new scones
      const sconesPayment = sconeMint.mintPayment(sconeMath.make(newScones));

      // inject both the collateral and the scones into the new autoswap, to
      // provide the initial liquidity pool
      E(autoswap).something(sconesPayment, ... "magic to extract the collateral from the offer");

      // do something with the liquidity we just bought

      
    }

    return zcf.makeInvitation(addTypeHook, 'add a new kind of collateral to the machine');
  }


  function makeRecapitalizeInvite() {
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

}

