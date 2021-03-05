// @ts-check

/**
 * @typedef  {Object} AutoswapLocal
 * @property {(amount: Amount, brand: Brand) => Amount} getInputPrice
 * @property {() => Invitation} makeSwapInvitation
 */

/**
 * @typedef {Object} Collateral
 * @property {Ratio} initialMargin
 * @property {Ratio} liquidationMargin
 * @property {Ratio} stabilityFee
 * @property {Amount} marketPrice
 * @property {Brand} brand
 */

/**
 * @typedef {Object} Rates
 * @property {Ratio} initialMargin minimum required over-collateralization
 * required to open a loan
 * @property {Ratio} liquidationMargin margin below which collateral will be
 * liquidated to satisfy the debt.
 * @property {Ratio} initialPrice price ratio of collateral to stablecoin
 * @property {Ratio} interestRate interest rate charged on loans
 * @property {Ratio} loanFee The fee (in BasisPoints) charged when opening
 * or increasing a loan.
 */

/**
 * @typedef  {Object} StablecoinMachine
 * @property {(collateralIssuer: Issuer, collateralKeyword: Keyword, rates: Rates) => Promise<Invitation>} makeAddTypeInvitation
 * @property {() => Instance} getAMM
 * @property {() => Promise<Array<Collateral>>} getCollaterals
 */

/**
 * @typedef {Object} UIState
 * @property {Ratio} interestRate
 * @property {Ratio} liquidationRatio
 * @property {Amount} locked Amount of Collateral locked
 * @property {Amount} debt Amount of Loan (including accrued interest)
 * @property {Ratio} collateralizationRatio
 * @property {boolean} liquidated boolean showing whether liquidation occurred
 */

/**
 * @typedef {Object} InnerVaultManager
 * @property {AmountMath} collateralMath
 * @property {Brand} collateralBrand
 * @property {() => Ratio} getLiquidationMargin
 * @property {() => Ratio} getLoanFee
 * @property {() => Promise<PriceQuote>} getCollateralQuote
 * @property {() => Ratio} getInitialMargin
 * @property {() => Ratio} getInterestRate
 */

/**
 * @typedef {Object} VaultManager
 * @property {(ZCFSeat) => Promise<LoanKit>}  makeLoanKit
 * @property {() => void} liquidateAll
 * @property {() => Ratio} getLiquidationMargin
 * @property {() => Ratio} getLoanFee
 * @property {() => Promise<PriceQuote>} getCollateralQuote
 * @property {() => Ratio} getInitialMargin
 * @property {() => Ratio} getInterestRate
 */

/**
 * @typedef {Object} OpenLoanKit
 * @property {Notifier<UIState>} notifier
 * @property {Promise<PaymentPKeywordRecord>} collateralPayoutP
 */

/**
 * @typedef {Object} Vault
 * @property {() => Promise<Invitation>} makeAddCollateralInvitation
 * @property {() => Promise<Invitation>} makePaybackInvitation
 * @property {() => Promise<Invitation>} makeCloseInvitation
 * @property {() => Amount} getCollateralAmount
 * @property {() => Amount} getDebtAmount
 */

/**
 * @typedef {Object} LoanKit
 * @property {Vault} vault
 * @property {Promise<PaymentPKeywordRecord>} liquidationPayout
 * @property {Notifier<UIState>} uiNotifier
 */

/**
 * @typedef {Object} VaultKit
 * @property {Vault} vault
 * @property {() => void} liquidate
 * @property {() => void} checkMargin
 * @property {(ZCFSeat) => Promise<OpenLoanKit>} openLoan
 */

/**
 * @callback RewardPoolStaging return a seat staging (for use in reallocate)
 * that will add the indicated amount to the stablecoin machine's reward pool.
 * @param {Amount} amount
 * @param {ZCFSeat} fromSeat
 */

/**
 * @callback MakeVaultManager
 * @param {ContractFacet} zcf
 * @param {ERef<MultipoolAutoswapPublicFacet>} autoswap
 * @param {ZCFMint} sconeMint
 * @param {Brand} collateralBrand
 * @param {ERef<PriceAuthority>} priceAuthority
 * @param {Rates} rates
 * @param {RewardPoolStaging} rewardPoolStaging
 * @returns {VaultManager}
 */

/**
 * @callback MakeVaultKit
 * @param {ContractFacet} zcf
 * @param {InnerVaultManager} manager
 * @param {ZCFMint} sconeMint
 * @param {ERef<MultipoolAutoswapPublicFacet>} autoswap
 * @param {ERef<PriceAuthority>} priceAuthority
 * @param {RewardPoolStaging} rewardPoolStaging
 * @returns {VaultKit}
 */
