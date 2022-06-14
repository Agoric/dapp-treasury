/* eslint-disable import/no-extraneous-dependencies */
import { mount } from 'enzyme';

import History from '../History';

jest.mock('../../../helpers', () => ({
  makeDisplayFunctions: _brandToInfo => ({
    displayAmount: (amount, _places) => `${amount.value}`,
    displayBrandPetname: brand => `${brand}`,
  }),
}));

jest.mock('@agoric/ertp', () => ({
  AmountMath: {
    make: (brand, value) => ({ brand, value }),
    makeEmpty: brand => ({ brand, value: 0n }),
  },
}));

const brand = 'BLD';
const debtBrand = 'RUN';
const vaultToManageId = 0;

/** @type {typeof import('../../../../store').initial.vaultHistory } */
const history = {
  0: {
    0: {
      status: 'accept',
      meta: { creationStamp: 1652035986400 },
      proposalForDisplay: {
        give: { Collateral: { amount: { brand, value: 2000n } } },
        want: { RUN: { amount: { debtBrand, value: 400n } } },
      },
    },
    1: {
      status: 'accept',
      meta: { creationStamp: 1652036490300 },
      proposalForDisplay: {
        give: { RUN: { amount: { debtBrand, value: 100n } } },
        want: { Collateral: { amount: { brand, value: 500n } } },
      },
    },
    2: {
      status: undefined,
      meta: { creationStamp: 1652036022940 },
      proposalForDisplay: {
        give: { RUN: { amount: { debtBrand, value: 150n } } },
        want: { Collateral: { amount: { brand, value: 550n } } },
      },
    },
  },
  3: {
    3: {
      status: 'accept',
      meta: { creationStamp: 1652035986400 },
      proposalForDisplay: {
        give: { Collateral: { amount: { brand, value: 2000n } } },
        want: { RUN: { amount: { debtBrand, value: 400n } } },
      },
    },
  },
};

test('renders a message when there is no history', () => {
  const component = mount(
    <History
      vaultId={vaultToManageId}
      history={{}}
      brandToInfo={{}}
      brand={brand}
      debtBrand={debtBrand}
    />,
  );

  expect(component.text()).toContain('Transactions will appear here.');
});

test('renders the history of all vault adjustments', () => {
  const component = mount(
    <History
      vaultId={vaultToManageId}
      history={history}
      brandToInfo={{}}
      brand={brand}
      debtBrand={debtBrand}
    />,
  );

  expect(component.text()).not.toContain('Transactions will appear here.');
  const rows = component.find('tr');

  expect(rows.length).toEqual(3);
  const header = rows.at(0).find('th');

  expect(header.at(0).text()).toContain('Date');
  expect(header.at(1).text()).toContain('Deposited');
  expect(header.at(2).text()).toContain('Borrowed');

  const expectCellText = (row, column, text) =>
    expect(rows.at(row).find('td').at(column).text()).toEqual(text);
  expectCellText(1, 0, '5/8/22, 7:01 PM');
  expectCellText(2, 0, '5/8/22, 6:53 PM');

  expectCellText(1, 1, '-500 BLD');
  expectCellText(2, 1, '2000 BLD');

  expectCellText(1, 2, '-100 RUN');
  expectCellText(2, 2, '400 RUN');
});
