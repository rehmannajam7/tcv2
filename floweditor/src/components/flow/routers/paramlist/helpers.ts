import { ParamProps } from 'components/flow/routers/paramlist/ParamList';
import { createUUID } from 'utils';

export const createEmptyParam = (): ParamProps => {
  const uuid = createUUID();
  return {
    uuid,
    type: '',
    verboseName: '',
    filters: [],
    filter: { value: null },
    data: { value: '' },
    valid: true,
  };
};
