#! /usr/bin/env node
/* global require __dirname */
const fs = require('fs');

const uiConfig = JSON.stringify(
  {
    ON_CHAIN_CONFIG: ['getAgoricNames', ['uiConfig', 'Treasury']],
    AMM_NAME: 'autoswap',
    BRIDGE_URL: 'http://127.0.0.1:8000',
    CONTRACT_NAME: 'Treasury',
  },
  undefined,
  2,
);

const defaults = `src/generated/defaults.js`;
console.log('configuring', defaults, 'for on-chain treasury');
fs.writeFileSync(`${__dirname}/${defaults}`, `export default ${uiConfig};\n`);
