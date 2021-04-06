import React from 'react';
import Snackbar from '@material-ui/core/Snackbar';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';

const ApproveOfferSB = ({
  open,
  handleClose,
  message = 'Please approve the offer in your wallet',
}) => (
  <Snackbar
    open={open}
    autoHideDuration={6000}
    onClose={handleClose}
    message={message}
    action={
      <React.Fragment>
        <IconButton
          size="small"
          aria-label="close"
          color="inherit"
          onClick={handleClose}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </React.Fragment>
    }
  />
);
export default ApproveOfferSB;
