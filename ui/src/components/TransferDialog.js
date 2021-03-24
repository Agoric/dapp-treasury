/* global process globalThis */
import React, { useCallback, useEffect, useState } from 'react';

import { ethers } from 'ethers';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import { Button } from '@material-ui/core';

import { parseValue, stringifyAmount } from './display';
import PeggyContract from '../Peggy.json';
import TransferStepper from './TransferStepper';

import {
  PEGGY_CONTRACT_ADDRESS,
  ERC20_ADDRESS,
  PEGGY_COSMOS_ADDRESS,
  PEGGY_COSMOS_ADDRESS_HEX,
  PEGGY_TRANSFER_AGENT_URL,
} from '../peggyConfig.js';

const REALLY_PEGGY = !!process.env.REACT_APP_REALLY_PEGGY;

const TRANSFER_PATH = ['eth', 'peggy', 'agoric'];

const NORMALIZE_PLACES = 9;
const bi = (n, places) => {
  if (places < 0) {
    return BigInt(n) / BigInt(10) ** BigInt(-places);
  }
  return BigInt(n) * BigInt(10) ** BigInt(places);
};

const norm = (n, extant = 0) => bi(n, NORMALIZE_PLACES - extant);
// TODO this is almost certainly not consistently applied to amounts.
const denorm = n => stringifyAmount(n, { decimalPlaces: NORMALIZE_PLACES });
// const denorm = (n, wanted = 0) => bi(n, wanted - NORMALIZE_TRANSFER_PLACES);

const INITIAL_BALANCES = REALLY_PEGGY
  ? {
      eth: { value: norm(0), decimals: 0 },
      peggy: { value: norm(0), decimals: 18 },
      agoric: { value: norm(0), decimals: 0 },
    }
  : {
      eth: { value: norm(1000), decimals: 18 },
      peggy: { value: norm(0), decimals: 18 },
      agoric: { value: norm(0), decimals: 6 },
    };

const METAMASK_ACCOUNT_NUMBER = undefined;

const erc20Abi = [
  // Read-Only Functions
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',

  // Authenticated Functions
  'function transfer(address to, uint amount) returns (boolean)',

  // Events
  'event Transfer(address indexed from, address indexed to, uint amount)',
];

