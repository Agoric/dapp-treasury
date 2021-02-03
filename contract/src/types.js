// @ts-check
/**
 * @typedef  {Object} AutoswapLocal
 * @property {(amount: Amount, brand: Brand) => Amount} getInputPrice
 * @property {() => Invitation} makeSwapInvitation
 */

/**
 * @typedef {Object} Collateral
 * @property {number} initialMargin
 * @property {number} liquidationMargin
 * @property {number} stabilityFee
 * @property {Amount} marketPrice
 * @property {Brand} brand
 */

/**
 * @typedef {Object} Rates
 * @property {number} initialMargin
 * @property {number} liquidationMargin
 * @property {number} initialPrice
 * @property {number} interestRate
 */

/**
 * @typedef  {Object} StablecoinMachine
 * @property {(collateralIssuer: Issuer, collateralKeyword: Keyword, rates: Rates) => Promise<Invitation>} makeAddTypeInvitation
 * @property {() => Instance} getAMM
 * @property {() => Promise<Array<Collateral>>} getCollaterals
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

/**
 * @typedef {Object} InnerVaultManager
 * @property {AmountMath} collateralMath
 * @property {Brand} collateralBrand
 * @property {() => number} getLiquidationMargin
 * @property {() => number} getStabilityFee
 * @property {() => Promise<PriceQuote>} getCollateralQuote
 * @property {() => number} getInitialMargin
 */

/**
 * @typedef {Object} VaultManager
 * @property {MakeLoan} makeLoan
 * @property {() => void} liquidateAll
 * @property {() => number} getLiquidationMargin
 * @property {() => number} getStabilityFee
 * @property {() => Promise<PriceQuote>} getCollateralQuote
 * @property {() => number} getInitialMargin
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
 */

/**
 * @callback MakeLoan
 * @param {ZCFSeat} zcfSeat
 * @returns {Promise<LoanKit>}
 */

/**
 * @callback MakeVaultManager
 * @param {ContractFacet} zcf
 * @param {ERef<MultipoolAutoswapPublicFacet>} autoswap
 * @param {ZCFMint} sconeMint
 * @param {Brand} collateralBrand
 * @param {ERef<PriceAuthority>} priceAuthority
 * @param {Rates} rates
 * @returns {VaultManager}
 */

/**
 * @callback MakeVaultKit
 * @param {ContractFacet} zcf
 * @param {InnerVaultManager} manager
 * @param {ZCFSeat} collateralSeat
 * @param {Amount} sconeDebt
 * @param {ZCFMint} sconeMint
 * @param {ERef<MultipoolAutoswapPublicFacet>} autoswap
 * @param {ERef<PriceAuthority>} priceAuthority
 * @param {IterationObserver<UIState>} uiUpdater
 * @returns {VaultKit}
 */
