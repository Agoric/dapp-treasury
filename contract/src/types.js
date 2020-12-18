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
