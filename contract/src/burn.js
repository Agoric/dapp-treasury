import { assert, details, q } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { makeZoeHelpers } from '@agoric/zoe/contractSupport';
import { makeEmptyOfferWithResult } from './make-empty';

// burn(zcf, o, { Scones: sconeIssuer }, { Scones: sconeMath.make(4) })
async function burn(zcf, fromOffer, issuers, what) {
  for (const name of what.keys()) {
    assert(issuers[what], details`missing issuers[${what}]`);
  }

  const { trade, makeEmptyOffer } = makeZoeHelpers(zcf);
  const resultRecord = await makeEmptyOfferWithResult();
  // AWAIT
  const burnOffer = await resultRecord.offerHandle;
  // AWAIT

  trade(
    { offerHandle: burnOffer, gains: what },
    { offerHandle: fromOffer, gains: {} },
  );
  zcf.complete(burnOffer);
  const payoutRecord = await resultRecord.payout;
  // AWAIT

  // todo: some .map and Promise.all() to appease eslint
  for (const name of what.keys()) {
    // todo: when #1270 is done, use it to ask zcf.getIssuer(payment~.getAllegedBrand())
    await E(issuers[name]).burn(payoutRecord[name], what[name]);
    // AWAIT
  }
}
