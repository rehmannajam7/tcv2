import { Types } from 'config/interfaces';
import { CallBrain } from 'flowTypes';
import { NodeEditorSettings } from 'store/nodeEditor';
import { getActionUUID } from 'components/flow/actions/helpers';
import { CallBrainFormData, CallBrainFormState } from './CallBrainForm';

export const initializeForm = (
  settings: NodeEditorSettings,
): CallBrainFormState => {
  if (
    settings.originalAction &&
    settings.originalAction.type === Types.call_brain
  ) {
    const action = settings.originalAction as CallBrain;
    return {
      entry: {
        value: action.entry || '@input.text',
      },
    };
  }
  return {
    entry: {
      value: '@input.text',
    },
  };
};
export const updateBrainAction = (
  settings: NodeEditorSettings,
  state: CallBrainFormData,
): CallBrain => {
  return {
    type: Types.call_brain,
    uuid: getActionUUID(settings, Types.call_brain),
    brainInfo: state.brainInfo,
    entry: state.entry.value,
  };
};
