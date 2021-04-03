# Dapp Token Economy

## Development

1. Git clone https://github.com/Agoric/agoric-sdk and pull down the
   latest from branch `master`
2. Navigate to where you cloned agoric-sdk and do `yarn install`
3. In agoric-sdk, do `yarn build`
4. Git clone this repository, and pull down the latest from branch
   `main`
5. Navigate to where you cloned dapp-token-economy, and do `agoric install`
6. To start a local chain for development, do `agoric start --reset
   --verbose`
7. In another terminal, in dapp-token-economy, do
   `ui/use-on-chain-config.js`. This will use the default on-chain settings.
8. To start the UI locally, do `cd ui && yarn start`


## Reusing the code with other parameters

Instead of using the default on-chain settings, you can deploy the
contract and api by using the scripts in `exampleDeployScripts` as
templates to get started.