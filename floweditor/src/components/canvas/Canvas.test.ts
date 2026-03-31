import { Canvas, CanvasProps } from 'components/canvas/Canvas';
import { composeComponentTestUtils, mock, setMock } from 'testUtils';
import { createUUID, merge, set } from 'utils';
import * as utils from 'utils';
import { vi } from 'vitest';
import { MouseState } from 'store/editor';
import { JSDOM } from 'jsdom';

vi.mock('components/guidingsteps/GuidingSteps', () => {
  return {
    default: () => 'GuidingSteps',
  };
});

vi.mock('panzoom', async (importOriginal: any) => {
  const mod = await importOriginal();
  return {
    ...mod,
    default: () => {
      return {
        on: vi.fn(),
        getTransform: () => {
          return { x: 0, y: 0, scale: 1 };
        },
        moveTo: vi.fn(),
        moveBy: vi.fn(),
        smoothZoom: vi.fn(),
        smoothMoveTo: vi.fn(),
      };
    },
  };
});
vi.useFakeTimers();

mock(utils, 'createUUID', utils.seededUUIDs());

const firstNodeUUID = createUUID();
const secondNodeUUID = createUUID();

const nodes = {
  [firstNodeUUID]: {
    ui: {
      position: { top: 100, bottom: 200, left: 100, right: 200 },
    },
  },
  [secondNodeUUID]: {
    ui: undefined,
  } as any,
};

const baseProps: CanvasProps = {
  uuid: createUUID(),
  draggingNew: false,
  dragActive: false,
  onDragging: vi.fn(),
  onUpdatePositions: vi.fn(),
  mergeEditorState: vi.fn(),
  onRemoveNodes: vi.fn(),
  onDoubleClick: vi.fn(),
  onLoaded: vi.fn(),
  draggables: [],
  newDragElement: null,
  mutable: true,
  mouseState: MouseState.SELECT,
  onZoom: vi.fn(),
  onMouseStateChange: vi.fn(),
  nodes: nodes,
  updateNodesEditor: vi.fn(),
};

const { setup, spyOn } = composeComponentTestUtils(Canvas, baseProps);

const setDom = () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');

  // `as` and anything after it are TypeScript-specific
  global.window = (dom.window as unknown) as Window & typeof globalThis;
  global.document = dom.window.document;

  global.window['requestAnimationFrame'] = vi.fn();
  global.document['execCommand'] = vi.fn();
};

describe(Canvas.name, () => {
  beforeEach(() => {
    setDom();
    vi.clearAllTimers();
  });

  describe('manuallyCopy', () => {
    it("should call document.execCommand('copy')", () => {
      const { wrapper } = setup(false);

      const copySpy = vi.spyOn(document, 'execCommand');

      wrapper.instance().manuallyCopy('test');

      expect(copySpy).toHaveBeenCalledWith('copy');
    });
  });

  describe('manuallyCreateNode', () => {
    it('should call the callback function with node position', async () => {
      const { wrapper } = setup(false);

      const callback = vi.fn();
      const node = {
        ui: {
          position: { top: 100, bottom: 200, left: 100, right: 200 },
        },
      };

      wrapper.instance().manuallyCreateNode(node, callback);

      expect(callback).toHaveBeenCalledWith(node);
    });
  });
});