export default function TransferDialog({
  toTransfer,
  setToTransfer,
  fundPursePetname,
  purses,
  required,
  requiredDisplayInfo,
  requiredSymbol,
}) {
  const [fundPurse, setFundPurse] = useState();
  const requiredDisplay = stringifyAmount(required, requiredDisplayInfo);
  const [transferring, setTransferring] = useState(false);
  const [stateChange, setStateChange] = useState(0);
  const [provider, setEthProvider] = useState();
  const onClose = useCallback(() => {
    setTransferring(undefined);
    setToTransfer();
  });

  const [balances, setBalances] = useState(INITIAL_BALANCES);

  useEffect(() => {
    console.log('trying to select fundpurse', fundPursePetname, purses);
    const fp = purses.find(
      p => JSON.stringify(p.pursePetname) === JSON.stringify(fundPursePetname),
    );
    if (!fp) {
      return;
    }
    setFundPurse(fp);
  }, [purses, fundPursePetname]);

  useEffect(() => {
    if (!REALLY_PEGGY || !globalThis.ethereum) {
      return;
    }
    globalThis.ethereum
      .enable()
      .then(() =>
        setEthProvider(new ethers.providers.Web3Provider(globalThis.ethereum)),
      );
  }, []);

  useEffect(() => {
    if (!REALLY_PEGGY) {
      return undefined;
    }
    const ws = new WebSocket(PEGGY_TRANSFER_AGENT_URL);
    const send = obj => {
      if (ws.readyState !== ws.OPEN) {
        return;
      }
      ws.send(JSON.stringify(obj));
    };
    ws.addEventListener('open', () => {
      ws.addEventListener('message', ev => {
        const obj = JSON.parse(ev.data);
        console.log('received Peggy', obj);
        switch (obj.type) {
          case 'PEGGY_BALANCE': {
            const { address, balances: peggyBalances } = obj.payload;
            if (address !== PEGGY_COSMOS_ADDRESS) {
              return;
            }
            for (const { denom, amount } of peggyBalances) {
              if (denom === `peggy${ERC20_ADDRESS}`) {
                setBalances(({ peggy: bal, ...bals }) => ({
                  ...bals,
                  peggy: {
                    ...bal,
                    value: norm(amount, bal.decimals),
                  },
                }));
              }
            }
            break;
          }

          default:
        }
      });
      send({ type: 'PEGGY_BALANCE_SUBSCRIBE', payload: PEGGY_COSMOS_ADDRESS });
    });
    return () => ws.close();
  }, []);

  useEffect(() => {
    if (!provider) {
      return undefined;
    }
    const contract = new ethers.Contract(ERC20_ADDRESS, erc20Abi, provider);

    let transferListener;
    const subscribeToEthBalances = async () => {
      console.log('wait for deploy');
      await contract.deployed();
      if (transferListener === false) {
        return;
      }
      const ethDecimals = await contract.decimals();
      if (transferListener === false) {
        return;
      }
      const signer = provider.getSigner(METAMASK_ACCOUNT_NUMBER);
      const myAddress = await signer.getAddress();
      if (transferListener === false) {
        return;
      }
      console.log('subscribe to balance changes of', myAddress);

      transferListener = async (...args) => {
        console.log('got erc20 transfer', args);
        const balance = await contract.balanceOf(myAddress);
        console.log('balance of my address is', balance);
        const bvalue = BigInt(balance.toHexString());
        setBalances(({ peggy: peggyBal, ...bals }) => ({
          ...bals,
          eth: { value: norm(bvalue, ethDecimals), decimals: ethDecimals },
          peggy: { ...peggyBal, decimals: ethDecimals },
        }));
      };

      contract.on('Transfer', transferListener);
      transferListener();
    };

    subscribeToEthBalances().catch(e =>
      console.log('cannot subscribe to eth balances', e),
    );

    return () => {
      transferListener && contract.off('Transfer', transferListener);
      transferListener = false;
    };
  }, [provider]);

  const [outgoing, setOutgoing] = useState({
    eth: norm(0),
    peggy: norm(0),
    agoric: norm(0),
  });

  const sendTokensStub = async (
    sourcePath,
    targetPath,
    amount,
    _srcDecimals,
  ) => {
    // TODO: Actually initiate a transfer.
    setBalances(({ [sourcePath]: bal, ...bals }) => ({
      ...bals,
      [sourcePath]: { ...bal, value: bal.value - amount },
    }));

    // Update the outgoing state to drive the animations.
    setOutgoing(({ [sourcePath]: out, ...outs }) => ({
      ...outs,
      [sourcePath]: out + amount,
    }));

    // TODO: Actually react to balance change.
    setTimeout(() => {
      setBalances(({ [targetPath]: bal, ...bals }) => ({
        ...bals,
        [targetPath]: { ...bal, value: bal.value + amount },
      }));
      // Update the outgoing state to cancel the animations.
      setOutgoing(({ [sourcePath]: out, ...outs }) => ({
        ...outs,
        [sourcePath]: out - amount,
      }));

      setStateChange(n => n + 1);
    }, 3000);
  };

  const sendTokensEth = useCallback(
    async (sourcePath, _targetPath, amount, srcDecimals) => {
      // Transferring from ETH.
      if (!provider) {
        return;
      }

      const amountToSend = parseValue(denorm(amount), {
        decimalPlaces: srcDecimals,
        amountMathKind: 'big',
      });

      console.log('start peggy contract instance');
      const peggy = new ethers.Contract(
        PEGGY_CONTRACT_ADDRESS,
        PeggyContract.abi,
        provider.getSigner(METAMASK_ACCOUNT_NUMBER),
      );
      console.log('wait for peggy deploy');
      const contract = await peggy.deployed();
      console.log('send to cosmos', PEGGY_COSMOS_ADDRESS_HEX, amountToSend);
      const txResponse = await contract.sendToCosmos(
        ERC20_ADDRESS,
        ethers.utils.zeroPad(
          ethers.utils.arrayify(PEGGY_COSMOS_ADDRESS_HEX),
          32,
        ),
        amountToSend, // AmountToSend
      );

      // Update the outgoing state to drive the animations.
      setOutgoing(({ [sourcePath]: out, ...outs }) => ({
        ...outs,
        [sourcePath]: out + amount,
      }));

      // https://docs.ethers.io/v5/api/providers/types/#providers-TransactionResponse
      console.log('wait for confirmation');
      const { blockNumber } = await txResponse.wait(1);
      console.log('Confirmed in block number', blockNumber);

      // Update the outgoing state to cancel the animations.
      setOutgoing(({ [sourcePath]: out, ...outs }) => ({
        ...outs,
        [sourcePath]: out + amount,
      }));
    },
    [provider],
  );

  const sendTokensPeggy = useCallback(
    async (sourcePath, _targetPath, amount, srcDecimals) => {
      // Transferring from ETH.
      if (!provider) {
        return;
      }

      const amountToSend = parseValue(denorm(amount), {
        decimalPlaces: srcDecimals,
        amountMathKind: 'big',
      });

      setOutgoing(({ [sourcePath]: out, ...outs }) => ({
        ...outs,
        [sourcePath]: out + amount,
      }));

      const ws = new WebSocket(PEGGY_TRANSFER_AGENT_URL);
      const send = obj => {
        console.log('sending peggy', obj);
        if (ws.readyState !== ws.OPEN) {
          return;
        }
        ws.send(JSON.stringify(obj));
      };
      ws.addEventListener('open', () => {
        ws.addEventListener('message', ev => {
          const obj = JSON.parse(ev.data);
          console.log('receive peggy', obj);
          switch (obj.type) {
            case 'PEGGY_TRANSFER_COMPLETE': {
              // Update the outgoing state to cancel the animations.
              setOutgoing(({ [sourcePath]: out, ...outs }) => ({
                ...outs,
                [sourcePath]: out - amount,
              }));
              break;
            }
            default:
          }
          ws.close();
        });

        // Update the outgoing state to drive the animations.
        send({
          type: 'PEGGY_AGORIC_TRANSFER',
          payload: {
            // recipient: `board:${depositFacetId}`,
            amount: `${amountToSend}`,
            denom: `peggy${ERC20_ADDRESS}`,
          },
        });
      });
    },
  );

  const sendTokenses = REALLY_PEGGY
    ? { eth: sendTokensEth, peggy: sendTokensPeggy }
    : { eth: sendTokensStub, peggy: sendTokensStub };

  const runStateMachine = useCallback(() => {
    let targetIndex = TRANSFER_PATH.length - 1;
    let targetNeeded = transferring;

    if (targetNeeded < balances[TRANSFER_PATH[targetIndex]].value) {
      // Done!
      setTransferring(undefined);
      // eslint-disable-next-line
      alert('done transfer');
      return;
    }

    let sourceIndex = targetIndex - 1;
    let difference = targetNeeded;
    while (sourceIndex >= 0) {
      const targetPath = TRANSFER_PATH[targetIndex];
      const sourcePath = TRANSFER_PATH[sourceIndex];
      targetNeeded -= balances[targetPath].value;
      difference = targetNeeded - outgoing[sourcePath];

      if (difference <= 0) {
        // Base case, the transfer is already happening.
        return;
      }

      if (difference <= balances[sourcePath].value) {
        // The current source has enough.
        break;
      }

      // We need to get more from the next source.
      sourceIndex -= 1;
      targetIndex -= 1;
    }

    console.log('sourceIndex', sourceIndex, difference, balances);
    const sourcePath = TRANSFER_PATH[sourceIndex];
    const targetPath = TRANSFER_PATH[targetIndex];
    if (!sourcePath) {
      if (balances[targetPath].value < difference) {
        // We can't get more!
        // eslint-disable-next-line
        alert(
          `Transfer source ${targetPath} needs ${difference -
            balances[targetPath].value} more!`,
        );
      }
      setTransferring(undefined);
      return;
    }

    // Actually start a transfer now that we've pooled enough.
    console.log(
      'starting transfer from',
      sourcePath,
      'to',
      targetPath,
      'of',
      difference,
    );

    console.log('sendTokenses', sourcePath, targetPath, balances);
    sendTokenses[sourcePath](
      sourcePath,
      targetPath,
      difference,
      balances[sourcePath].decimals,
    ).catch(e => console.error(`Error sending from ${sourcePath}`, e.stack));
  }, [transferring, balances, outgoing]);

  const onTransfer = useCallback(() => {
    setTransferring(
      norm(parseInt(toTransfer, 10), requiredDisplayInfo.decimalPlaces),
    );
  }, [toTransfer]);

  useEffect(() => {
    if (transferring && transferring > 0) {
      runStateMachine();
    }
  }, [transferring, stateChange]);

  return (
    <>
      <Dialog onClose={onClose} open={toTransfer !== undefined}>
        <DialogTitle onClose={onClose}>Transfer funds</DialogTitle>
        <DialogContent>
          {required && fundPurse && (
            <Typography component="h5" gutterBottom>
              This vault requires {requiredDisplay} {requiredSymbol}
            </Typography>
          )}
          <TextField
            variant="outlined"
            required
            label={`Target funds`}
            type="number"
            value={stringifyAmount(toTransfer, requiredDisplayInfo)}
            error={toTransfer < required}
            helperText={
              toTransfer < required && `Needs at least ${requiredDisplay}`
            }
            onChange={ev =>
              setToTransfer(parseValue(ev.target.value, requiredDisplayInfo))
            }
          />
          <Button onClick={onTransfer}>Transfer</Button>

          <TransferStepper
            eth={denorm(balances.eth.value)}
            outgoingEth={denorm(outgoing.eth)}
            peggy={denorm(balances.peggy.value)}
            outgoingPeggy={denorm(outgoing.peggy)}
            agoric={
              REALLY_PEGGY
                ? fundPurse &&
                  stringifyAmount(fundPurse.value, fundPurse.displayInfo)
                : denorm(balances.agoric.value)
            }
          ></TransferStepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Done</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
