import CaseElement, {
  CaseElementProps,
  CaseElementType,
} from 'components/flow/routers/case/CaseElement';
import { Operators } from 'config/interfaces';
import * as React from 'react';
import {
  fireEvent,
  render,
  fireUnnnicInputChangeText,
  getUnnnicInputValue,
  waitFor,
} from 'test/utils';
import { createUUID } from 'utils';
import userEvent from '@testing-library/user-event';

const caseUUID = createUUID();

const caseProps: CaseElementProps = {
  name: `case_${caseUUID}`,
  kase: {
    uuid: caseUUID,
    type: Operators.has_any_word,
    arguments: [''],
    category_uuid: createUUID(),
  },
  categoryName: null,
  onRemove: vi.fn(),
  onChange: vi.fn(),
  type: CaseElementType.default,
};

describe(CaseElement.name, () => {
  describe('render', () => {
    it('should render empty case', () => {
      const { baseElement } = render(<CaseElement {...caseProps} />);
      expect(baseElement).toMatchSnapshot();
    });

    it('renders no argument rules', () => {
      const kase = {
        uuid: caseUUID,
        type: Operators.has_number,
        category_uuid: createUUID(),
      };

      const { baseElement } = render(
        <CaseElement {...caseProps} kase={kase} />,
      );
      expect(baseElement).toMatchSnapshot();
    });
  });

  describe('operator changes', () => {
    // we need a full renders because we update our category reference
    it('should handle updates', async () => {
      const { baseElement, getByText } = render(<CaseElement {...caseProps} />);

      userEvent.click(getByText('has a phone number'));
      await waitFor(() => expect(baseElement).toMatchSnapshot());
    });

    it('should should set arguments for numeric range', async () => {
      const { baseElement, getByText } = render(<CaseElement {...caseProps} />);

      userEvent.click(getByText('has a number between'));
      await waitFor(() => expect(baseElement).toMatchSnapshot());
    });

    it('should not update exit if it has been edited', async () => {
      const {
        baseElement,
        queryByDisplayValue,
        getByTestId,
        getByText,
      } = render(<CaseElement {...caseProps} />);

      // make us a has phone so we can look up our category by value
      userEvent.click(getByText('has a phone number'));

      // update our category to a user supplied value
      const category = getByTestId('Exit Name');
      fireUnnnicInputChangeText(category, 'My Exit Name');

      // now switch our type to force a category change
      userEvent.click(getByText('has a number'));

      // we shouldn't have updated our category
      expect(queryByDisplayValue('My Exit Name')).not.toBeNull();
      expect(queryByDisplayValue('Has Number')).toBeNull();
      expect(baseElement).toMatchSnapshot();
    });
  });

  describe('update', () => {
    it('handles removes', () => {
      const onRemove = vi.fn();
      const { getByTestId } = render(
        <CaseElement {...caseProps} onRemove={onRemove} />,
      );

      fireEvent.click(getByTestId(`remove-case-${caseProps.kase.uuid}`));
      expect(onRemove).toHaveBeenCalled();
    });

    it('handles argument change', () => {
      const onRemove = vi.fn();
      const { baseElement, getAllByTestId } = render(
        <CaseElement {...caseProps} onRemove={onRemove} />,
      );
      const args = getAllByTestId('arguments');
      fireUnnnicInputChangeText(args[0], 'Purple, p');
      expect(getUnnnicInputValue(args[0])).toEqual('Purple, p');
      expect(baseElement).toMatchSnapshot();
    });

    it('handles multiple argument change', async () => {
      const onRemove = vi.fn();
      const { baseElement, getByText, getAllByTestId } = render(
        <CaseElement {...caseProps} onRemove={onRemove} />,
      );

      userEvent.click(getByText('has a number between'));

      const args = getAllByTestId('arguments');

      fireUnnnicInputChangeText(args[0], '1');
      fireUnnnicInputChangeText(args[1], '100');
      expect(getUnnnicInputValue(args[0])).toEqual('1');
      expect(getUnnnicInputValue(args[1])).toEqual('100');
      expect(baseElement).toMatchSnapshot();
    });

    it('handles intent arguments', async () => {
      const kase = {
        uuid: caseUUID,
        type: Operators.has_intent,
        category_uuid: createUUID(),
      };

      const { baseElement, getAllByTestId, getByText } = render(
        <CaseElement
          {...caseProps}
          kase={kase}
          classifier={{
            intents: ['intent1', 'intent2'],
          }}
        />,
      );

      fireEvent.click(getByText('intent1'));

      const args = getAllByTestId('confidence');
      fireUnnnicInputChangeText(args[0], 'Purple, p');
      expect(getUnnnicInputValue(args[0])).toEqual('Purple, p');

      expect(baseElement).toMatchSnapshot();
    });

    it('handles has_top_intent arguments', async () => {
      const kase = {
        uuid: caseUUID,
        type: Operators.has_top_intent,
        category_uuid: createUUID(),
      };

      const { baseElement, getAllByTestId, getByText } = render(
        <CaseElement
          {...caseProps}
          kase={kase}
          classifier={{
            intents: ['intent1', 'intent2'],
          }}
        />,
      );

      fireEvent.click(getByText('intent1'));

      const args = getAllByTestId('confidence');
      fireUnnnicInputChangeText(args[0], 'Purple, p');
      expect(getUnnnicInputValue(args[0])).toEqual('Purple, p');

      expect(baseElement).toMatchSnapshot();
    });

    it('handles has_ward arguments', async () => {
      const kase = {
        uuid: caseUUID,
        type: Operators.has_ward,
        category_uuid: createUUID(),
      };

      const { baseElement, getAllByTestId } = render(
        <CaseElement {...caseProps} kase={kase} />,
      );

      const state = getAllByTestId('State');
      fireUnnnicInputChangeText(state[0], 'state1');
      expect(getUnnnicInputValue(state[0])).toEqual('state1');

      const district = getAllByTestId('District');
      fireUnnnicInputChangeText(district[0], 'district1');
      expect(getUnnnicInputValue(district[0])).toEqual('district1');

      expect(baseElement).toMatchSnapshot();
    });

    it('handles relativeDate arguments', async () => {
      const kase = {
        uuid: caseUUID,
        type: Operators.has_date_eq,
        category_uuid: createUUID(),
      };

      const { baseElement, getAllByTestId } = render(
        <CaseElement {...caseProps} kase={kase} />,
      );

      const args = getAllByTestId('arguments');
      fireUnnnicInputChangeText(args[0], 'arg1');
      expect(getUnnnicInputValue(args[0])).toEqual('arg1');

      expect(baseElement).toMatchSnapshot();
    });

    it('handles smart cases', async () => {
      const kase = {
        uuid: caseUUID,
        type: Operators.has_any_word,
        category_uuid: createUUID(),
      };

      const { baseElement, getAllByTestId } = render(
        <CaseElement {...caseProps} kase={kase} type={CaseElementType.smart} />,
      );

      const args = getAllByTestId('arguments');
      fireUnnnicInputChangeText(args[0], 'arg1');
      expect(getUnnnicInputValue(args[0])).toEqual('arg1');

      expect(baseElement).toMatchSnapshot();
    });
  });
});
