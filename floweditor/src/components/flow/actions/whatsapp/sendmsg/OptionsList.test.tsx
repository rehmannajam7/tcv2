import { mock } from 'testUtils';
import OptionsList from './OptionsList';
import * as utils from 'utils';
import * as React from 'react';
import { act, fireUnnnicInputChangeText, render } from 'test/utils';
import { ValidationFailure } from 'store/nodeEditor';

mock(utils, 'createUUID', utils.seededUUIDs());

function getProps() {
  return {
    buttonText: {
      value: 'button text',
    },
    options: {
      value: [
        { uuid: '1', title: 'title 1', description: 'description 1' },
        { uuid: '2', title: 'title 2', description: 'description 2' },
      ],
      validationFailures: [] as ValidationFailure[],
    },
    onOptionsUpdated: vi.fn(),
    onOptionRemoval: vi.fn(),
    onButtonTextUpdated: vi.fn(),
  };
}

describe(OptionsList.name, () => {
  it('should render', async () => {
    const props = getProps();
    const { baseElement } = render(<OptionsList {...props} />);

    expect(baseElement).toMatchSnapshot();
  });

  it('should update list item title', async () => {
    const props = getProps();
    const { getByTestId } = render(<OptionsList {...props} />);

    // expand collapse
    const expandCollapseButton = getByTestId('title 2');
    await act(async () => {
      expandCollapseButton.click();
    });

    const listItemTitleInput = getByTestId('Title');
    await act(async () => {
      fireUnnnicInputChangeText(listItemTitleInput, 'new title 2');
    });

    expect(props.onOptionsUpdated).toHaveBeenCalledWith([
      { uuid: '1', title: 'title 1', description: 'description 1' },
      { uuid: '2', title: 'new title 2', description: 'description 2' },
    ]);
  });

  it('should update list item description', async () => {
    const props = getProps();
    const { getByTestId } = render(<OptionsList {...props} />);

    // expand collapse
    const expandCollapseButton = getByTestId('title 2');
    await act(async () => {
      expandCollapseButton.click();
    });

    const listItemDescriptionInput = getByTestId('Description (Optional)');
    await act(async () => {
      fireUnnnicInputChangeText(listItemDescriptionInput, 'new description 2');
    });

    expect(props.onOptionsUpdated).toHaveBeenCalledWith([
      { uuid: '1', title: 'title 1', description: 'description 1' },
      { uuid: '2', title: 'title 2', description: 'new description 2' },
    ]);
  });

  it('should remove list item', async () => {
    const props = getProps();
    const { getByTestId } = render(<OptionsList {...props} />);

    // expand collapse
    const expandCollapseButton = getByTestId('title 2');
    await act(async () => {
      expandCollapseButton.click();
    });

    const listItemRemoveButton = getByTestId('Remove');
    await act(async () => {
      listItemRemoveButton.click();
    });

    expect(props.onOptionRemoval).toHaveBeenCalledWith({
      uuid: '2',
      title: 'title 2',
      description: 'description 2',
    });
  });

  it('should not remove last list item if it is an empty one', async () => {
    const props = getProps();
    props.options.value = [{ uuid: '1', title: '', description: '' }];
    const { getByTestId } = render(<OptionsList {...props} />);

    const listItemRemoveButton = getByTestId('Remove');
    await act(async () => {
      listItemRemoveButton.click();
    });

    expect(props.onOptionRemoval).not.toHaveBeenCalled();
  });

  it('should show error message', () => {
    const props = getProps();
    props.options.validationFailures = [{ message: 'error message text' }];
    const { getByTestId } = render(<OptionsList {...props} />);

    const errorMessage = getByTestId('Error message');

    expect(errorMessage).toBeInTheDocument();
  });
});
