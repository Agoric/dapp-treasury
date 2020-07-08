import { E } from '@agoric/eventual-send';

export function makeEmptyOfferWithResult(zcf) {
  const invite = zcf.makeInvitation(_ => undefined, 'empty offer');
  const zoe = zcf.getZoeService();
  return E(zoe).offer(invite);  // Promise<OfferResultRecord>, 
}
