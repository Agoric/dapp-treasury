export function makeEmptyOfferWithResult(zoe, zcf) {
  const invite = zcf.makeInvitation(_ => undefined, 'empty offer');
  return E(zoe).offer(invite);  // Promise<OfferResultRecord>, 
}
