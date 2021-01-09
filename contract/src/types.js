// @ts-check
/**
 * @typedef  {Object} AutoswapLocal
 * @property {(amount: Amount, brand: Brand) => Amount} getInputPrice
 * @property {() => Invitation} makeSwapInvitation
 */

/**
 * @typedef { import('@agoric/zoe/src/contracts/multipoolAutoswap/multipoolAutoswap').MultipoolAutoswap } MultipoolAutoswap
 */

/**
 * @typedef  {Object} StablecoinMachine
 * @property {() => Invitation} makeAddTypeInvitation
 */

/**
 * @typedef { ReturnType<typeof import('../src/vault').makeVault>['vault']} Vault
 */

/**
 * @typedef {Object} UIState
 * @property {number} interestRate
 * @property {number} liquidationRatio
 * @property {Amount} locked Amount of Collateral locked
 * @property {Amount} debt Amount of Loan (including accrued interest)
 * @property {number} collateralizationRatio a whole number percent; expected to
 * be greater than 100
 * @property {boolean} liquidated boolean showing whether liquidation occurred
 */
