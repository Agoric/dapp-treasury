/* eslint-disable import/no-extraneous-dependencies */
import { mount } from 'enzyme';
import { MemoryRouter } from 'react-router-dom';
import NavDrawer from '../NavDrawer';

const state = {};

const useApplicationContext = () => ({
  state,
});

jest.mock('../../contexts/Application', () => ({ useApplicationContext }));

beforeEach(() => {
  state.useGetRUN = false;
});

test('renders the getRUN link if getRUN is enabled', () => {
  state.useGetRUN = true;
  const component = mount(
    <MemoryRouter initialEntries={['/']}>
      <NavDrawer />
    </MemoryRouter>,
  );

  expect(component.text()).toContain('getRUN');
});

test('does not render the getRUN link if getRUN is disabled', () => {
  const component = mount(
    <MemoryRouter initialEntries={['/']}>
      <NavDrawer />
    </MemoryRouter>,
  );

  expect(component.text()).not.toContain('getRUN');
});
