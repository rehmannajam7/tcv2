const Plumber = vi.fn().mockImplementation(() => {
  return {
    debug: vi.fn(),
    draggable: vi.fn(),
    setSourceEnabled: vi.fn(),
    makeSource: vi.fn(),
    makeTarget: vi.fn(),
    connectExit: vi.fn(),
    removeFromDragSelection: vi.fn(),
    setDragSelection: vi.fn(),
    clearDragSelection: vi.fn(),
    cancelDurationRepaint: vi.fn(),
    repaintForDuration: vi.fn(),
    repaintFor: vi.fn(),
    connect: vi.fn(),
    bind: vi.fn(),
    repaint: vi.fn(),
    remove: vi.fn(),
    recalculate: vi.fn(),
    reset: vi.fn(),
    triggerLoaded: vi.fn(),
  };
});

export default Plumber;
