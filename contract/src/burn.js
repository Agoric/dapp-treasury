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
