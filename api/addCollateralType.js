import { E } from '@agoric/eventual-send';

export const makeAddCollateralType = ({
  stablecoinMachine,
  issuerManager,
  helpers,
  GOVERNANCE_BRAND_PETNAME,
  GOVERNANCE_PURSE_PETNAME,
}) => {
  const addCollateralType = async ({
    collateralKeyword,
    rate,
    collateralBrandPetname,
    collateralValueToGive,
    collateralPursePetname,
  }) => {
    const collateralIssuer = await E(issuerManager).get(collateralBrandPetname);

    const addTypeInvitation = E(stablecoinMachine).makeAddTypeInvitation(
      collateralIssuer,
      collateralKeyword,
      rate,
    );

    const offerConfig = harden({
      invitation: addTypeInvitation,
      proposalWithBrandPetnames: {
        give: {
          Collateral: {
            brand: collateralBrandPetname,
            value: collateralValueToGive,
          },
        },
        want: {
          Governance: { brand: GOVERNANCE_BRAND_PETNAME, value: 0 },
        },
      },
      paymentsWithPursePetnames: {
        Collateral: collateralPursePetname,
      },
      payoutPursePetnames: {
        Collateral: collateralPursePetname,
        Governance: GOVERNANCE_PURSE_PETNAME,
      },
    });

    const { seat } = await helpers.offer(offerConfig);

    const vaultManager = E(seat).getOfferResult();

    return vaultManager;
  };

  return addCollateralType;
};
