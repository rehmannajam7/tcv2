import ParamList from 'components/flow/routers/paramlist/ParamList';
import React from 'react';
import {
  fireEvent,
  fireChangeText,
  render,
  fireUnnnicInputChangeText,
  act,
} from 'test/utils';
import { mock } from 'testUtils';
import * as utils from 'utils';

const services = require('test/assets/external_services.json');
const sampleParams = services.results[1].actions[0].params;

mock(utils, 'createUUID', utils.seededUUIDs());

const paramUUID1 = utils.createUUID();
const paramUUID2 = utils.createUUID();

const omieParams = [
  {
    ...services.results[1].actions[0].params[0],
    uuid: paramUUID1,
    filter: { value: services.results[1].actions[0].params[0].filters[0] },
    data: { value: 'data 1' },
    valid: true,
  },
  {
    ...services.results[1].actions[0].params[1],
    uuid: paramUUID2,
    filter: { value: services.results[1].actions[0].params[1].filters[0] },
    data: { value: 'data 2' },
    valid: true,
  },
];

describe(ParamList.name, () => {
  describe('Omie', () => {
    describe('render', () => {
      it('should render list with an empty param', () => {
        const { baseElement } = render(
          <ParamList
            availableParams={sampleParams}
            params={[]}
            onParamsUpdated={vi.fn()}
            shouldCreateEmptyParam={true}
          />,
        );
        expect(baseElement).toMatchSnapshot();
      });
      it('should render list of params', () => {
        const { baseElement } = render(
          <ParamList
            availableParams={sampleParams}
            params={omieParams}
            onParamsUpdated={vi.fn()}
            shouldCreateEmptyParam={true}
          />,
        );
        expect(baseElement).toMatchSnapshot();
      });
    });

    describe('updates', () => {
      it('should remove param and ensure empty param exists', () => {
        const { baseElement, getByTestId, queryByTestId } = render(
          <ParamList
            availableParams={sampleParams}
            params={[omieParams[0]]}
            onParamsUpdated={vi.fn()}
            shouldCreateEmptyParam={true}
          />,
        );

        const removeParam = `remove-param-${omieParams[0].uuid}`;
        fireEvent.click(getByTestId(removeParam));
        expect(baseElement).toMatchSnapshot();

        // our case should be gone
        expect(queryByTestId(removeParam)).toBeNull();
      });

      it('should update params and call the callback', async () => {
        const onParamsUpdated = vi.fn();
        const { baseElement, getByTestId } = render(
          <ParamList
            availableParams={sampleParams}
            params={[]}
            onParamsUpdated={onParamsUpdated}
            shouldCreateEmptyParam={true}
          />,
        );

        await act(async () => {
          fireUnnnicInputChangeText(
            getByTestId('Service Call Param Data'),
            'data 1',
          );
        });

        expect(onParamsUpdated).toHaveBeenCalled();
        expect(baseElement).toMatchSnapshot();
      });
    });
  });
});
