import { Simulator, SimulatorProps } from 'components/simulator/Simulator';
import { composeComponentTestUtils } from 'testUtils';
import { shallowToJson } from 'enzyme-to-json';

const { setup } = composeComponentTestUtils<SimulatorProps>(Simulator, {
  nodes: {},
  activity: null,
  definition: {
    name: 'Simulate this',
    uuid: '28742b21-4762-4184-91c8-cc7324a30402',
    nodes: [],
    revision: 1,
    localization: {},
    language: null,
    _ui: null,
    spec_version: '13.1.0',
  },
  liveActivity: null,
  mergeEditorState: vi.fn(),
  language: null,
  onToggled: vi.fn(),
  popped: '',
});

describe(Simulator.name, () => {
  it('renders', () => {
    const { wrapper } = setup();
    expect(shallowToJson(wrapper)).toMatchSnapshot();
  });
});
