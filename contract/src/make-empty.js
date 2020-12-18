import { E } from '@agoric/eventual-send';

/**
 * @param { ContractFacet } zcf
 */
export function makeEmptyOfferWithResult(zcf) {
  const invitation = zcf.makeInvitation(_ => undefined, 'empty offer');
  const zoe = zcf.getZoeService();
  return E(zoe).offer(invitation); // Promise<OfferResultRecord>,
}

/**
 * TODO: Add this to Zoe helpers!
 * XXXXXXXX
 *
 * @param {{amount: Amount, keyword: Keyword, donorHandle: OfferHandle}} arg0
 */
// export async function unescrow({ amount, keyword, donorHandle }) {
//   const {
//     offerHandle: ourOfferHandleP,
//     payout: ourPayoutP,
//   } = await makeEmptyOfferWithResult(zcf);

//   const ourOfferHandle = await ourOfferHandleP;
//   const originalAmount = zcf.getCurrentAllocation(donorHandle)[keyword];

//   // Take the payment from the donor.
//   const remaining = zcf
//     .getAmountMath(amount.brand)
//     .subtract(originalAmount, amount);
//   zcf.reallocate(
//     [donorHandle, ourOfferHandle],
//     [{ [keyword]: remaining }, { [keyword]: amount }],
//   );
//   zcf.complete(harden([ourOfferHandle]));

//   // Wait for the payout to get the payment promise.
//   const { [keyword]: paymentP } = await ourPayoutP;

//   // The caller can wait.
//   return paymentP;
// };
