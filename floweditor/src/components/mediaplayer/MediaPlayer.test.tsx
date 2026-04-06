import * as React from 'react';
import {
  MediaPlayer,
  MediaPlayerProps,
} from 'components/mediaplayer/MediaPlayer';
import { composeComponentTestUtils } from 'testUtils';
import { shallowToJson } from 'enzyme-to-json';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { render } from 'test/utils';

const baseProps: MediaPlayerProps = {
  url: 'https://valid-link.to/audio.mp3',
  triggered: false,
};

const { setup } = composeComponentTestUtils(MediaPlayer, baseProps);

describe(MediaPlayer.name, () => {
  const audioLoadMock = vi.fn();
  const audioPlayMock = vi.fn();
  const audioPauseMock = vi.fn();
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(window.HTMLMediaElement.prototype, 'load').mockImplementation(() =>
      audioLoadMock(),
    );
    vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() =>
      audioPlayMock(),
    );
    vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(
      () => audioPauseMock(),
    );
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('render', () => {
    it('should render', () => {
      const { wrapper } = setup(false);
      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });

    it('should render with triggered', () => {
      const { setup } = composeComponentTestUtils(MediaPlayer, {
        ...baseProps,
        triggered: true,
      });
      const { wrapper } = setup(false);

      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });
  });

  it('should start playing on mediaplayer click', async () => {
    const { getByTestId } = render(<MediaPlayer {...baseProps} />);
    vi.clearAllMocks();

    const mediaplayer = getByTestId('mediaplayer');
    expect(audioLoadMock).not.toHaveBeenCalled();
    expect(audioPlayMock).not.toHaveBeenCalled();
    expect(audioPauseMock).not.toHaveBeenCalled();
    fireEvent.mouseDown(mediaplayer);
    fireEvent.mouseUp(mediaplayer);
    expect(audioLoadMock).toHaveBeenCalled();
    expect(audioPlayMock).toHaveBeenCalled();
    expect(audioPauseMock).not.toHaveBeenCalled();
  });

  it('should not start playing on mediaplayer click if already playing and pause it instead', async () => {
    const { getByTestId } = render(<MediaPlayer {...baseProps} />);
    audioLoadMock.mockClear();
    audioPlayMock.mockClear();

    const mediaplayer = getByTestId('mediaplayer');
    fireEvent.mouseDown(mediaplayer);

    // Simulate time update to make sure audio is playing
    const audio = getByTestId('audio') as HTMLAudioElement;
    audio.currentTime = 1;
    await act(async () => {
      fireEvent.timeUpdate(audio);
    });

    // First click should play the audio
    expect(audioLoadMock).toHaveBeenCalledTimes(1);
    expect(audioPlayMock).toHaveBeenCalledTimes(1);
    expect(audioPauseMock).not.toHaveBeenCalled();

    // Second click should pause the audio
    fireEvent.mouseDown(mediaplayer);
    expect(audioLoadMock).toHaveBeenCalledTimes(1);
    expect(audioPlayMock).toHaveBeenCalledTimes(1);
    expect(audioPauseMock).toHaveBeenCalledTimes(1);
  });

  it('should update playing state if audio has stopped', async () => {
    const { baseElement, getByTestId, rerender } = render(
      <MediaPlayer {...baseProps} />,
    );
    audioLoadMock.mockClear();
    audioPlayMock.mockClear();

    const mediaplayer = getByTestId('mediaplayer');
    fireEvent.mouseDown(mediaplayer);

    // Simulate time update to make sure audio is playing
    const audio = getByTestId('audio') as HTMLAudioElement;
    audio.currentTime = 1;
    fireEvent.timeUpdate(audio);

    // Simulate audio progressed
    audio.currentTime = 2;
    await act(async () => {
      fireEvent.timeUpdate(audio);
    });
    vi.runAllTimers();

    // Component must be in playing state
    expect(baseElement).toMatchSnapshot();

    // Simulate audio ended
    audio.currentTime = 0;
    await act(async () => {
      fireEvent.timeUpdate(audio);
    });
    vi.runAllTimers();

    rerender(
      <MediaPlayer {...baseProps} url="https://valid-link.to/audio2.mp3" />,
    );
    // Component must be in stopped state
    expect(baseElement).toMatchSnapshot();
  });
});
