import React from 'react';
import Snackbar from '@material-ui/core/Snackbar';
import Alert from '@material-ui/lab/Alert';

const ApproveOfferSB = ({
  open,
  handleClose,
  message = 'Please approve the offer in your wallet',
}) => (
  <Snackbar open={open} onClose={handleClose} autoHideDuration={6000}>
    <Alert onClose={handleClose} severity="success">
      {message}
    </Alert>
  </Snackbar>
);
export default ApproveOfferSB;
