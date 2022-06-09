// @ts-check
/**
 * FIXME
 *
 * @typedef {any} Terms
 * @typedef {'instance'} Instance
 */
/**
 * @typedef {PromiseLike} ERef<T>
 * @template T
 */

/**
 * @template {AssetKind} [K=AssetKind]
 * @typedef {object} Issuer
 *
 * The issuer cannot mint a new amount, but it can create empty purses
 * and payments. The issuer can also transform payments (splitting
 * payments, combining payments, burning payments, and claiming
 * payments exclusively). The issuer should be gotten from a trusted
 * source and then relied upon as the decider of whether an untrusted
 * payment is valid.
 *
 * @property {() => Brand<K>} getBrand Get the Brand for this Issuer. The
 * Brand indicates the type of digital asset and is shared by the
 * mint, the issuer, and any purses and payments of this particular
 * kind. The brand is not closely held, so this function should not be
 * trusted to identify an issuer alone. Fake digital assets and amount
 * can use another issuer's brand.
 *
 * @property {() => string} getAllegedName Get the allegedName for
 * this mint/issuer
 * @property {() => AssetKind} getAssetKind Get the kind of
 * MathHelpers used by this Issuer.
 * @property {() => any} getDisplayInfo Give information to UI
 *  on how to display amounts for this issuer.
 * @property {() => any} makeEmptyPurse Make an empty purse of this
 * brand.
 * @property {any} isLive
 * @property {any} getAmountOf
 * @property {any} burn
 * @property {any} claim
 * @property {any} combine
 * @property {any} split
 * @property {any} splitMany
 */
/**
 * @typedef {'nat' | 'set' | 'copySet' | 'copyBag' } AssetKind
 */
/**
 * @template {AssetKind} [K=AssetKind]
 * @typedef {object} Brand
 * @property {(allegedIssuer: ERef<Issuer>) => Promise<boolean>} isMyIssuer
 * Should be used with `issuer.getBrand` to ensure an issuer and brand match.
 * @property {() => string} getAllegedName
 * @property {() => any} getDisplayInfo
 */

/**
 * @template {AssetKind} [K=AssetKind]
 * @typedef {object} Amount
 * Amounts are descriptions of digital assets, answering the questions
 * "how much" and "of what kind". Amounts are values labeled with a brand.
 * AmountMath executes the logic of how amounts are changed when digital
 * assets are merged, separated, or otherwise manipulated. For
 * example, a deposit of 2 bucks into a purse that already has 3 bucks
 * gives a new purse balance of 5 bucks. An empty purse has 0 bucks. AmountMath
 * relies heavily on polymorphic MathHelpers, which manipulate the unbranded
 * portion.
 *
 * @property {Brand<K>} brand
 * @property {any} value
 */

/**
 * @typedef {object} Ratio
 * @property {Amount<'nat'>} numerator
 * @property {Amount<'nat'>} denominator
 */

/**
 * @typedef {object} CollateralInfo
 *
 * @property {Brand} brand - the brand of the potential collateral
 *
 * @property {Ratio} liquidationMargin - the ratio below which
 * collateral will be liquidated to satisfy the debt. Example:
 * RUN125/RUN100
 *
 * @property {Ratio} marketPrice - price of one unit of collateral in
 * run, where unit is the commonly understood unit indicated by
 * decimalPlaces (e.g. ETH, not wei). Example: RUN1/moola1
 *
 * @property {string} petname - the petname from the user's wallet for
 *   this brand. Example: "moola"
 *
 * @property {Ratio} stabilityFee - the fee for the loan. Example:
 * RUN50/RUN10000
 *
 * @property {Ratio} interestRate - the interest to be charged on a
 * regular basis. The interest is added to the outstanding debt.
 */

/**
 * @typedef {Array<CollateralInfo>} Collaterals
 */

/**
 * @typedef {string | string[]} Petname A petname can either be a plain string
 * or a path for which the first element is a petname for the origin, and the
 * rest of the elements are a snapshot of the names that were first given by that
 * origin.  We are migrating away from using plain strings, for consistency.
 */

/**
 * @typedef {object} PursesJSONState
 * @property {Brand} brand
 * @property {string} brandBoardId  the board ID for this purse's brand
 * @property {string=} depositBoardId the board ID for the deposit-only facet of
 * this purse
 * @property {Petname} brandPetname the petname for this purse's brand
 * @property {Petname} pursePetname the petname for this purse
 * @property {import('@agoric/ertp/exported.js').DisplayInfo} displayInfo the brand's displayInfo
 * @property {any} value the purse's current balance
 * @property {any} currentAmountSlots
 * @property {any} currentAmount
 */

