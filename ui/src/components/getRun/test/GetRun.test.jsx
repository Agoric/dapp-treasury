/* eslint-disable import/no-extraneous-dependencies */
import { mount } from 'enzyme';
import GetRun from '../GetRun';

const state = {};

const useApplicationContext = () => ({
  state,
});

jest.mock('../../../contexts/Application', () => ({ useApplicationContext }));

jest.mock('../EconomyDetails', () => () => 'EconomyDetails');

test('renders the header', () => {
  const component = mount(<GetRun />);

  expect(component.find('h3').text()).toContain('RUNStake');
});
