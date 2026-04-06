import { ActionFormProps } from 'components/flow/props';
import { composeComponentTestUtils, composeDuxState, mock } from 'testUtils';
import {
  createCallBrainAction,
  getActionFormProps,
} from 'testUtils/assetCreators';
import * as utils from 'utils';

import { BrainForm } from 'components/flow/actions/callbrain/CallBrainForm';
import { set } from 'utils';

mock(utils, 'createUUID', utils.seededUUIDs());

const baseProps = {
  ...getActionFormProps(createCallBrainAction({ entry: null })),
  brainInfo: {
    name: 'Dóris',
    occupation: 'Marketing Specialist',
    enabled: true,
  },
  entry: null as string,
};

const { setup } = composeComponentTestUtils<ActionFormProps>(
  BrainForm,
  baseProps,
  composeDuxState({
    flowContext: {
      brainInfo: set({
        name: 'Dóris',
        occupation: 'Marketing Specialist',
        enabled: true,
      }),
    },
  }),
);

describe(BrainForm.name, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render', () => {
    const { instance } = setup(true);

    expect(instance).toMatchSnapshot();
  });

  it('should render without original action', () => {
    const { instance } = setup(true, {
      nodeSettings: { $merge: { originalAction: null } },
    });

    expect(instance).toMatchSnapshot();
  });

  it('should save', () => {
    const { instance, props } = setup(true);

    instance.handleEntryChange('brain entry text');

    instance.getButtons().primary.onClick();

    expect(props.updateAction).toHaveBeenCalled();
    expect(props.updateAction).toMatchSnapshot();
    expect(props.onClose).toHaveBeenCalled();
  });

  it('should cancel without changes', () => {
    const { instance, props } = setup(true);

    instance.getButtons().secondary.onClick();

    expect(props.updateAction).not.toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalled();
  });
});
