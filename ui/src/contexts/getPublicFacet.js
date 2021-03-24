import { E } from '@agoric/eventual-send';

export const getPublicFacet = async (walletP, instanceBoardId) => {
  const zoe = E(walletP).getZoe();
  const board = E(walletP).getBoard();
  const instance = await E(board).getValue(instanceBoardId);
  return E(zoe).getPublicFacet(instance);
};
