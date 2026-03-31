import { render, fireEvent, act, fireUnnnicSwitch } from 'test/utils';
import * as React from 'react';
import { Simulator, SimulatorProps } from './Simulator';
import { English } from '../../testUtils/assetCreators';

const props: SimulatorProps = {
  mergeEditorState: vi.fn(),
  onToggled: vi.fn(),
  popped: 'true',

  nodes: {},
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
  activity: null,
  language: English,
  liveActivity: null,
};

describe(Simulator.name, () => {
  it('should render', async () => {
    vi.useFakeTimers();
    let rendered: any;
    await act(async () => {
      rendered = render(<Simulator {...props} />);
    });

    vi.runAllTimers();
    expect(rendered.baseElement).toMatchSnapshot();
  });

  it('should toggle', async () => {
    vi.useFakeTimers();
    const { baseElement, getByTestId } = render(
      <Simulator {...props} popped="Simulator" />,
    );
    const toggle = getByTestId('simulator_toggle');

    await act(async () => {
      fireEvent.click(toggle);
    });
    vi.runAllTimers();
    expect(props.onToggled).toHaveBeenCalledTimes(1);

    expect(baseElement).toMatchSnapshot();
  });

  it('should toggle simulator style to whatsapp', async () => {
    vi.useFakeTimers();
    const { baseElement, getByTestId } = render(<Simulator {...props} />);
    const toggle = getByTestId('simulator_toggle');

    await act(async () => {
      fireEvent.click(toggle);
      fireUnnnicSwitch(getByTestId('whatsapp_switch'));
    });

    vi.runAllTimers();
    expect(baseElement).toMatchSnapshot();

    // toggle back
    await act(async () => {
      fireEvent.click(toggle);
      fireUnnnicSwitch(getByTestId('whatsapp_switch'));
    });

    vi.runAllTimers();
    expect(baseElement).toMatchSnapshot();
  });

  describe('attachment drawer', () => {
    it('should toggle attachment drawer', async () => {
      vi.useFakeTimers();
      const { baseElement, getByTestId } = render(<Simulator {...props} />);

      await act(async () => {
        fireEvent.click(getByTestId('simulator_toggle'));
      });
      vi.runAllTimers();

      fireEvent.click(getByTestId('show_attachments_button'));
      expect(baseElement).toMatchSnapshot();

      fireEvent.click(getByTestId('hide_attachments_button'));
      expect(baseElement).toMatchSnapshot();
    });

    it('should toggle image attachments selection', async () => {
      vi.useFakeTimers();
      const { baseElement, getByTestId } = render(<Simulator {...props} />);

      await act(async () => {
        fireEvent.click(getByTestId('simulator_toggle'));
      });
      vi.runAllTimers();

      fireEvent.click(getByTestId('show_attachments_button'));
      fireEvent.click(getByTestId('attachment-images'));

      expect(baseElement).toMatchSnapshot();
    });

    it('should send an image attachment', async () => {
      vi.useFakeTimers();
      const { baseElement, getByTestId } = render(<Simulator {...props} />);

      await act(async () => {
        fireEvent.click(getByTestId('simulator_toggle'));
      });
      vi.runAllTimers();

      fireEvent.click(getByTestId('show_attachments_button'));
      fireEvent.click(getByTestId('attachment-images'));

      fireEvent.click(getByTestId('image_a'));
      vi.runAllTimers();
      expect(baseElement).toMatchSnapshot();
    });

    it('should toggle video attachments selection', async () => {
      vi.useFakeTimers();
      const { baseElement, getByTestId } = render(<Simulator {...props} />);

      await act(async () => {
        fireEvent.click(getByTestId('simulator_toggle'));
      });
      vi.runAllTimers();

      fireEvent.click(getByTestId('show_attachments_button'));
      fireEvent.click(getByTestId('attachment-videos'));

      expect(baseElement).toMatchSnapshot();
    });

    it('should toggle audio attachments selection', async () => {
      vi.useFakeTimers();
      const { baseElement, getByTestId } = render(<Simulator {...props} />);

      await act(async () => {
        fireEvent.click(getByTestId('simulator_toggle'));
      });
      vi.runAllTimers();

      fireEvent.click(getByTestId('show_attachments_button'));
      fireEvent.click(getByTestId('attachment-audio'));

      expect(baseElement).toMatchSnapshot();
    });

    it('should toggle location attachments selection', async () => {
      vi.useFakeTimers();
      const { baseElement, getByTestId } = render(<Simulator {...props} />);

      await act(async () => {
        fireEvent.click(getByTestId('simulator_toggle'));
      });
      vi.runAllTimers();

      fireEvent.click(getByTestId('show_attachments_button'));
      fireEvent.click(getByTestId('attachment-location'));

      expect(baseElement).toMatchSnapshot();
    });

    it('should noop on double attachment selection', async () => {
      vi.useFakeTimers();
      const { baseElement, getByTestId } = render(<Simulator {...props} />);

      await act(async () => {
        fireEvent.click(getByTestId('simulator_toggle'));
      });
      vi.runAllTimers();

      fireEvent.click(getByTestId('show_attachments_button'));
      fireEvent.click(getByTestId('attachment-location'));
      fireEvent.click(getByTestId('attachment-location'));

      expect(baseElement).toMatchSnapshot();
    });

    it('should switch between attachment types', async () => {
      vi.useFakeTimers();
      const { baseElement, getByTestId } = render(<Simulator {...props} />);

      await act(async () => {
        fireEvent.click(getByTestId('simulator_toggle'));
      });
      vi.runAllTimers();

      fireEvent.click(getByTestId('show_attachments_button'));
      expect(baseElement).toMatchSnapshot();

      fireEvent.click(getByTestId('attachment-images'));
      expect(baseElement).toMatchSnapshot();

      fireEvent.click(getByTestId('attachment-location'));

      vi.runAllTimers();
      expect(baseElement).toMatchSnapshot();
    });
  });

  it('should toggle context explorer', async () => {
    vi.useFakeTimers();
    const { baseElement, getByTestId } = render(<Simulator {...props} />);

    await act(async () => {
      fireEvent.click(getByTestId('simulator_toggle'));
    });
    vi.runAllTimers();

    fireEvent.click(getByTestId('context_show_button'));
    expect(baseElement).toMatchSnapshot();

    fireEvent.click(getByTestId('context_hide_button'));
    expect(baseElement).toMatchSnapshot();
  });
});
