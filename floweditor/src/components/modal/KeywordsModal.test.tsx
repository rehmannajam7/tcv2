import React from 'react';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { mount, ReactWrapper } from 'enzyme';
import KeywordsModal from 'components/modal/KeywordsModal';
import { KeywordsModal as KeywordsModalClass } from 'components/modal/KeywordsModal';
import { FlowDefinition, UIMetaData } from 'flowTypes';

// Mock SCSS module to prevent undefined styles errors
vi.mock('./KeywordsModal.module.scss', () => ({
  default: {
    modal: 'modal',
    content: 'content',
    header: 'header',
    header_content: 'header_content',
    title: 'title',
    sync_status: 'sync_status',
    sync_indicator: 'sync_indicator',
    'sync_indicator--syncing': 'sync_indicator--syncing',
    'sync_indicator--success': 'sync_indicator--success',
    'sync_indicator--error': 'sync_indicator--error',
    sync_text: 'sync_text',
    sync_spinner: 'sync_spinner',
    description: 'description',
    input_container: 'input_container',
    label: 'label',
    input_row: 'input_row',
    keywords_container: 'keywords_container',
    keywords_list: 'keywords_list',
    empty_message: 'empty_message',
    keyword_tag: 'keyword_tag',
    keyword_text: 'keyword_text',
    remove_button: 'remove_button',
    load_more_button: 'load_more_button',
    buttons: 'buttons',
  },
}));

// Mock the Unnnic components
vi.mock('@weni/unnnic-system', async () => {
  return {
    default: {
      unnnicModal: React.forwardRef(
        ({ children, className, ...props }: any, ref: any) => (
          <div ref={ref} className={className} {...props}>
            {children}
          </div>
        ),
      ),
      unnnicButton: React.forwardRef(
        (
          { children, text, onClick, disabled, type, ...props }: any,
          ref: any,
        ) => (
          <button
            ref={ref}
            onClick={onClick}
            disabled={disabled}
            data-type={type}
            {...props}
          >
            {text || children}
          </button>
        ),
      ),
      unnnicInput: React.forwardRef(
        (
          { value, placeholder, onInput, onKeypress, ...props }: any,
          ref: any,
        ) => (
          <input
            ref={ref}
            value={value}
            placeholder={placeholder}
            onInput={onInput}
            onKeyPress={onKeypress}
            {...props}
          />
        ),
      ),
    },
  };
});

// Mock veaury
vi.mock('veaury', () => ({
  applyVueInReact: (Component: any) => {
    // Return a simple React component wrapper
    return React.forwardRef((props: any, ref: any) => {
      return React.createElement(
        'div',
        {
          ref,
          ...props,
          'data-veaury-mock': true,
        },
        props.children,
      );
    });
  },
}));

// Mock styles - use vi.fn() to create proper getters
vi.mock('./KeywordsModal.module.scss', () => ({
  modal: 'modal',
  content: 'content',
  header: 'header',
  header_content: 'header_content',
  title: 'title',
  sync_status: 'sync_status',
  sync_indicator: 'sync_indicator',
  'sync_indicator--idle': 'sync_indicator--idle',
  'sync_indicator--syncing': 'sync_indicator--syncing',
  'sync_indicator--success': 'sync_indicator--success',
  'sync_indicator--error': 'sync_indicator--error',
  sync_text: 'sync_text',
  sync_spinner: 'sync_spinner',
  description: 'description',
  input_container: 'input_container',
  label: 'label',
  input_row: 'input_row',
  keywords_container: 'keywords_container',
  keywords_list: 'keywords_list',
  empty_message: 'empty_message',
  keyword_tag: 'keyword_tag',
  keyword_text: 'keyword_text',
  remove_button: 'remove_button',
  load_more_button: 'load_more_button',
  buttons: 'buttons',
}));

// Mock i18n
vi.mock('config/i18n', () => ({
  default: {
    t: (key: string, defaultValue: string) => defaultValue,
  },
}));

