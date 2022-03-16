import React from 'react';

import { makeStyles, withStyles } from '@material-ui/core/styles';
import InputBase from '@material-ui/core/InputBase';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';

import { filterPurses } from '@agoric/ui-components';

const useStyles = makeStyles(_theme => ({
  container: {
    border: '1px solid rgba(0, 0, 0, 0.23)',
    borderRadius: 4,
    height: 56,
    padding: 6,
    boxSizing: 'border-box',
  },
  infoTop: {
    fontSize: 14,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: 'rgb(112, 112, 112)',
    paddingRight: 4,
  },
  purseSelector: {
    color: 'rgb(112, 112, 112)',
  },
  purseBalance: {
    fontSize: 14,
    color: 'rgb(112, 112, 112)',
  },
  icon: {
    height: 42,
    width: 42,
  },
}));

const StyledSelect = withStyles(theme => ({
  input: {
    borderRadius: 4,
    border: 'none',
    color: 'rgb(112, 112, 112)',
    fontSize: 16,
    padding: '4px 0',
    transition: theme.transitions.create(['border-color', 'box-shadow']),
    '&:focus': {
      backgroundColor: 'inherit',
    },
  },
}))(InputBase);

const NatPurseAmountInput = ({
  purses,
  purseSelected,
  onPurseChange,
  brandToFilter,
  iconSrc,
}) => {
  const classes = useStyles();
  const pursesFiltered = filterPurses(purses, brandToFilter);
  const defaultPurse = pursesFiltered.length > 0 ? pursesFiltered[0] : null;
  if (purseSelected === null && defaultPurse !== null) {
    onPurseChange(defaultPurse);
  }
  const [age, setAge] = React.useState('');
  const handleChange = event => {
    setAge(event.target.value);
  };
  return (
    <>
      <div className={classes.infoTop}>
        <div className={classes.purseSelector}>
          <FormControl className={classes.margin}>
            <Select
              value={age}
              onChange={handleChange}
              input={<StyledSelect />}
            >
              <MenuItem value={10}>Ten</MenuItem>
              <MenuItem value={20}>Twenty</MenuItem>
              <MenuItem value={30}>Thirty</MenuItem>
            </Select>
          </FormControl>
        </div>
        <div className={classes.purseBalance}>Balance: 40.05 RUN</div>
      </div>
      <div className={classes.container}>
        {iconSrc && <img className={classes.icon} src={iconSrc} />}
      </div>
    </>
  );
};

export default NatPurseAmountInput;
