import { E } from '@agoric/eventual-send';

export const makeAddCollateralType = ({
  stablecoinMachine,
  zoe,
  emptyGovernanceAmount,
}) => {
  const addCollateralType = async ({
    keyword,
    rate,
    issuer,
    amount,
    payment,
  }) => {
    const addTypeInvitation = E(stablecoinMachine).makeAddTypeInvitation(
      issuer,
      keyword,
      rate,
    );

    const proposal = harden({
      give: {
        Collateral: amount,
      },
      want: {
        Governance: emptyGovernanceAmount,
      },
    });

    const payments = harden({
      Collateral: payment,
    });

    const seat = await E(zoe).offer(addTypeInvitation, proposal, payments);

    const vaultManager = E(seat).getOfferResult();

    return vaultManager;
  };

  return addCollateralType;
};
