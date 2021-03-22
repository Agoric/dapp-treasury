import { E } from '@agoric/captp';

export const getCollaterals = async (walletP, treasuryAPI) => {
  const collateralsWBrand = await E(treasuryAPI).getCollaterals();
  const brands = collateralsWBrand.map(({ brand }) => brand);
  const petnames = await E(walletP).getBrandPetnames(harden(brands));
  const collaterals = collateralsWBrand.map((collateral, i) => {
    return { ...collateral, petname: petnames[i] };
  });
  return collaterals;
};
