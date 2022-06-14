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

const purses = [{ brand: 'BLD' }, { brand: 'ATOM' }];
const collaterals = [
  {
    brand: 'BLD',
    marketPrice: '2.4',
    liquidationMargin: '125',
    interestRate: '2',
  },
  {
    brand: 'ATOM',
    marketPrice: '2.4',
    liquidationMargin: '125',
    interestRate: '3',
  },
];
const brandToInfo = {};
const assets = new Map([
  ['BLD', { totalDebt: { brand: 'RUN', value: 4000n } }],
  ['ATOM', { totalDebt: { brand: 'RUN', value: 8000n } }],
]);
const governedParams = new Map([
  [
    'BLD',
    { DebtLimit: { type: 'amount', value: { brand: 'RUN', value: 10000n } } },
  ],
  [
    'ATOM',
    { DebtLimit: { type: 'amount', value: { brand: 'RUN', value: 20000n } } },
  ],
]);

test('renders the interest rates', () => {
  const component = mount(
    <VaultCollateral
      dispatch={jest.fn()}
      purses={purses}
      collaterals={collaterals}
      brandToInfo={brandToInfo}
      assets={assets}
      governedParams={governedParams}
    />,
  );

  const rows = component.find('tr');

  // One header row and one row for each collateral
  expect(rows.length).toBe(3);

  expect(rows.at(1).find('td').at(4).text()).toContain(
    `${collaterals[0].interestRate}%`,
  );
  expect(rows.at(2).find('td').at(4).text()).toContain(
    `${collaterals[1].interestRate}%`,
  );
});

test('does not render if purse is missing', () => {
  const pursesToUse = purses.slice(1);
  const component = mount(
    <VaultCollateral
      dispatch={jest.fn()}
      purses={pursesToUse}
      collaterals={collaterals}
      brandToInfo={brandToInfo}
      assets={assets}
      governedParams={governedParams}
    />,
  );

  const rows = component.find('tr');

  expect(rows.length).toBe(2);
});

test('does not render if asset is missing', () => {
  const assetsToUse = new Map(assets);
  assetsToUse.delete('BLD');

  const component = mount(
    <VaultCollateral
      dispatch={jest.fn()}
      purses={purses}
      collaterals={collaterals}
      brandToInfo={brandToInfo}
      assets={assetsToUse}
      governedParams={governedParams}
    />,
  );

  const rows = component.find('tr');

  expect(rows.length).toBe(2);
});

test('does not render if params are missing', () => {
  const paramsToUse = new Map(governedParams);
  paramsToUse.delete('BLD');

  const component = mount(
    <VaultCollateral
      dispatch={jest.fn()}
      purses={purses}
      collaterals={collaterals}
      brandToInfo={brandToInfo}
      assets={assets}
      governedParams={paramsToUse}
    />,
  );

  const rows = component.find('tr');

  expect(rows.length).toBe(2);
});
