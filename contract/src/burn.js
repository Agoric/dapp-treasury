import { assert, details, q } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { makeZoeHelpers } from '@agoric/zoe/src/contractSupport';
import { makeEmptyOfferWithResult } from './make-empty';

// burn(zcf, o, { Scones: sconeMath.make(4) })
export async function burn(zcf, fromOffer, what) {
  assert(zcf.isOfferActive(fromOffer), "An active offer is required");
  const { trade } = makeZoeHelpers(zcf);
  const resultRecord = await makeEmptyOfferWithResult(zcf);
  // AWAIT
  const burnOffer = await resultRecord.offerHandle;
  // AWAIT

  trade(
    { offerHandle: burnOffer, gains: what },
    { offerHandle: fromOffer, gains: {} },
  );
  zcf.complete([burnOffer]);
  const payoutRecord = await resultRecord.payout;
  // AWAIT

  // todo: some .map and Promise.all() to appease eslint
  const burns = Object.values(payoutRecord).map(async payment => {
    const allegedBrand = await E(payment).getAllegedBrand();
    const issuer = zcf.getIssuerForBrand(allegedBrand); // TODO: requires a zoe addition
    return E(issuer).burn(payment);
  })
  await Promise.all(burns);
}

export async function escrowAllTo(zcf, recipientHandle, amounts, payments) {
  assert(zcf.isOfferActive(recipientHandle), "An active offer is required");

  // We will create a temporary offer to be able to escrow our payment
  // with Zoe.
  const { trade } = makeZoeHelpers(zcf);
  const invite = zcf.makeInvitation(_ => undefined, 'empty offer');
  const proposal = harden({ give: amounts });
  harden(payments);
  // To escrow the payment, we must get the Zoe Service facet and
  // make an offer
  const zoe = zcf.getZoeService();
  const resultRecord = await E(zoe).offer(invite, proposal, payments);
  // AWAIT
  const transferOffer = await resultRecord.offerHandle;
  // AWAIT

  // At this point, the temporary offer has the amount from the
  // payment but nothing else. The recipient offer may have any
  // allocation, so we can't assume the allocation is currently empty for this
  // keyword.
  trade(
    {
      offerHandle: transferOffer,
      gains: {},
    },
    {
      offerHandle: recipientHandle,
      gains: amounts,
    },
  );

  // Complete the temporary offerHandle
  zcf.complete([transferOffer]);

  // Now, the temporary offer no longer exists, but the recipient
  // offer is allocated the value of the payment.
}