// These are gleaned from the peggy start-chain.sh script.
export const PEGGY_CONTRACT_ADDRESS =
  '0xD7600ae27C99988A6CD360234062b540F88ECA43';
export const ERC20_ADDRESS = '0x0412C7c846bb6b7DC462CF6B453f76D8440b2609';

// This is taken from:
// peggy keys show -a peggy-cosmos
export const PEGGY_COSMOS_ADDRESS =
  'cosmos1nqypqptka5w9eph6kdvguvujnxhmn3l8u9guuc';

// This is taken from:
// ag-cosmos-helper keys parse $(peggy keys show -a peggy-cosmos)
export const PEGGY_COSMOS_ADDRESS_HEX =
  '0x9808100576ED1C5C86FAB3588E339299AFB9C7E7';

export const PEGGY_TRANSFER_AGENT_URL = 'ws://localhost:5151/';
