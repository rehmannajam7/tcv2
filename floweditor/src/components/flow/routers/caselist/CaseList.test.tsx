import CaseList from 'components/flow/routers/caselist/CaseList';
import { Operators } from 'config/interfaces';
import React from 'react';
import { act, fireEvent, fireUnnnicInputChangeText, render } from 'test/utils';
import { mock } from 'testUtils';
import * as utils from 'utils';
import userEvent from '@testing-library/user-event';

mock(utils, 'createUUID', utils.seededUUIDs());

const caseUUID1 = utils.createUUID();
const caseUUID2 = utils.createUUID();

const cases = [
  {
    uuid: caseUUID1,
    kase: {
      uuid: caseUUID1,
      type: Operators.has_any_word,
      arguments: ['Red, r'],
      category_uuid: utils.createUUID(),
    },
    categoryName: 'Red',
    valid: true,
  },
  {
    uuid: caseUUID2,
    kase: {
      uuid: caseUUID2,
      type: Operators.has_any_word,
      arguments: ['Green, g'],
      category_uuid: utils.createUUID(),
    },
    categoryName: 'Green',
    valid: true,
  },
];

describe(CaseList.name, () => {
  describe('render', () => {
    it('should render empty list', () => {
      const { baseElement } = render(
        <CaseList cases={[]} onCasesUpdated={vi.fn()} />,
      );
      expect(baseElement).toMatchSnapshot();
    });

    it('should render list of cases', () => {
      const { baseElement } = render(
        <CaseList cases={cases} onCasesUpdated={vi.fn()} />,
      );
      expect(baseElement).toMatchSnapshot();
    });
  });

  describe('updates', () => {
    it('should remove cases', () => {
      const { baseElement, getByTestId, queryByTestId } = render(
        <CaseList cases={cases} onCasesUpdated={vi.fn()} />,
      );

      const removeCase = `remove-case-${cases[0].uuid}`;
      fireEvent.click(getByTestId(removeCase));
      expect(baseElement).toMatchSnapshot();

      // our case should be gone
      expect(queryByTestId(removeCase)).toBeNull();
    });

    it('should update cases', async () => {
      const onCasesUpdated = vi.fn();
      const { baseElement, getAllByTestId } = render(
        <CaseList cases={cases} onCasesUpdated={onCasesUpdated} />,
      );

      userEvent.type(
        getAllByTestId('arguments')[0].querySelector('input'),
        'Purple, p',
      );

      // TODO: REDUCE THESE CALLED TIMES TO 4/5
      expect(onCasesUpdated).toHaveBeenCalledTimes(12);
      expect(baseElement).toMatchSnapshot();
    });

    it('changes default operator on add', async () => {
      const onCasesUpdated = vi.fn();

      // start with an empty list
      const { baseElement, getAllByTestId, getByText } = render(
        <CaseList cases={[]} onCasesUpdated={onCasesUpdated} />,
      );

      // we should have one operator for the default
      expect(getAllByTestId('temba_select_operator').length).toBe(1);

      // switch default to greater than operator and populate it
      userEvent.click(getByText('has a number above'));

      const argsInput = getAllByTestId('arguments')[0];
      await act(async () => {
        fireUnnnicInputChangeText(argsInput, '42');
      });

      // now we should have two rules
      expect(getAllByTestId('temba_select_operator').length).toBe(2);

      // our new default operator should match the last one we entered
      const newOperator = getAllByTestId('temba_select_operator')[1];
      expect(newOperator.querySelector('input').placeholder).toBe(
        'has a number above',
      );

      expect(baseElement).toMatchSnapshot();
    });
  });
});
