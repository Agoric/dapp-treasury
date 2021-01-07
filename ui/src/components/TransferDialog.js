import React, { useCallback } from 'react';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Typography from '@material-ui/core/Typography';

export default function TransferDialog({
  toTransfer,
  setToTransfer,
  required,
  requiredSymbol,
}) {
  const onClose = useCallback(() => setToTransfer());
  return (
    <>
      <Dialog onClose={onClose} open={toTransfer !== undefined}>
        <DialogTitle onClose={onClose}>Transfer funds</DialogTitle>
        <DialogContent>
          {required && (
            <Typography component="h5">
              This vault configuration requires at least an additional{' '}
              {required} {requiredSymbol}
            </Typography>
          )}
          <TextField
            variant="outlined"
            required
            label={`${requiredSymbol} to transfer`}
            type="number"
            value={toTransfer}
            error={toTransfer < required}
            helperText={`Needs at least ${required}`}
            onChange={ev => setToTransfer(ev.target.value)}
          />
        </DialogContent>
        <DialogActions>foo</DialogActions>
      </Dialog>
    </>
  );
}
