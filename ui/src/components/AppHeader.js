import React from 'react';
import { makeStyles } from '@material-ui/core/styles';

import AppBar from '@material-ui/core/AppBar';
import IconButton from '@material-ui/core/IconButton';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import MenuIcon from '@material-ui/icons/Menu';

const useStyles = makeStyles(theme => ({
  appBar: ({ drawerWidth }) => ({
    position: 'sticky',
    ...(drawerWidth && {
      [theme.breakpoints.up('sm')]: {
        width: `calc(100% - ${drawerWidth}px)`,
        marginLeft: drawerWidth,
      },
    }),
  }),
  menuButton: ({ drawerWidth }) => ({
    marginRight: theme.spacing(2),
    ...(drawerWidth && {
      [theme.breakpoints.up('sm')]: {
        display: 'none',
      },
    }),
  }),
  title: {
    flexGrow: 1,
  },
}));

function AppHeader({ handleDrawerToggle, children, drawerWidth }) {
  const classes = useStyles({ drawerWidth });

  return (
    <AppBar className={classes.appBar}>
      <Toolbar>
        <IconButton
          edge="start"
          className={classes.menuButton}
          color="inherit"
          aria-label="menu"
          onClick={handleDrawerToggle}
        >
          <MenuIcon />
        </IconButton>
        <img src="./white-logo.png" height="48" width="48" alt="Agoric Logo" />
        <Typography variant="h6" className={classes.title} noWrap>
          Agoric Core Economy
        </Typography>
        {children}
      </Toolbar>
    </AppBar>
  );
}

export default AppHeader;
