import ParamElement, {
  ParamElementProps,
} from 'components/flow/routers/param/ParamElement';
import * as React from 'react';
import {
  fireEvent,
  render,
  fireTembaSelect,
  fireUnnnicInputChangeText,
  act,
} from 'test/utils';
import { createUUID } from 'utils';
import userEvent from '@testing-library/user-event';

const services = require('test/assets/external_services.json');

describe(ParamElement.name, () => {
  describe('ChatGPT params', () => {
    const chatGPTParams = services.results[0].actions[0].params;
    const paramUUID = createUUID();

    describe('multiselect', () => {
      const chatGPTParamProps: ParamElementProps = {
        name: `param_${paramUUID}`,
        initialParam: {
          ...chatGPTParams[0],
          uuid: paramUUID,
          filter: { value: null },
          data: { value: null },
          valid: true,
        },
        availableParams: chatGPTParams,
        onRemove: vi.fn(),
        onChange: vi.fn(),
        hasArrangeFunctionality: false,
      };

      describe('render', () => {
        it('should render param', () => {
          const { baseElement } = render(
            <ParamElement {...chatGPTParamProps} />,
          );
          expect(baseElement).toMatchSnapshot();
        });
      });

      describe('update', () => {
        it('handles data change', () => {
          const { baseElement, getByTestId } = render(
            <ParamElement {...chatGPTParamProps} onRemove={vi.fn()} />,
          );

          fireTembaSelect(getByTestId('temba_select_aditional_prompts'), [
            {
              text: 'Aditional Prompt 1 content',
              uuid: 'ab154b06-5ecd-43d9-afca-39738e6859d7',
            },
            {
              text: 'Aditional Prompt 2 content',
              uuid: 'ac154b06-5ecd-43d9-afca-39738e6859d7',
            },
          ]);

          expect(baseElement).toMatchSnapshot();
        });
      });
    });

    describe('boolean', () => {
      const chatGPTParamProps: ParamElementProps = {
        name: `param_${paramUUID}`,
        initialParam: {
          ...chatGPTParams[1],
          uuid: paramUUID,
          filter: { value: null },
          data: { value: false },
          valid: true,
        },
        availableParams: chatGPTParams,
        onRemove: vi.fn(),
        onChange: vi.fn(),
        hasArrangeFunctionality: false,
      };

      describe('render', () => {
        it('should render param', () => {
          const { baseElement } = render(
            <ParamElement {...chatGPTParamProps} />,
          );
          expect(baseElement).toMatchSnapshot();
        });
      });
    });

    describe('expressionInput', () => {
      const chatGPTParamProps: ParamElementProps = {
        name: `param_${paramUUID}`,
        initialParam: {
          ...chatGPTParams[2],
          uuid: paramUUID,
          filter: { value: null },
          data: { value: null },
          valid: true,
        },
        availableParams: chatGPTParams,
        onRemove: vi.fn(),
        onChange: vi.fn(),
        hasArrangeFunctionality: false,
      };

      describe('render', () => {
        it('should render param', () => {
          const { baseElement } = render(
            <ParamElement {...chatGPTParamProps} />,
          );
          expect(baseElement).toMatchSnapshot();
        });
      });
    });
  });

  describe('Omie params', () => {
    const omieParams = services.results[1].actions[0].params;
    const paramUUID = createUUID();

    const omieParamProps: ParamElementProps = {
      name: `param_${paramUUID}`,
      initialParam: {
        type: omieParams[0].type,
        verboseName: omieParams[0].verboseName,
        filters: omieParams[0].filters,
        uuid: paramUUID,
        filter: { value: omieParams[0].filters[0] },
        data: { value: '' },
        valid: true,
      },
      availableParams: omieParams,
      onRemove: vi.fn(),
      onChange: vi.fn(),
      hasArrangeFunctionality: true,
    };

    describe('render', () => {
      it('should render param', () => {
        const { baseElement } = render(<ParamElement {...omieParamProps} />);
        expect(baseElement).toMatchSnapshot();
      });
    });

    describe('update', () => {
      it('handles removes', () => {
        const onRemove = vi.fn();
        const { getByTestId } = render(
          <ParamElement {...omieParamProps} onRemove={onRemove} />,
        );

        fireEvent.click(
          getByTestId(`remove-param-${omieParamProps.initialParam.uuid}`),
        );
        expect(onRemove).toHaveBeenCalled();
      });

      it('handles data change', async () => {
        const { baseElement, getByTestId } = render(
          <ParamElement {...omieParamProps} onRemove={vi.fn()} />,
        );
        await act(async () => {
          fireUnnnicInputChangeText(
            getByTestId('Service Call Param Data'),
            'new data',
          );
        });
        expect(baseElement).toMatchSnapshot();
      });

      it('handles filter change', async () => {
        const { baseElement, getByText } = render(
          <ParamElement {...omieParamProps} onRemove={vi.fn()} />,
        );

        userEvent.click(getByText('Código da Conta'));
        expect(baseElement).toMatchSnapshot();
      });

      it('handles param change', async () => {
        const { baseElement, getByText } = render(
          <ParamElement {...omieParamProps} onRemove={vi.fn()} />,
        );

        userEvent.click(getByText('Telefone e Email'));
        expect(baseElement).toMatchSnapshot();
      });

      it('handles filter change from correct param after param change', async () => {
        const { baseElement, getByTestId, getByText } = render(
          <ParamElement {...omieParamProps} onRemove={vi.fn()} />,
        );

        userEvent.click(getByText('Telefone e Email'));
        userEvent.click(getByText('DDD do Celular 2'));

        await act(async () => {
          fireUnnnicInputChangeText(
            getByTestId('Service Call Param Data'),
            'new data',
          );
        });

        expect(baseElement).toMatchSnapshot();
      });
    });
  });
});
