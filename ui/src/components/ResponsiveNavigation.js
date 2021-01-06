// This is a more complex navigation that is permanent on wider
// screens, but temporary on narrow mobile.
// https://material-ui.com/components/drawers/#responsive-drawer
import React from 'react';
import { makeStyles, useTheme } from '@material-ui/core/styles';

import Drawer from '@material-ui/core/Drawer';
import Hidden from '@material-ui/core/Hidden';

const useStyles = makeStyles(theme => ({
  drawer: ({ drawerWidth }) => ({
    [theme.breakpoints.up('sm')]: {
      width: drawerWidth,
      flexShrink: 0,
    },
  }),
  drawerPaper: ({ drawerWidth }) => ({
    width: drawerWidth,
  }),
}));

function ResponsiveNavigation({
  setIsOpen,
  isOpen,
  drawerWidth = 240,
  children,
}) {
  const classes = useStyles({ drawerWidth });
  const theme = useTheme();

  const handleClose = () => setIsOpen(false);

  return (
    <nav className={classes.drawer} aria-label="navigation">
      <Hidden smUp implementation="css">
        <Drawer
          variant="temporary"
          anchor={theme.direction === 'rtl' ? 'right' : 'left'}
          open={isOpen}
          onClose={handleClose}
          onClick={handleClose}
          classes={{
            paper: classes.drawerPaper,
          }}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
        >
          {children}
        </Drawer>
      </Hidden>
      <Hidden xsDown implementation="css">
        <Drawer
          classes={{ paper: classes.drawerPaper }}
          variant="permanent"
          anchor="left"
          open
        >
          {children}
        </Drawer>
      </Hidden>
    </nav>
  );
}

export default ResponsiveNavigation;
