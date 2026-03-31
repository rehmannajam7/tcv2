import {
  RevisionExplorer,
  RevisionExplorerProps,
} from 'components/revisions/RevisionExplorer';
import { AssetType } from 'store/flowContext';
import { composeComponentTestUtils } from 'testUtils';
import { shallowToJson } from 'enzyme-to-json';

const baseProps: RevisionExplorerProps = {
  assetStore: {
    revisions: {
      id: 'id',
      endpoint: '/assets/revisions.json',
      type: AssetType.Revision,
      items: {},
    },
    flows: {
      endpoint: '/assets/flows.json',
      type: AssetType.Flow,
      items: {},
    },
  },
  createNewRevision: vi.fn(),
  loadFlowDefinition: vi.fn(),
  utc: true,
  onToggled: vi.fn(),
  popped: '',
  mutable: true,
};

const { setup } = composeComponentTestUtils<RevisionExplorerProps>(
  RevisionExplorer,
  baseProps,
);

describe(RevisionExplorer.name, () => {
  describe('render', () => {
    it('should render base component', async () => {
      const { wrapper, instance } = setup();

      await instance.handleUpdateRevisions();

      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });
  });
});
