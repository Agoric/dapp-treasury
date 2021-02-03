// @ts-check
import '@agoric/zoe/exported';

import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { trade } from '@agoric/zoe/src/contractSupport';

// burn(zcf, o, { Scones: sconeMath.make(4) })
/**
 * @param {ContractFacet} zcf
 * @param {ZCFSeat} fromSeat
 * @param {{ Scones: any; }} what
 */
export async function burn(zcf, fromSeat, what) {
  assert(!fromSeat.hasExited(), 'An active offer is required');
  const { zcfSeat: burnSeat, userSeat } = zcf.makeEmptySeatKit();

  trade(zcf, { seat: burnSeat, gains: what }, { seat: fromSeat, gains: {} });
  burnSeat.exit();
  const payoutRecord = await E(userSeat).getPayouts();
  // TODO this is just all wrong, since this should use
  // `burnLosses`.
  const burns = Object.values(payoutRecord).map(async payment => {
    const allegedBrand = await E(payment).getAllegedBrand();
    const issuer = zcf.getIssuerForBrand(allegedBrand); // TODO: requires a zoe addition
    return E(issuer).burn(payment);
  });
  return Promise.all(burns);
}

// Await all the properties of the `record`
export async function whenAllProps(recordP) {
  const record = await recordP;
  const values = await Promise.all(Object.values(record));
  const entries = Object.keys(record).map((e, i) => [e, values[i]]);
  return Object.fromEntries(entries);
}
harden(whenAllProps);

/**
 * @param {ContractFacet} zcf
 * @param {ZCFSeat} recipientSeat
 * @param {AmountKeywordRecord} amounts
 * @param {PaymentPKeywordRecord} payments
 */
export async function escrowAllTo(zcf, recipientSeat, amounts, payments) {
  assert(!recipientSeat.hasExited(), 'An active seat is required');

  // We will create a temporary offer to be able to escrow our payment
  // with Zoe.
  function onReceipt(seat) {
    // we could assert that `amounts` arrived but Zoe checks that
    // const { give } = seat.getProposal();
    // When the assets arrive, move them onto the target seat and
    // exit
    trade(zcf, { seat, gains: {} }, { seat: recipientSeat, gains: amounts });
    seat.exit();
  }
  const invitation = zcf.makeInvitation(onReceipt, 'escrowAllTo landing place');
  const proposal = harden({ give: amounts });
  harden(payments);
  // To escrow the payment, we must get the Zoe Service facet and
  // make an offer
  const zoe = zcf.getZoeService();
  const tempSeat = E(zoe).offer(invitation, proposal, payments);
  // We aren't expecting anything back, so just return the outcome
  // so the caller can wait till this completes
  return E(tempSeat).getOfferResult();
}

/**
 * The `proposal` must use the same keywords as are present on the srcSeat.
 * Otherwise there will be a `rights were not conserved for brand` error.
 *
 * @param {ContractFacet} zcf
 * @param {ERef<Invitation>} invitation
 * @param {ZCFSeat} srcSeat
 * @param {Proposal} proposal
 * @param {ZCFSeat} toSeat
 * @returns {Promise<Omit<UserSeat, "getPayouts" | "getPayout">>}
 */
export async function offerTo(zcf, invitation, srcSeat, proposal, toSeat) {
  assert(!srcSeat.hasExited(), 'An active seat is required');
  const zoe = zcf.getZoeService();
  // Synchronously pull the assets off the source onto a temporary seat
  const { zcfSeat, userSeat } = zcf.makeEmptySeatKit();
  trade(
    zcf,
    { seat: srcSeat, gains: {} },
    { seat: zcfSeat, gains: proposal.give || {} },
  );
  zcfSeat.exit();
  // extract the assets to Payments and make the offer
  const extracts = E(userSeat).getPayouts();
  const payments = await whenAllProps(extracts);
  const offerSeat = await E(zoe).offer(invitation, proposal, payments);

  // When the payouts are available, add them to the toSeat
  // but don't wait for that
  await E(offerSeat)
    .getPayouts()
    .then(async payouts => {
      const amounts = await E(offerSeat).getCurrentAllocation();
      const offerPayouts = await whenAllProps(payouts);
      return escrowAllTo(zcf, toSeat, amounts, offerPayouts);
    });
  // TODO add `isComplete` to the return type
  // TODO this should not expose the payouts directly
  return offerSeat;
}

/**
 * @param {ContractFacet} zcf
 * @param {ZCFMint} zcfMint
 * @param {Amount} amount
 */
export async function paymentFromZCFMint(zcf, zcfMint, amount) {
  const { zcfSeat, userSeat } = zcf.makeEmptySeatKit();
  zcfMint.mintGains({ Temp: amount }, zcfSeat);
  zcfSeat.exit();
  return E(userSeat).getPayout('Temp');
}
