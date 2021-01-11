import React, { useCallback, useEffect, useState } from 'react';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';
import { Button, Divider, Paper } from '@material-ui/core';

import { BigDec, stringifyDecimal } from '../display';

export default function TransferDialog({
  toTransfer,
  setToTransfer,
  required,
  requiredSymbol,
}) {
  const [transferring, setTransferring] = useState(false);
  const [stateChange, setStateChange] = useState(0);
  const onClose = useCallback(() => {
    setTransferring(undefined);
    setToTransfer();
  });

  const [balances, setBalances] = useState([
    { value: BigDec('109.1004'), decimals: 18 },
    { value: BigDec('20'), decimals: 18 },
    { value: BigDec(30), decimals: 9 },
  ]);

  const [outgoing, setOutgoing] = useState([BigInt(0), BigInt(0), BigInt(0)]);

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
    // TODO: Actually initiate a transfer.
    setBalances(bals =>
      bals.map((bal, idx) =>
        idx === sourceIndex ? { ...bal, value: bal.value - difference } : bal,
      ),
    );

    // Update the outgoing state to drive the animations.
    setOutgoing(outs =>
      outs.map((out, idx) => (idx === sourceIndex ? out + difference : out)),
    );

    // TODO: Actually react to balance change.
    setTimeout(() => {
      setBalances(bals =>
        bals.map((bal, idx) =>
          idx === targetIndex ? { ...bal, value: bal.value + difference } : bal,
        ),
      );
      // Update the outgoing state to cancel the animations.
      setOutgoing(outs =>
        outs.map((out, idx) => (idx === sourceIndex ? out - difference : out)),
      );

      setStateChange(n => n + 1);
    }, 3000);
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
              This vault requires {stringifyDecimal(required)} {requiredSymbol}
            </Typography>
          )}
          <TextField
            variant="outlined"
            required
            label={`Target ${requiredSymbol}`}
            type="number"
            value={stringifyDecimal(toTransfer)}
            error={BigDec(toTransfer) < BigDec(required)}
            helperText={
              BigDec(toTransfer) < BigDec(required) &&
              `Needs at least ${stringifyDecimal(required)}`
            }
            onChange={ev => setToTransfer(BigDec(ev.target.value))}
          />
          <Button onClick={onTransfer}>Transfer</Button>
          <Divider />
          <Paper>Ethereum {stringifyDecimal(balances[0].value)}</Paper>
          {stringifyDecimal(outgoing[0])}
          <Paper>Peggy {stringifyDecimal(balances[1].value)}</Paper>
          {stringifyDecimal(outgoing[1])}
          <Paper>Agoric {stringifyDecimal(balances[2].value)}</Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
