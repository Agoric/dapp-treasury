import React from 'react';

import {
  FormControl,
  FormLabel,
  Radio,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@material-ui/core';

import { stringifyValue } from '@agoric/ui-components';

import '../../types/types';

import { setVaultCollateral } from '../../store';
import { toPrintedPercent } from '../../utils/helper';
import { makeGetDecimalPlaces } from '../helpers';

const displayPetname = petname =>
  Array.isArray(petname) ? petname[1] : petname;

const collateralAvailable = c => Array.isArray(c) && c.length > 0;
const noCollateralAvailableDiv = (
  <div>No assets are available to use as collateral.</div>
);

const headCells = [
  { id: 'petname', label: 'Asset' },
  { id: 'marketPrice', label: 'Market Price' },
  { id: 'initialMargin', label: 'Collateral Ratio' },
  { id: 'liqMargin', label: 'Liquidation Ratio' },
  { id: 'stabilityFee', label: 'Interest Rate' },
];

const makeHeaderCell = data => (
  <TableCell key={data.id}>{data.label}</TableCell>
);

const percentCell = x => (
  <TableCell align="right">{toPrintedPercent(x, 2n)}%</TableCell>
);

/**
 * Display a row per brand of potential collateral
 *
 * @param {(collateralInfo) => () => void} makeOnClick
 * @param {(brand: Brand) => number} getDecimalPlaces
 * @param {CollateralInfo} row
 * @returns {import('react').ReactComponentElement}
 */
const makeCollateralRow = (makeOnClick, getDecimalPlaces, row) => {
  // const marketPriceDisplayOptions = {
  //   numDecimalPlaces: getDecimalPlaces(row.marketPrice.numerator.brand),
  //   denomDecimalPlaces: getDecimalPlaces(row.marketPrice.denominator.brand),
  //   numPlacesToShow: 2,
  // };

  // TODO: fix instead of hard-coding
  // const marketPriceDisplayOptions = {
  //   numDecimalPlaces: 0,
  //   denomDecimalPlaces: 0,
  //   numPlacesToShow: 2,
  // };
  return (
    <TableRow key={JSON.stringify(row.petname)}>
      <TableCell padding="checkbox">
        <Radio onClick={makeOnClick(row)} />
      </TableCell>
      <TableCell>{displayPetname(row.petname)}</TableCell>
      <TableCell align="right">
        ${stringifyValue(row.marketPrice.numerator.value)}
      </TableCell>
      {percentCell(row.initialMargin)}
      {percentCell(row.liquidationMargin)}
      {percentCell(row.stabilityFee)}
    </TableRow>
  );
};

/**
 * Make the table of collateral options to choose from.
 *
 * @param {Collaterals} collaterals
 * @param {(CollateralInfo) => () => void} makeOnClick
 * @param {(brand: Brand) => number} getDecimalPlaces
 * @returns {import('react').ReactComponentElement}
 */
const makeCollateralTable = (collaterals, makeOnClick, getDecimalPlaces) => {
  const makeRow = row => makeCollateralRow(makeOnClick, getDecimalPlaces, row);
  return (
    <div>
      <FormControl component="fieldset">
        <FormLabel component="legend">Choose collateral</FormLabel>{' '}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                {headCells.map(makeHeaderCell)}
              </TableRow>
            </TableHead>
            <TableBody>{collaterals.map(makeRow)}</TableBody>
          </Table>
        </TableContainer>
      </FormControl>
    </div>
  );
};

// TODO: get decimalPlaces for row.marketPrice.numerator.value
function VaultCollateral({ dispatch, collaterals, brands }) {
  const makeOnClick = row => _ev => {
    dispatch(setVaultCollateral(row));
  };

  const getDecimalPlaces = makeGetDecimalPlaces(brands);

  if (!collateralAvailable(collaterals)) {
    return noCollateralAvailableDiv;
  }

  return makeCollateralTable(collaterals, makeOnClick, getDecimalPlaces);
}

export default VaultCollateral;
