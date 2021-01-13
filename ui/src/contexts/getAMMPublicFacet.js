import { E } from '@agoric/eventual-send';

import dappConstants from '../generated/defaults.js';

const { AMM_INSTANCE_BOARD_ID } = dappConstants;

export const getAMMPublicFacet = async walletP => {
  const zoe = E(walletP).getZoe();
  const board = E(walletP).getBoard();
  const ammInstance = await E(board).getValue(AMM_INSTANCE_BOARD_ID);
  const ammPublicFacet = E(zoe).getPublicFacet(ammInstance);
  return ammPublicFacet;
};
