import { E } from '@agoric/captp';

export const getCollaterals = async (walletP, INSTANCE_BOARD_ID) => {
  const zoe = E(walletP).getZoe();
  const board = E(walletP).getBoard();

  const instance = await E(board).getValue(INSTANCE_BOARD_ID);
  const publicFacet = E(zoe).getPublicFacet(instance);
  const collateralsWBrand = await E(publicFacet).getCollaterals();
  const brands = collateralsWBrand.map(({ brand }) => brand);
  const petnames = await E(walletP).getBrandPetnames(harden(brands));
  const collaterals = collateralsWBrand.map((collateral, i) => {
    return { ...collateral, petname: petnames[i] };
  });
  return collaterals;
};
