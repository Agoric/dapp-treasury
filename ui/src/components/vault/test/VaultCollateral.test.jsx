/* eslint-disable import/no-extraneous-dependencies */
import { mount } from 'enzyme';

import VaultCollateral from '../VaultCollateral';

const state = {};

const useApplicationContext = () => ({
  state,
});

jest.mock('../../../contexts/Application', () => ({ useApplicationContext }));

jest.mock('../../../store', () => ({
  setVaultCollateral: jest.fn(),
  setLoadTreasuryError: jest.fn(),
}));

jest.mock('../../helpers', () => ({
  makeDisplayFunctions: _brandToInfo => ({
    displayPercent: (val, _places) => `${val}`,
    displayBrandPetname: brand => `${brand}`,
    displayRatio: (ratio, _places) => `${ratio}`,
  }),
}));

const purses = [{ brand: 'BLD' }];
const collaterals = [
  {
    brand: 'BLD',
    marketPrice: '2.4',
    liquidationMargin: '125',
    interestRate: '2',
  },
];
const brandToInfo = {};

test('renders the interest rates', () => {
  const component = mount(
    <VaultCollateral
      dispatch={jest.fn()}
      purses={purses}
      collaterals={collaterals}
      brandToInfo={brandToInfo}
    />,
  );

  const rows = component.find('tr');

  // One header row and one row for each collateral
  expect(rows.length).toBe(2);

  expect(
    rows
      .at(1)
      .find('td')
      .at(4)
      .text(),
  ).toContain(`${collaterals[0].interestRate}%`);
});
