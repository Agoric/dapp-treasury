// Agoric branded logo used for page titles and headers.
export const AGORIC_LOGO_URL =
  'https://agoric.com/wp-content/themes/agoric_2021_theme/assets/img/logo.svg';

export const VaultStatus = /** @type {const} */ ({
  PENDING: 'Pending Wallet Acceptance',
  ERROR: 'Error in Offer',
  INITIATED: 'Loan Initiated',
  LIQUIDATED: 'Liquidated',
  LOADING: 'Loading',
  CLOSED: 'Closed',
  DECLINED: 'Declined',
});
/** @typedef {typeof VaultStatus[keyof typeof VaultStatus]} VaultStatus */

export const LoanStatus = /** @type {const} */ ({
  OPEN: 'open',
  CLOSED: 'closed',
  PROPOSED: 'pending',
  ERROR: 'error',
});
/** @typedef {typeof LoanStatus[keyof typeof LoanStatus]} LoanStatus */
