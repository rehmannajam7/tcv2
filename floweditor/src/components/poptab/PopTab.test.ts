import { PopTab, PopTabProps } from 'components/poptab/PopTab';
import { composeComponentTestUtils } from 'testUtils';
import { shallowToJson } from 'enzyme-to-json';

const baseProps: PopTabProps = {
  visible: true,
  label: 'Show Revisions',
  top: '50px',
  color: 'red',
  icon: 'fe-history',
  header: 'Revisions',
  onShow: vi.fn(),
  onHide: vi.fn(),
};

const { setup } = composeComponentTestUtils(PopTab, baseProps);

describe(PopTab.name, () => {
  describe('render', () => {
    it('should render base component', async () => {
      const { wrapper } = setup();
      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });
  });
});
