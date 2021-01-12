import React, { useCallback, useEffect, useState } from 'react';

import { ethers } from 'ethers';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import { Button, Divider, Paper } from '@material-ui/core';

import {
  BIG_DECIMAL_PLACES,
  BigDec,
  convertBigint,
  stringifyDecimal,
} from '../display';
import PeggyContract from '../Peggy.json';

import {
  PEGGY_CONTRACT_ADDRESS,
  ERC20_ADDRESS,
  PEGGY_COSMOS_ADDRESS,
  PEGGY_COSMOS_ADDRESS_HEX,
  PEGGY_TRANSFER_AGENT_URL,
} from '../peggyConfig.js';

import { stringifyValue, parseValue } from './display';

const REALLY_PEGGY = !!process.env.REACT_APP_REALLY_PEGGY;

const INITIAL_BALANCES = REALLY_PEGGY
  ? [
      { value: BigDec(0), decimals: 0 },
      { value: BigDec(0), decimals: 0 },
      { value: BigDec(0), decimals: 0 },
    ]
  : [
      { value: BigDec(110.0402), decimals: 18 },
      { value: BigDec(20), decimals: 18 },
      { value: BigDec(30), decimals: 6 },
    ];

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

const ETHEREUM_I = 0;
const PEGGY_I = 1;
const AGORIC_I = 2;

