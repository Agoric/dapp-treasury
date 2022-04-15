#! /usr/bin/env node
/* global require __dirname */
const fs = require('fs');

const uiConfig = JSON.stringify(
  {
    ON_CHAIN_CONFIG: ['getAgoricNames', ['uiConfig', 'VaultFactory']],
    GET_RUN_ON_CHAIN_CONFIG: ['getAgoricNames', ['instance', 'getRUN']],
    AMM_NAME: 'amm',
    BRIDGE_URL: 'http://127.0.0.1:8000',
    CONTRACT_NAME: 'VaultFactory',
    GET_RUN_NAME: 'GetRUN',
  },
  undefined,
  2,
);

const defaults = `src/generated/defaults.js`;
console.log('configuring', defaults, 'for on-chain vaultFactory');
fs.writeFileSync(`${__dirname}/${defaults}`, `export default ${uiConfig};\n`);
