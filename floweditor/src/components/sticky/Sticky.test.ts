import { Sticky, StickyProps } from 'components/sticky/Sticky';
import { FlowDefinition, StickyNote } from 'flowTypes';
import { composeComponentTestUtils, composeDuxState, setMock } from 'testUtils';
import { set } from 'utils';

vi.useFakeTimers({ shouldAdvanceTime: true });

const definition = require('test/flows/empty.json') as FlowDefinition;

const clearTimeoutSpy = vi
  .spyOn(window, 'clearTimeout')
  .mockImplementation(() => {});

const sticky: StickyNote = {
  title: 'Sticky Title',
  body: 'Sticky Body',
  position: { left: 100, top: 200 },
};

const baseProps: StickyProps = {
  uuid: 'stickyA',
  sticky,
  // definition,
  selected: false,
  updateSticky: vi.fn(),
};

const { setup } = composeComponentTestUtils(
  Sticky,
  baseProps,
  composeDuxState({ flowContext: { definition: set(definition) } }),
);

describe(Sticky.name, () => {
  describe('colors', () => {
    it('should render yellow as a default', () => {
      const { wrapper } = setup();
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should render green notes', () => {
      sticky.color = 'green';
      const { wrapper } = setup(true, { sticky: set(sticky) });
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should let you change the color', () => {
      const { wrapper } = setup();
      wrapper.find({ 'data-testid': 'color-chooser-blue' }).simulate('click');
      expect(wrapper.html()).toMatchSnapshot();
    });
  });

  describe('update content', () => {
    let wrapper: any;

    const updateText = (testId: string, value: string) => {
      const selector = { 'data-testid': testId };
      wrapper
        .find(selector)
        .at(1)
        .prop('onChange')({
        currentTarget: { value },
      });
      expect(
        wrapper
          .find(selector)
          .at(1)
          .text(),
      ).toBe(value);
    };

    it('should update the title', () => {
      wrapper = setup(false).wrapper;
      updateText('title', 'My new title');
    });

    it('should update the body', () => {
      wrapper = setup(false).wrapper;
      updateText('body', 'My new body');
    });

    it('should debounce multiple updates', () => {
      wrapper = setup(false).wrapper;
      updateText('title', 'Update one');
      updateText('title', 'Update two');

      // we should have cleared our debounce
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    });

    it('should deregister debounce on unmount', () => {
      wrapper = setup(false).wrapper;
      updateText('title', 'Update one');
      updateText('title', 'Update two');
      vi.clearAllMocks();

      wrapper.unmount();

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('should show confirmation when clicking remove', async () => {
      const { wrapper } = setup(false);
      expect(wrapper.html()).toMatchSnapshot();

      // click on the removal, and removal should be there
      wrapper.find({ 'data-testid': 'remove' }).simulate('click');

      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should delete on double click', () => {
      const { wrapper, props } = setup(true, { updateSticky: setMock() });

      // click on the removal, and removal should be there
      wrapper.find({ 'data-testid': 'remove' }).simulate('click');
      wrapper.find({ 'data-testid': 'remove' }).simulate('click');

      // TODO: make mocks work
      expect(props.updateSticky).toHaveBeenCalledTimes(1);
      expect(props.updateSticky).toHaveBeenCalledWith('stickyA', null);

      // run through the end of the timer period and removal should go away
      vi.runAllTimers();
    });

    it('should deregister timeout when unmounting', async () => {
      const { wrapper } = setup();
      vi.clearAllMocks();

      // click to remove will register a timer to switch removal off
      wrapper.find({ 'data-testid': 'remove' }).simulate('click');

      // unmounting should deregister our timer
      wrapper.unmount();

      expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('dragging', () => {
    it('should get coverage for a noop', () => {
      const { instance } = setup();

      instance.handleDrag({});
    });
  });
});