export default function TransferDialog({
  toTransfer,
  setToTransfer,
  required,
  requiredSymbol,
  requiredDisplayInfo,
}) {
  const requiredDisplay = stringifyValue(required, requiredDisplayInfo);
  const [transferring, setTransferring] = useState(false);
  const [stateChange, setStateChange] = useState(0);
  const [provider, setEthProvider] = useState();
  const onClose = useCallback(() => {
    setTransferring(undefined);
    setToTransfer();
  });

  const [balances, setBalances] = useState(INITIAL_BALANCES);

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
              if (denom === ERC20_ADDRESS) {
                setBalances(oldBalances => {
                  const newBalances = [...oldBalances];
                  const value = convertBigint(
                    BigInt(amount),
                    newBalances[PEGGY_I].decimals,
                    BIG_DECIMAL_PLACES,
                  );
                  newBalances[PEGGY_I] = { ...newBalances[PEGGY_I], value };
                  return newBalances;
                });
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
      const decimals = await contract.decimals();
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
        const value = convertBigint(
          BigInt(balance.toHexString()),
          decimals,
          BIG_DECIMAL_PLACES,
        );
        console.log('have value', value);
        setBalances(oldBalances => {
          if (
            oldBalances[ETHEREUM_I].decimals === decimals &&
            oldBalances[ETHEREUM_I].value === value &&
            oldBalances[PEGGY_I].decimals === decimals
          ) {
            console.log('skipping value', decimals, value);
            return oldBalances;
          }
          const newBalances = [...oldBalances];
          newBalances[ETHEREUM_I] = { value, decimals };
          newBalances[PEGGY_I] = { ...newBalances[PEGGY_I], decimals };
          console.log('have newBalances', newBalances);
          return newBalances;
        });
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

  const [outgoing, setOutgoing] = useState([BigInt(0), BigInt(0), BigInt(0)]);

  const sendTokensStub = async (sourceIndex, amount, _srcDecimals) => {
    // TODO: Actually initiate a transfer.
    const targetIndex = sourceIndex + 1;
    setBalances(bals =>
      bals.map((bal, idx) =>
        idx === sourceIndex ? { ...bal, value: bal.value - amount } : bal,
      ),
    );

    // Update the outgoing state to drive the animations.
    setOutgoing(outs =>
      outs.map((out, idx) => (idx === sourceIndex ? out + amount : out)),
    );

    // TODO: Actually react to balance change.
    setTimeout(() => {
      setBalances(bals =>
        bals.map((bal, idx) =>
          idx === targetIndex ? { ...bal, value: bal.value + amount } : bal,
        ),
      );
      // Update the outgoing state to cancel the animations.
      setOutgoing(outs =>
        outs.map((out, idx) => (idx === sourceIndex ? out - amount : out)),
      );

      setStateChange(n => n + 1);
    }, 3000);
  };

  const sendTokensEth = useCallback(
    async (sourceIndex, amount, srcDecimals) => {
      // Transferring from ETH.
      if (!provider) {
        return;
      }

      const amountToSend = convertBigint(
        amount,
        BIG_DECIMAL_PLACES,
        srcDecimals,
      );

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
        `${amountToSend}`, // AmountToSend
      );

      // Update the outgoing state to drive the animations.
      setOutgoing(outs =>
        outs.map((out, idx) => (idx === sourceIndex ? out + amount : out)),
      );

      // https://docs.ethers.io/v5/api/providers/types/#providers-TransactionResponse
      console.log('wait for confirmation');
      const { blockNumber } = await txResponse.wait(1);
      console.log('Confirmed in block number', blockNumber);

      // Update the outgoing state to cancel the animations.
      setOutgoing(outs =>
        outs.map((out, idx) => (idx === sourceIndex ? out - amount : out)),
      );
    },
    [provider],
  );

  const sendTokenses = REALLY_PEGGY
    ? [sendTokensEth, sendTokensStub]
    : [sendTokensStub, sendTokensStub];

  const runStateMachine = useCallback(() => {
    let targetIndex = balances.length - 1;
    let targetNeeded = transferring;

    if (targetNeeded < balances[targetIndex].value) {
      // Done!
      setTransferring(undefined);
      alert('done transfer');
      return;
    }

    let sourceIndex = targetIndex - 1;
    let difference = targetNeeded;
    while (sourceIndex >= 0) {
      targetNeeded -= balances[targetIndex].value;
      difference = targetNeeded - outgoing[sourceIndex];

      if (difference <= 0) {
        // Base case, the transfer is already happening.
        return;
      }

      if (difference <= balances[sourceIndex].value) {
        // The current source has enough.
        break;
      }

      // We need to get more from the next source.
      sourceIndex -= 1;
      targetIndex -= 1;
    }

    if (targetIndex <= 0 && balances[0].value < difference) {
      // We can't get more!
      alert(`transfer source needs ${difference - balances[0].value} more!`);
      return;
    }

    // Actually start a transfer now that we've pooled enough.
    console.log(
      'starting transfer from',
      sourceIndex,
      'to',
      targetIndex,
      'of',
      difference,
    );

    sendTokenses[sourceIndex](
      sourceIndex,
      difference,
      balances[sourceIndex].decimals,
    ).catch(e => console.error(`Error sending from ${sourceIndex}`, e.stack));
  }, [transferring, balances, outgoing]);

  const onTransfer = useCallback(() => {
    setTransferring(toTransfer);
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
          {required && (
            <Typography component="h5" gutterBottom>
              This vault requires {requiredDisplay} {requiredSymbol}
            </Typography>
          )}
          <TextField
            variant="outlined"
            required
            label={`Target ${requiredSymbol}`}
            type="number"
            value={stringifyValue(toTransfer, requiredDisplayInfo)}
            error={BigDec(toTransfer) < BigDec(required)}
            helperText={
              BigDec(toTransfer) < BigDec(required) &&
              `Needs at least ${requiredDisplay}`
            }
            onChange={ev =>
              setToTransfer(parseValue(ev.target.value, requiredDisplayInfo))
            }
          />
          <Button onClick={onTransfer}>Transfer</Button>
          <Divider />
          <Paper>Ethereum {stringifyDecimal(balances[ETHEREUM_I].value)}</Paper>
          {stringifyDecimal(outgoing[ETHEREUM_I])}
          <Paper>Peggy {stringifyDecimal(balances[PEGGY_I].value)}</Paper>
          {stringifyDecimal(outgoing[PEGGY_I])}
          <Paper>Agoric {stringifyDecimal(balances[AGORIC_I].value)}</Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
