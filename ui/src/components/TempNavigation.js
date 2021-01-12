// Have a navigation bar that only pops up when a button is clicked.
import React from 'react';
import { makeStyles, useTheme } from '@material-ui/core/styles';

import Drawer from '@material-ui/core/Drawer';

const useStyles = makeStyles(_theme => ({
  drawerPaper: ({ drawerWidth }) => ({
    width: drawerWidth,
  }),
}));

function TempNavigation({ setIsOpen, isOpen, drawerWidth = 240, children }) {
  const classes = useStyles({ drawerWidth });
  const theme = useTheme();

  const handleClose = event => {
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      return;
    }
    setIsOpen(false);
  };

  return (
    <nav aria-label="navigation">
      <Drawer
        variant="temporary"
        anchor={theme.direction === 'rtl' ? 'right' : 'left'}
        open={isOpen}
        onClose={handleClose}
        onClick={handleClose}
        onKeyDown={handleClose}
        classes={{
          paper: classes.drawerPaper,
        }}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
      >
        {children}
      </Drawer>
    </nav>
  );
}

export default TempNavigation;