/**
 * @typedef {object} BrandInfo
 * @property {Issuer} issuer
 * @property {Brand} brand
 * @property {AssetKind} assetKind
 * @property {number | undefined} decimalPlaces
 * @property {Petname} petname - the petname for the brand from the user
 */

/**
 * @typedef { typeof import('../store').initial } TreasuryState
 *
 * @typedef { React.Reducer<TreasuryState, TreasuryAction> } TreasuryReducer
 *
 * @typedef { any } TreasuryAction This should probably be a big union type
 * but specifying it doesn't seem cost-effective just now.
 *
 * @typedef {React.Dispatch<React.Reducer<TreasuryState, TreasuryAction>>} TreasuryDispatch
 */

/**
 * @typedef {{
 *   instance?: Instance,
 *   ammAPI?: ERef<unknown>,
 *   centralBrand?: Brand,
 *   otherBrands?: Record<string, Brand>,
 * }} AutoswapState
 */

/**
 * @typedef  { import('@agoric/run-protocol/src/vaultFactory/vault').VaultUIState } VaultUIState
 */

/**
 * @typedef { import('@agoric/run-protocol/src/vaultFactory/vaultManager').AssetState } AssetState
 */

/**
 * @typedef {{
 *   status: import('../constants').VaultStatus,
 *   liquidated?: boolean,
 *   locked?: VaultUIState['locked'],
 *   collateralizationRatio?: Ratio,
 *   debtSnapshot?: VaultUIState['debtSnapshot'],
 *   interestRate?:  VaultUIState['interestRate'],
 *   liquidationRatio?: VaultUIState['liquidationRatio'],
 *   asset?: AssetState,
 *   err?: Error,
 * }} VaultData
 */

/**
 * @typedef {{
 *   instance: Instance,
 *   treasuryAPI: unknown,
 *   runIssuer: Issuer,
 *   runBrand: Brand,
 *   priceAuthority: ERef<any>,
 *   minInitialDebt: Amount<'nat'>,
 *   debtLimit: Amount<'nat'>,
 * }} VaultState
 */

/**
 * @typedef { import('@agoric/run-protocol/src/runStake/runStake').RunStakePublic } RunStakePublic
 */

/**
 * @typedef { import('@agoric/run-protocol/src/runStake/runStake').RunStakeTerms } RunStakeTerms
 */

/**
 * @typedef { import('../constants').LoanStatus } LoanStatus
 */

/**
 * @typedef {{
 * data: VaultData,
 * id: string,
 * status: LoanStatus
 * }} Loan
 */

/**
 * @typedef {{
 *   RUNStakeAPI: RunStakePublic,
 *   RUNStakeTerms: RunStakeTerms,
 *   instanceBoardId: string,
 *   installationBoardId: string,
 * }} RUNStakeState
 */

/**
 * @typedef {{
 *   PSMAPI: any,
 *   PSMTerms: any,
 *   PSMParams: any,
 *   instanceBoardId: string,
 *   installationBoardId: string
 * }} PSMState
 */

/**
 * @typedef { import('@agoric/wallet/api/src/types').RecordMetadata } RecordMetadata
 */

/**
 * @typedef {{
 *   priorOfferId?: string
 * }} ContinuingInvitation
 */

/**
 * @typedef {{
 *   meta: RecordMetadata,
 *   proposalForDisplay: Record<string, any>
 *   continuingInvitation?: ContinuingInvitation,
 * }} HistoryItem
 */

/**
 * @typedef {{
 *   id: string,
 *   meta: RecordMetadata,
 *   proposalForDisplay: Record<string, any>
 *   status: string,
 *   continuingInvitation?: ContinuingInvitation,
 * }} VaultHistoryEntry
 */

/**
 * @typedef  { import('@agoric/run-protocol/src/runStake/runStakeManager').AssetState } LoanAssetState
 */

/**
 * @typedef  { import('@agoric/run-protocol/src/vaultFactory/vaultManager').AssetState } VaultAssetState
 */

/**
 * @typedef {{
 *  pursePetname: string,
 *  value: bigint
 * }} NatPurse
 */
