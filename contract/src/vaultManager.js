/* global harden */
import { assert, details, q } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { makeZoeHelpers } from '@agoric/zoe/contractSupport';

// Each VaultManager manages a single collateralType. It owns an autoswap
// instance which trades this collateralType against Scones. It also manages
// some number of outstanding loans, each called a Vault, for which the
// collateral is provided in exchanged for borrowed Scones.

// todo: two timers: one to increment fees, second (not really timer) when
// the autoswap price changes, to check if we need to liquidate

function makeVaultManager(zcf, collateralIssuer, autoswap, sconeMath, sconeMint) {
  const {
    trade,
    rejectOffer,
    makeEmptyOffer,
    checkHook,
    assertKeywords,
    escrowAndAllocateTo,
    assertNatMathHelpers,
  } = makeZoeHelpers(zcf);

  // todo: sort by price at which we need to liquidate
  const allVaults = [];



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

      // this offer will hold the collateral until the loan is retired
      const o = await makeEmptyOffer();
      // AWAIT SORRY MARKM

      const stalePrice = await E(autoswap).getCurrentPrice();
      // AWAIT

      const margin = 1.5;
      const maxScones = sconeMath.make(stalePrice.extent * collateralAmount.extent / margin); // todo fee
      assert(sconeMath.isGTE(maxScones, sconesWanted), 'you ask for too much');
      // todo fee: maybe mint new Scones, send to reward pool, increment how
      // much must be paid back

      // todo trigger process() check right away, in case the price dropped while we ran

      await escrowAndAllocateTo({
        amount: sconesWanted,
        payment: sconeMint.mintPayment(sconesWanted),
        keyword: 'Scones',
        recipientHandle: o,
      });
      // AWAIT

      trade(
        {
          offerHandle: o,
          gains: { Collateral: collateralAmount },
        },
        {
          offerHandle,
          gains: { Scones: sconesWanted },
        },
      );

      // todo: maybe let them extract the loan later, not right away

      const sconeDebt = sconesWanted; // todo +fee
      const vault = makeVault(o, sconeDebt);
      allVaults.push(vault);

      zcf.complete(offerHandle);
      return harden(vault.userFacet);
    }

    const iv = checkHook(makeLoanHook, expected);
    return zcf.makeInvitation(iv, 'make a loan');
  }

  


}
