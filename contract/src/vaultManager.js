/* global harden */
import { assert, details, q } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { makeZoeHelpers } from '@agoric/zoe/contractSupport';
import { makeVault } from './vault';
import { makeEmptyOfferWithResult } from './make-empty';

// Each VaultManager manages a single collateralType. It owns an autoswap
// instance which trades this collateralType against Scones. It also manages
// some number of outstanding loans, each called a Vault, for which the
// collateral is provided in exchanged for borrowed Scones.

// todo: two timers: one to increment fees, second (not really timer) when
// the autoswap price changes, to check if we need to liquidate

export function makeVaultManager(zcf, autoswap, sconeStuff) {
  const { mint: sconeMint, issuer: sconeIssuer, amountMath: sconeMath } = sconeStuff;
  const {
    trade,
    makeEmptyOffer,
    checkHook,
    escrowAndAllocateTo,
  } = makeZoeHelpers(zcf);

  // todo: sort by price at which we need to liquidate
  const allVaults = [];


  // the SCM can call invest. This will mint Scones and buy liquidity tokens
  // from the pool
  function invest(collateralTokens) // -> Ownership Tokens
  {
    // we hold the liquidity tokens as an asset, and have the ownership
    // tokens as a liability

    // option 1: add only the collateralTokens to the autoswap's liquidity
    // pool, hold

    // option 2: get the current price from the autoswap, mint a matching
    // number of Scones for the collateral, add both (collateral+scones) into
    // the autoswap pool, hold the resulting liquidity tokens. When we redeem
    // the liquidity tokens, burn those scones.


    // ltokens = autoswap.addLiquidity(collateralTokens)
    // otokens = ownershipMint.mintPayment(count)
    // return otokens

    // this VM can choose to invest in other VMs, getting back ownership
    // shares in those VMs
  }

  function sellOwnershipTokens(ownershipTokens) // -> collateralTokens
  {}


  // end users can the SCM for loans with some collateral, and the SCM asks
  // us to make a new Vault

  function makeLoanInvite() {
    const expected = harden({
      give: { Collateral: null },
      want: { Scones: null },
    });

    async function makeLoanHook(offerHandle) {
      const {
        //handle,
        //instanceHandle,
        //currentAllocation,
        proposal: {
          give: {
            Collateral: collateralAmount,
          },
          want: {
            Scones: sconesWanted,
          },
          //exit,
        },
      } = zcf.getOffer(offerHandle);

      // this offer will hold the collateral until the loan is retired. The
      // payout from it will be handed to the user: if the vault dies early
      // (because the StableCoinMachine vat died), they'll get all their
      // collateral back.
      const r = await makeEmptyOfferWithResult();
      // AWAIT SORRY MARKM
      const collateralHolderOffer = await r.offerHandle;
      // AWAIT
      const collateralPayoutP = r.payout;

      const stalePrice = await E(autoswap).getCurrentPrice();
      // AWAIT

      const margin = 1.5;
      const maxScones = sconeMath.make(stalePrice.extent * collateralAmount.extent / margin); // todo fee
      assert(sconeMath.isGTE(maxScones, sconesWanted), 'you ask for too much');
      // todo fee: maybe mint new Scones, send to reward pool, increment how
      // much must be paid back

      // todo trigger process() check right away, in case the price dropped while we ran

      // todo (from dean) use a different offer for newly minted stablecoins,
      // to prevent something something that lets them get back both their
      // collateral and the new coins

      await escrowAndAllocateTo({
        amount: sconesWanted,
        payment: sconeMint.mintPayment(sconesWanted),
        keyword: 'Scones',
        recipientHandle: collateralHolderOffer,
      });
      // AWAIT

      trade(
        {
          offerHandle: collateralHolderOffer,
          gains: { Collateral: collateralAmount },
        },
        {
          offerHandle,
          gains: { Scones: sconesWanted },
        },
      );

      // todo: maybe let them extract the loan later, not right away

      const sconeDebt = sconesWanted; // todo +fee
      const vault = makeVault(zcf, collateralHolderOffer, sconeDebt, sconeStuff, autoswap);
      allVaults.push(vault);

      zcf.complete([offerHandle]);

      // todo: nicer to return single objects, find a better way to give them
      // the payout object
      return harden({
        userFacet: vault.userFacet,
        liquidationPayout: collateralPayoutP,
      });
    }

    const iv = checkHook(makeLoanHook, expected);
    return zcf.makeInvitation(iv, 'make a loan');
  }


  // Called by the vault when liquidation is insufficient. We're expected to
  // come up with 'underwaterBy' Scones.
  function helpLiquidateFallback(underwaterBy) {
  }


  return harden({
    makeLoanInvite,
  });

}
