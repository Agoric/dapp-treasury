# Agoric Treasury

## Development

1. Follow the steps [here](https://agoric.com/documentation/getting-started/before-using-agoric.html) to install the `agoric-sdk` and agoric CLI tool.
2. Checkout the latest beta release for `agoric-sdk`: `git checkout -b beta agoricdev-8`
3. Git clone this repository, and pull down the latest from branch
   `beta`
3. Navigate to where you cloned `treasury`, and do `agoric install`
4. To start a local chain for development, do `agoric start --reset --verbose`

5. Open your wallet with `agoric open`.
6. When the UI changes from gray to white (be patient), transfer some
   funds from the **Agoric RUN currency** purse to the **Zoe fees**
   purse.

7. In another terminal, in `treasury`, do
   `ui/use-on-chain-config.js`. This will use the default on-chain settings.
8. To start the UI locally, do `cd ui && yarn start`
9. The treasury will ask you to `please approve the Treasury Dapp in
   your wallet.` Click on the `enabled` switch to do this.

## Reusing the code with other parameters

Instead of using the default on-chain settings, you can deploy the
contract and api by using the scripts in `exampleDeployScripts`. These are
not intended to be run with the dapp directly as-is, but rather as
starting points for configuring the deployment in different ways.