// Mock console methods to avoid cluttering test output
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
};

beforeEach(() => {
  console.log = vi.fn();
  console.error = vi.fn();
  console.warn = vi.fn();

  // Mock postMessage API
  global.postMessage = vi.fn();
  global.addEventListener = vi.fn();
  global.removeEventListener = vi.fn();
});

afterEach(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  vi.clearAllMocks();
});

const mockDefinition: FlowDefinition = {
  uuid: 'test-flow-uuid',
  name: 'Test Flow',
  spec_version: '13.1.0',
  language: 'eng',
  revision: 1,
  localization: {},
  nodes: [],
  _ui: {} as UIMetaData,
};

const baseProps = {
  onClose: vi.fn(),
  definition: mockDefinition,
  updateDefinition: vi.fn(),
  keyword: '',
};

describe('KeywordsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear any event listeners
    window.removeEventListener('message', vi.fn());
  });

  afterEach(() => {
    // Clean up any remaining event listeners
    window.removeEventListener('message', vi.fn());
  });

  describe('initialization', () => {
    it('should initialize with provided keywords', () => {
      // Create a minimal test that doesn't render the component
      const props = {
        definition: { ...mockDefinition, keywords: ['test', 'keyword'] },
        updateDefinition: vi.fn(),
        onClose: vi.fn(),
        show: true,
      };

      // Test the constructor logic directly
      const component = new KeywordsModalClass(props);
      expect(component.state.keywords).toEqual(['test', 'keyword']);
      expect(component.state.newKeyword).toBe('');
      expect(component.state.syncStatus).toBe('idle');
    });

    it('should initialize with empty keywords when definition has no keywords', () => {
      const props = {
        definition: { ...mockDefinition, keywords: [] },
        updateDefinition: vi.fn(),
        onClose: vi.fn(),
        show: true,
      };

      const component = new KeywordsModalClass(props);
      expect(component.state.keywords).toEqual([]);
    });

    it('should initialize with sync status properties', () => {
      const props = {
        definition: mockDefinition,
        updateDefinition: vi.fn(),
        onClose: vi.fn(),
        show: true,
      };

      const component = new KeywordsModalClass(props);
      expect(component.state.syncStatus).toBe('idle');
      expect(component.state.syncError).toBe(null);
      expect(component.state.lastSyncTime).toBeNull();
    });

    it('should initialize with performance optimization properties', () => {
      const props = {
        definition: mockDefinition,
        updateDefinition: vi.fn(),
        onClose: vi.fn(),
        show: true,
      };

      const component = new KeywordsModalClass(props);
      expect(component.state.visibleKeywords).toHaveLength(0);
      expect(component.state.currentPage).toBe(1);
      expect(component.state.keywordsPerPage).toBe(50);
      expect(component.state.isLoading).toBe(false);
    });
  });

  describe('postMessage communication', () => {
    it('should notify parent when modal is ready on mount', () => {
      const props = {
        definition: { ...mockDefinition, keywords: ['test', 'keyword'] },
        updateDefinition: vi.fn(),
        onClose: vi.fn(),
        show: true,
      };

      const component = new KeywordsModalClass(props);

      // Mock notifyParentKeywordsUpdate to capture the call
      component.notifyParentKeywordsUpdate = vi.fn();

      // Manually call componentDidMount to simulate mounting
      component.componentDidMount();

      expect(component.notifyParentKeywordsUpdate).toHaveBeenCalledWith(
        ['test', 'keyword'],
        'keywords_modal_ready',
      );
    });

    it('should send keywords_update message when keywords change', () => {
      const props = {
        definition: { ...mockDefinition, keywords: ['test', 'keyword'] },
        updateDefinition: vi.fn(),
        onClose: vi.fn(),
        show: true,
      };

      const component = new KeywordsModalClass(props);
      component.componentDidMount();

      // Set up the new keyword
      component.state.newKeyword = 'test-keyword';

      // Mock the debounced update method
      component.debouncedKeywordUpdate = vi.fn();

      component.handleAddKeyword();

      // The debounced update should be called instead of direct postMessage
      expect(component.debouncedKeywordUpdate).toHaveBeenCalledWith([
        'test',
        'keyword',
        'test-keyword',
      ]);
    });

    it('should handle keywords_sync_request from parent', () => {
      const props = {
        definition: { ...mockDefinition, keywords: ['test', 'keyword'] },
        updateDefinition: vi.fn(),
        onClose: vi.fn(),
        show: true,
      };

      const component = new KeywordsModalClass(props);
      component.componentDidMount();

      // Mock notifyParentKeywordsUpdate to capture the call
      component.notifyParentKeywordsUpdate = vi.fn();

      // Simulate parent message
      const messageHandler = (global.addEventListener as any).mock.calls[0][1];
      messageHandler({
        data: { type: 'keywords_sync_request' },
        origin: 'https://app.chatwoot.com',
      });

      expect(component.notifyParentKeywordsUpdate).toHaveBeenCalledWith(
        ['test', 'keyword'],
        'keywords_updated',
      );
    });

    it('should handle keyword_validation_error from parent', () => {
      const props = {
        definition: mockDefinition,
        updateDefinition: vi.fn(),
        onClose: vi.fn(),
        show: true,
      };

      const component = new KeywordsModalClass(props);
      component.componentDidMount();

      // Simulate parent message
      const messageHandler = (global.addEventListener as any).mock.calls[0][1];
      messageHandler({
        data: {
          type: 'keyword_validation_error',
          error: 'Invalid keyword format',
        },
        origin: 'https://app.chatwoot.com',
      });

      // The component doesn't actually update state for this message type
      // It only logs the error, so state should remain unchanged
      expect(component.state.syncStatus).toBe('idle');
      expect(component.state.syncError).toBe(null);
    });
  });

  describe('keyword management', () => {
    it('should add valid keywords', () => {
      const component = new KeywordsModalClass({
        definition: { ...mockDefinition, keywords: ['test', 'keyword'] },
        updateDefinition: vi.fn(),
        triggerSave: vi.fn(),
        onClose: vi.fn(),
        show: true,
      });

      // Mock the methods that interact with external systems
      vi.spyOn(component, 'notifyParentKeywordsUpdate').mockImplementation(
        vi.fn(),
      );
      vi.spyOn(component, 'debouncedKeywordUpdate').mockImplementation(vi.fn());

      // Mock setState to capture state changes
      const setStateSpy = vi
        .spyOn(component, 'setState')
        .mockImplementation(newState => {
          Object.assign(component.state, newState);
        });

      component.state.newKeyword = 'new-keyword';
      component.handleAddKeyword();

      expect(setStateSpy).toHaveBeenCalledWith({
        keywords: ['test', 'keyword', 'new-keyword'],
        newKeyword: '',
        validationError: '',
        syncStatus: 'success',
      });
    });

    it('should prevent duplicate keywords', () => {
      const component = new KeywordsModalClass({
        definition: { ...mockDefinition, keywords: ['test', 'keyword'] },
        updateDefinition: vi.fn(),
        triggerSave: vi.fn(),
        onClose: vi.fn(),
        show: true,
      });

      // Mock setState to capture state changes
      const setStateSpy = vi
        .spyOn(component, 'setState')
        .mockImplementation(newState => {
          Object.assign(component.state, newState);
        });

      component.state.newKeyword = 'test';
      component.handleAddKeyword();

      expect(setStateSpy).toHaveBeenCalledWith({
        validationError: 'Keyword already exists',
        syncStatus: 'error',
      });
    });

    it('should remove keywords', () => {
      const component = new KeywordsModalClass({
        definition: { ...mockDefinition, keywords: ['test', 'keyword'] },
        updateDefinition: vi.fn(),
        triggerSave: vi.fn(),
        onClose: vi.fn(),
        show: true,
      });

      // Mock the methods that interact with external systems
      vi.spyOn(component, 'notifyParentKeywordsUpdate').mockImplementation(
        vi.fn(),
      );
      vi.spyOn(component, 'debouncedKeywordUpdate').mockImplementation(vi.fn());
      vi.spyOn(component, 'updateSyncStatus').mockImplementation(vi.fn());

      // Mock setState to capture state changes
      const setStateSpy = vi
        .spyOn(component, 'setState')
        .mockImplementation((newState, callback) => {
          Object.assign(component.state, newState);
          if (callback) callback();
        });

      component.handleRemoveKeyword('test');

      expect(setStateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          keywords: ['keyword'],
        }),
        expect.any(Function),
      );
    });
  });

  describe('sync status management', () => {
    it('should update sync status to success after adding keyword', () => {
      const component = new KeywordsModalClass({
        definition: { ...mockDefinition, keywords: ['test', 'keyword'] },
        updateDefinition: vi.fn(),
        triggerSave: vi.fn(),
        onClose: vi.fn(),
        show: true,
      });

      // Mock the methods that interact with external systems
      vi.spyOn(component, 'notifyParentKeywordsUpdate').mockImplementation(
        vi.fn(),
      );
      vi.spyOn(component, 'debouncedKeywordUpdate').mockImplementation(vi.fn());

      // Mock setState to capture state changes
      const setStateSpy = vi
        .spyOn(component, 'setState')
        .mockImplementation(newState => {
          Object.assign(component.state, newState);
        });

      component.state.newKeyword = 'new-keyword';
      component.handleAddKeyword();

      expect(setStateSpy).toHaveBeenCalledWith({
        keywords: ['test', 'keyword', 'new-keyword'],
        newKeyword: '',
        validationError: '',
        syncStatus: 'success',
      });
    });

    it('should update sync status to error when validation fails', () => {
      const component = new KeywordsModalClass({
        definition: { ...mockDefinition, keywords: ['test', 'keyword'] },
        updateDefinition: vi.fn(),
        triggerSave: vi.fn(),
        onClose: vi.fn(),
        show: true,
      });

      // Mock setState to capture state changes
      const setStateSpy = vi
        .spyOn(component, 'setState')
        .mockImplementation(newState => {
          Object.assign(component.state, newState);
        });

      component.state.newKeyword = 'test'; // duplicate
      component.handleAddKeyword();

      expect(setStateSpy).toHaveBeenCalledWith({
        validationError: 'Keyword already exists',
        syncStatus: 'error',
      });
    });

    it('should clear sync status when adding valid keyword after error', () => {
      const component = new KeywordsModalClass({
        definition: { ...mockDefinition, keywords: ['test', 'keyword'] },
        updateDefinition: vi.fn(),
        triggerSave: vi.fn(),
        onClose: vi.fn(),
        show: true,
      });

      // Mock the methods that interact with external systems
      vi.spyOn(component, 'notifyParentKeywordsUpdate').mockImplementation(
        vi.fn(),
      );
      vi.spyOn(component, 'debouncedKeywordUpdate').mockImplementation(vi.fn());

      // Mock setState to capture state changes
      const setStateSpy = vi
        .spyOn(component, 'setState')
        .mockImplementation(newState => {
          Object.assign(component.state, newState);
        });

      component.state.newKeyword = 'test'; // duplicate to trigger error
      component.handleAddKeyword();
      component.state.newKeyword = 'valid-keyword'; // valid keyword
      component.handleAddKeyword();

      expect(setStateSpy).toHaveBeenCalledWith({
        keywords: ['test', 'keyword', 'valid-keyword'],
        newKeyword: '',
        validationError: '',
        syncStatus: 'success',
      });
    });

    it('should auto-reset sync status after timeout', (done: () => void) => {
      const component = new KeywordsModalClass({
        definition: mockDefinition,
        updateDefinition: vi.fn(),
        triggerSave: vi.fn(),
        onClose: vi.fn(),
        show: true,
      });

      // Mock setState to capture state changes
      const setStateSpy = vi
        .spyOn(component, 'setState')
        .mockImplementation(newState => {
          Object.assign(component.state, newState);
        });

      component.updateSyncStatus('success');

      expect(component.state.syncStatus).toBe('success');

      // Wait for auto-reset
      setTimeout(() => {
        expect(component.state.syncStatus).toBe('idle');
        done();
      }, 2100);
    });

    it('should get correct sync status text', () => {
      const component = new KeywordsModalClass({
        definition: mockDefinition,
        updateDefinition: vi.fn(),
        triggerSave: vi.fn(),
        onClose: vi.fn(),
        show: true,
      });

      // Mock setState to capture state changes
      const setStateSpy = vi
        .spyOn(component, 'setState')
        .mockImplementation(newState => {
          Object.assign(component.state, newState);
        });

      expect(component.getSyncStatusText()).toBe('Ready');

      component.updateSyncStatus('syncing');
      expect(component.getSyncStatusText()).toBe('Synchronizing...');

      component.updateSyncStatus('success');
      expect(component.getSyncStatusText()).toBe('Synchronized');

      component.updateSyncStatus('error', 'Test error');
      expect(component.getSyncStatusText()).toBe('Sync failed: Test error');
    });
  });

  describe('performance optimization', () => {
    it('should handle large keyword lists efficiently', () => {
      const component = new KeywordsModalClass({
        definition: { ...mockDefinition, keywords: ['test', 'keyword'] },
        updateDefinition: vi.fn(),
        triggerSave: vi.fn(),
        onClose: vi.fn(),
        show: true,
      });

      // Mock the methods that interact with external systems
      vi.spyOn(component, 'notifyParentKeywordsUpdate').mockImplementation(
        vi.fn(),
      );
      vi.spyOn(component, 'debouncedKeywordUpdate').mockImplementation(vi.fn());

      // Mock setState to capture state changes
      const setStateSpy = vi
        .spyOn(component, 'setState')
        .mockImplementation(newState => {
          Object.assign(component.state, newState);
        });

      // Add 100 keywords
      for (let i = 0; i < 100; i++) {
        component.state.newKeyword = `keyword-${i}`;
        component.handleAddKeyword();
      }

      // Update visible keywords manually since componentDidUpdate won't be called
      component.updateVisibleKeywords();

      expect(component.state.keywords).toHaveLength(102); // 2 existing + 100 new
      expect(component.state.visibleKeywords).toHaveLength(50); // Should be limited to initial batch
    });

    it('should load more keywords when scrolling', () => {
      const component = new KeywordsModalClass({
        definition: { ...mockDefinition, keywords: ['test', 'keyword'] },
        updateDefinition: vi.fn(),
        triggerSave: vi.fn(),
        onClose: vi.fn(),
        show: true,
      });

      // Mock the methods that interact with external systems
      vi.spyOn(component, 'notifyParentKeywordsUpdate').mockImplementation(
        vi.fn(),
      );
      vi.spyOn(component, 'debouncedKeywordUpdate').mockImplementation(vi.fn());

      // Mock setState to capture state changes
      const setStateSpy = vi
        .spyOn(component, 'setState')
        .mockImplementation(newState => {
          Object.assign(component.state, newState);
        });

      // Add 100 keywords
      for (let i = 0; i < 100; i++) {
        component.state.newKeyword = `keyword-${i}`;
        component.handleAddKeyword();
      }

      component.loadMoreKeywords();

      expect(component.state.visibleKeywords).toHaveLength(100); // Should load more
    });

    it('should debounce keyword updates', () => {
      const component = new KeywordsModalClass({
        definition: { ...mockDefinition, keywords: ['test', 'keyword'] },
        updateDefinition: vi.fn(),
        triggerSave: vi.fn(),
        onClose: vi.fn(),
        show: true,
      });

      const debouncedSpy = vi.spyOn(component, 'debouncedKeywordUpdate');

      // Mock setState to capture state changes
      const setStateSpy = vi
        .spyOn(component, 'setState')
        .mockImplementation(newState => {
          Object.assign(component.state, newState);
        });

      component.state.newKeyword = 'keyword1';
      component.handleAddKeyword();
      component.state.newKeyword = 'keyword2';
      component.handleAddKeyword();
      component.state.newKeyword = 'keyword3';
      component.handleAddKeyword();

      expect(debouncedSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('security measures', () => {
    it('should reject messages from malicious origins', () => {
      const component = new KeywordsModalClass({
        definition: mockDefinition,
        updateDefinition: vi.fn(),
        triggerSave: vi.fn(),
        onClose: vi.fn(),
        show: true,
      });

      component.componentDidMount();

      // Simulate malicious message
      const messageHandler = (global.addEventListener as any).mock.calls[0][1];
      messageHandler({
        data: { type: 'keywords_update', payload: { keywords: ['malicious'] } },
        origin: 'https://malicious-site.com',
      });

      // Should not update keywords from malicious origin
      expect(component.state.keywords).not.toContain('malicious');
    });

    it('should validate getAllowedOrigin method', () => {
      const component = new KeywordsModalClass({
        definition: mockDefinition,
        updateDefinition: vi.fn(),
        triggerSave: vi.fn(),
        onClose: vi.fn(),
        show: true,
      });

      // Test with empty referrer first (should return '*')
      Object.defineProperty(document, 'referrer', {
        value: '',
        writable: true,
        configurable: true,
      });

      expect(component.getAllowedOrigin()).toBe('*');

      // Test with valid referrer
      Object.defineProperty(document, 'referrer', {
        value: 'https://app.chatwoot.com/some/path',
        writable: true,
        configurable: true,
      });

      expect(component.getAllowedOrigin()).toBe('https://app.chatwoot.com');
    });
  });

  describe('UI rendering', () => {
    it('should get correct sync status text', () => {
      const component = new KeywordsModalClass({
        definition: mockDefinition,
        updateDefinition: vi.fn(),
        triggerSave: vi.fn(),
        onClose: vi.fn(),
        show: true,
      });

      // Test different sync states
      component.state.syncStatus = 'syncing';
      expect(component.getSyncStatusText()).toBe('Synchronizing...');

      component.state.syncStatus = 'success';
      expect(component.getSyncStatusText()).toBe('Synchronized');

      component.state.syncStatus = 'error';
      component.state.syncError = null;
      expect(component.getSyncStatusText()).toBe('Sync failed: null');
    });

    it('should handle keyword state correctly', () => {
      const component = new KeywordsModalClass({
        definition: { ...mockDefinition, keywords: ['test', 'keyword'] },
        updateDefinition: vi.fn(),
        triggerSave: vi.fn(),
        onClose: vi.fn(),
        show: true,
      });

      // Mock setState to capture state changes
      const setStateSpy = vi
        .spyOn(component, 'setState')
        .mockImplementation(newState => {
          Object.assign(component.state, newState);
        });

      // Test initial state - directly check the state after constructor
      expect(component.state.keywords).toEqual(['test', 'keyword']);
      expect(component.state.visibleKeywords).toEqual(['test', 'keyword']);

      // Test adding keyword
      component.state.newKeyword = 'new-keyword';
      component.handleAddKeyword();

      expect(setStateSpy).toHaveBeenCalledWith({
        keywords: ['test', 'keyword', 'new-keyword'],
        newKeyword: '',
        validationError: '',
        syncStatus: 'success',
      });
    });

    it('should update visible keywords correctly', () => {
      const component = new KeywordsModalClass({
        definition: { ...mockDefinition, keywords: [] },
        updateDefinition: vi.fn(),
        triggerSave: vi.fn(),
        onClose: vi.fn(),
        show: true,
      });

      // Mock setState to capture state changes
      const setStateSpy = vi
        .spyOn(component, 'setState')
        .mockImplementation(newState => {
          Object.assign(component.state, newState);
        });

      // Add many keywords - directly modify state
      const manyKeywords = Array.from({ length: 60 }, (_, i) => `keyword-${i}`);
      component.state.keywords = manyKeywords;
      component.updateVisibleKeywords();

      expect(setStateSpy).toHaveBeenCalledWith({
        visibleKeywords: manyKeywords.slice(0, 50),
      });
      expect(component.state.visibleKeywords).toHaveLength(50);
      expect(
        component.state.visibleKeywords.length <
          component.state.keywords.length,
      ).toBe(true);
    });
  });

  describe('event handling', () => {
    it('should add keyword on Enter key press', () => {
      const component = new KeywordsModalClass({
        definition: mockDefinition,
        updateDefinition: vi.fn(),
        triggerSave: vi.fn(),
        onClose: vi.fn(),
        show: true,
      });

      // Mock setState to capture state changes
      const setStateSpy = vi
        .spyOn(component, 'setState')
        .mockImplementation(newState => {
          Object.assign(component.state, newState);
        });

      component.state.newKeyword = 'enter-keyword';
      component.handleKeyPress({ key: 'Enter', preventDefault: vi.fn() });

      expect(setStateSpy).toHaveBeenCalledWith({
        keywords: ['enter-keyword'],
        newKeyword: '',
        validationError: '',
        syncStatus: 'success',
      });
    });
  });

  describe('lifecycle methods', () => {
    it('should set up event listeners on mount', () => {
      const component = new KeywordsModalClass({
        definition: mockDefinition,
        updateDefinition: vi.fn(),
        triggerSave: vi.fn(),
        onClose: vi.fn(),
        show: true,
      });

      component.componentDidMount();
      expect(global.addEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
    });

    it('should clean up event listeners on unmount', () => {
      const component = new KeywordsModalClass({
        definition: mockDefinition,
        updateDefinition: vi.fn(),
        triggerSave: vi.fn(),
        onClose: vi.fn(),
        show: true,
      });

      component.componentWillUnmount();
      expect(global.removeEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
    });
  });

  describe('save and cancel functionality', () => {
    it('should call onClose when cancel is clicked', () => {
      const onCloseMock = vi.fn();
      const component = new KeywordsModalClass({
        definition: mockDefinition,
        updateDefinition: vi.fn(),
        triggerSave: vi.fn(),
        onClose: onCloseMock,
        show: true,
      });

      component.handleCancel();

      expect(onCloseMock).toHaveBeenCalled();
    });

    it('should call updateDefinition and onClose when save is clicked', () => {
      const updateDefinitionMock = vi.fn();
      const onCloseMock = vi.fn();
      const component = new KeywordsModalClass({
        definition: mockDefinition,
        updateDefinition: updateDefinitionMock,
        triggerSave: vi.fn(),
        onClose: onCloseMock,
        show: true,
      });

      // Directly modify the state to simulate setState behavior
      component.state.keywords = ['updated', 'keywords'];
      component.handleSave();

      // The handleSave method creates a new definition object with updated keywords
      expect(updateDefinitionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          keywords: ['updated', 'keywords'],
        }),
      );
      expect(onCloseMock).toHaveBeenCalled();
    });

    it('should send keywords_saved message on save', () => {
      // Mock window.parent to be different from window to trigger postMessage
      const originalParent = window.parent;
      const mockPostMessage = vi.fn();
      Object.defineProperty(window, 'parent', {
        value: { postMessage: mockPostMessage },
        writable: true,
        configurable: true,
      });

      const component = new KeywordsModalClass({
        definition: mockDefinition,
        updateDefinition: vi.fn(),
        triggerSave: vi.fn(),
        onClose: vi.fn(),
        show: true,
      });

      component.handleSave();

      // The notifyParentKeywordsUpdate method should be called, which calls postMessage
      expect(mockPostMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'keywords_saved',
          keywords: component.state.keywords,
        }),
        expect.any(String),
      );

      // Restore original parent
      Object.defineProperty(window, 'parent', { value: originalParent });
    });
  });
});
