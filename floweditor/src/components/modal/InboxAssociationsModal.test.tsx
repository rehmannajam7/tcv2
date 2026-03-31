import * as React from 'react';
import { InboxAssociationsModal } from 'components/modal/InboxAssociationsModal';
import { composeComponentTestUtils } from 'testUtils';
import { shallowToJson } from 'enzyme-to-json';
import { FlowDefinition, UIMetaData } from 'flowTypes';
import { Asset, AssetStore, AssetType } from 'store/flowContext';
import { vi } from 'vitest';
import { merge, set } from 'utils';

// Mock console.log to avoid cluttering test output
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = vi.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
});

// Mock assets for testing
const mockChannelAssets: { [key: string]: Asset } = {
  'channel-uuid-1': {
    id: 'channel-uuid-1',
    name: 'WhatsApp Channel',
    type: AssetType.Channel,
    content: {
      uuid: 'channel-uuid-1',
      name: 'WhatsApp Channel',
      address: '+1234567890',
      schemes: ['whatsapp'],
      roles: ['send', 'receive'],
    },
  },
  'channel-uuid-2': {
    id: 'channel-uuid-2',
    name: 'Telegram Channel',
    type: AssetType.Channel,
    content: {
      uuid: 'channel-uuid-2',
      name: 'Telegram Channel',
      address: '@testbot',
      schemes: ['telegram'],
      roles: ['send', 'receive'],
    },
  },
  'channel-uuid-3': {
    id: 'channel-uuid-3',
    name: 'SMS Channel',
    type: AssetType.Channel,
    content: {
      uuid: 'channel-uuid-3',
      name: 'SMS Channel',
      address: '+9876543210',
      schemes: ['tel'],
      roles: ['send', 'receive'],
    },
  },
};

const mockAssetStore: AssetStore = {
  channels: {
    items: mockChannelAssets,
    type: AssetType.Channel,
  },
};

const mockDefinition: FlowDefinition = {
  uuid: 'test-flow-uuid',
  name: 'Test Flow',
  spec_version: '13.1.0',
  language: 'eng',
  revision: 1,
  localization: {},
  nodes: [],
  _ui: {} as UIMetaData,
  inboxAssociations: ['channel-uuid-1', 'channel-uuid-2'],
};

const baseProps = {
  definition: mockDefinition,
  assetStore: mockAssetStore,
  updateDefinition: vi.fn(),
  triggerSave: vi.fn(),
  onClose: vi.fn(),
};

const { setup, spyOn } = composeComponentTestUtils(
  InboxAssociationsModal,
  baseProps,
);

describe('InboxAssociationsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with selected channels from definition', () => {
      const { wrapper } = setup(false);
      const instance = wrapper.instance() as InboxAssociationsModal;

      expect(instance.state.selectedChannels).toHaveLength(2);
      expect(instance.state.selectedChannels[0].id).toBe('channel-uuid-1');
      expect(instance.state.selectedChannels[1].id).toBe('channel-uuid-2');
    });

    it('should initialize with empty selection when no inboxAssociations', () => {
      const { wrapper } = setup(false, {
        definition: { $merge: { inboxAssociations: [] } },
      });
      const instance = wrapper.instance() as InboxAssociationsModal;

      expect(instance.state.selectedChannels).toHaveLength(0);
    });

    it('should handle missing channels gracefully', () => {
      const propsWithMissingChannels = {
        ...baseProps,
        definition: {
          ...mockDefinition,
          inboxAssociations: [
            'channel-uuid-1',
            'non-existent-channel',
            'channel-uuid-2',
          ],
        },
      };

      const { wrapper } = setup(false, {
        definition: {
          $set: {
            ...mockDefinition,
            inboxAssociations: [
              'channel-uuid-1',
              'non-existent-channel',
              'channel-uuid-2',
            ],
          },
        },
      });
      const instance = wrapper.instance() as InboxAssociationsModal;

      // Should only find the existing channels
      expect(instance.state.selectedChannels).toHaveLength(2);
      expect(instance.state.selectedChannels[0].id).toBe('channel-uuid-1');
      expect(instance.state.selectedChannels[1].id).toBe('channel-uuid-2');
    });
  });

  describe('state persistence', () => {
    it('should update state when definition.inboxAssociations changes', () => {
      const { wrapper } = setup(false);
      const instance = wrapper.instance() as InboxAssociationsModal;

      // Initial state
      expect(instance.state.selectedChannels).toHaveLength(2);

      // Update props with new associations
      const newDefinition = {
        ...mockDefinition,
        inboxAssociations: ['channel-uuid-3'],
      };

      wrapper.setProps({ definition: newDefinition });

      // State should update
      expect(instance.state.selectedChannels).toHaveLength(1);
      expect(instance.state.selectedChannels[0].id).toBe('channel-uuid-3');
    });

    it('should update state when assetStore.channels changes', () => {
      const propsWithEmptyStore = {
        ...baseProps,
        assetStore: {
          channels: {
            items: {},
            type: AssetType.Channel,
          },
        },
      };

      const { wrapper } = setup(false, {
        assetStore: {
          $set: {
            channels: {
              items: {},
              type: AssetType.Channel,
            },
          },
        },
      });
      const instance = wrapper.instance() as InboxAssociationsModal;

      // Initial state should be empty due to missing channels
      expect(instance.state.selectedChannels).toHaveLength(0);

      // Update with populated asset store
      wrapper.setProps({ assetStore: mockAssetStore });

      // State should update with found channels
      expect(instance.state.selectedChannels).toHaveLength(2);
    });
  });

  describe('channel lookup logic', () => {
    it('should find channels by direct UUID lookup', () => {
      const { wrapper } = setup(false);
      const instance = wrapper.instance() as InboxAssociationsModal;

      expect(instance.state.selectedChannels).toHaveLength(2);
      expect(instance.state.selectedChannels[0].name).toBe('WhatsApp Channel');
      expect(instance.state.selectedChannels[1].name).toBe('Telegram Channel');
    });

    it('should find channels by asset.id when direct lookup fails', () => {
      // Create asset store where keys don't match UUIDs
      const assetStoreWithDifferentKeys: AssetStore = {
        channels: {
          items: {
            'different-key-1': {
              ...mockChannelAssets['channel-uuid-1'],
              id: 'channel-uuid-1', // asset.id matches the UUID we're looking for
            },
            'different-key-2': {
              ...mockChannelAssets['channel-uuid-2'],
              id: 'channel-uuid-2',
            },
          },
          type: AssetType.Channel,
        },
      };

      const propsWithDifferentKeys = {
        ...baseProps,
        assetStore: assetStoreWithDifferentKeys,
      };

      const { wrapper } = setup(false, {
        assetStore: { $set: assetStoreWithDifferentKeys },
      });
      const instance = wrapper.instance() as InboxAssociationsModal;

      expect(instance.state.selectedChannels).toHaveLength(2);
      expect(instance.state.selectedChannels[0].name).toBe('WhatsApp Channel');
      expect(instance.state.selectedChannels[1].name).toBe('Telegram Channel');
    });

    it('should find channels by content.uuid when other lookups fail', () => {
      // Create asset store where neither key nor asset.id match, but content.uuid does
      const assetStoreWithContentUuid: AssetStore = {
        channels: {
          items: {
            'different-key-1': {
              id: 'different-asset-id-1',
              name: 'WhatsApp Channel',
              type: AssetType.Channel,
              content: {
                uuid: 'channel-uuid-1', // content.uuid matches what we're looking for
                name: 'WhatsApp Channel',
                address: '+1234567890',
                schemes: ['whatsapp'],
                roles: ['send', 'receive'],
              },
            },
            'different-key-2': {
              id: 'different-asset-id-2',
              name: 'Telegram Channel',
              type: AssetType.Channel,
              content: {
                uuid: 'channel-uuid-2',
                name: 'Telegram Channel',
                address: '@testbot',
                schemes: ['telegram'],
                roles: ['send', 'receive'],
              },
            },
          },
          type: AssetType.Channel,
        },
      };

      const propsWithContentUuid = {
        ...baseProps,
        assetStore: assetStoreWithContentUuid,
      };

      const { wrapper } = setup(false, {
        assetStore: { $set: assetStoreWithContentUuid },
      });
      const instance = wrapper.instance() as InboxAssociationsModal;

      expect(instance.state.selectedChannels).toHaveLength(2);
      expect(instance.state.selectedChannels[0].name).toBe('WhatsApp Channel');
      expect(instance.state.selectedChannels[1].name).toBe('Telegram Channel');
    });
  });

  describe('save functionality', () => {
    it('should save selected channels using correct UUIDs', () => {
      const { wrapper } = setup(false);
      const instance = wrapper.instance() as InboxAssociationsModal;

      // Simulate selecting a different channel
      instance.setState({
        selectedChannels: [mockChannelAssets['channel-uuid-3']],
      });

      // Trigger save
      instance['handleSave']();

      expect(baseProps.updateDefinition).toHaveBeenCalledWith({
        ...mockDefinition,
        inboxAssociations: ['channel-uuid-3'],
      });
      expect(baseProps.triggerSave).toHaveBeenCalled();
      expect(baseProps.onClose).toHaveBeenCalled();
    });

    it('should prefer content.uuid over asset.id when saving', () => {
      const channelWithDifferentIds: Asset = {
        id: 'asset-id-different',
        name: 'Test Channel',
        type: AssetType.Channel,
        content: {
          uuid: 'content-uuid-different',
          name: 'Test Channel',
          address: '+1111111111',
          schemes: ['tel'],
          roles: ['send', 'receive'],
        },
      };

      const { wrapper } = setup(false);
      const instance = wrapper.instance() as InboxAssociationsModal;

      // Set state with channel that has different asset.id and content.uuid
      instance.setState({
        selectedChannels: [channelWithDifferentIds],
      });

      // Trigger save
      instance['handleSave']();

      // Should use content.uuid, not asset.id
      expect(baseProps.updateDefinition).toHaveBeenCalledWith({
        ...mockDefinition,
        inboxAssociations: ['content-uuid-different'],
      });
    });
  });

  describe('cancel functionality', () => {
    it('should reset to original state on cancel', () => {
      const { wrapper } = setup(false);
      const instance = wrapper.instance() as InboxAssociationsModal;

      // Change the state
      instance.setState({
        selectedChannels: [mockChannelAssets['channel-uuid-3']],
      });

      expect(instance.state.selectedChannels).toHaveLength(1);
      expect(instance.state.selectedChannels[0].id).toBe('channel-uuid-3');

      // Trigger cancel
      instance['handleCancel']();

      // Should reset to original definition state
      expect(instance.state.selectedChannels).toHaveLength(2);
      expect(instance.state.selectedChannels[0].id).toBe('channel-uuid-1');
      expect(instance.state.selectedChannels[1].id).toBe('channel-uuid-2');
      expect(baseProps.onClose).toHaveBeenCalled();
    });
  });

  describe('multiple open/close cycles', () => {
    it('should maintain state across multiple modal openings', () => {
      // First opening
      const { wrapper: wrapper1 } = setup(false);
      const instance1 = wrapper1.instance() as InboxAssociationsModal;

      expect(instance1.state.selectedChannels).toHaveLength(2);

      // Simulate save with new selection
      instance1.setState({
        selectedChannels: [mockChannelAssets['channel-uuid-3']],
      });
      instance1['handleSave']();

      // Verify save was called with correct data
      expect(baseProps.updateDefinition).toHaveBeenCalledWith({
        ...mockDefinition,
        inboxAssociations: ['channel-uuid-3'],
      });

      // Second opening with updated definition
      const updatedDefinition = {
        ...mockDefinition,
        inboxAssociations: ['channel-uuid-3'],
      };

      const { wrapper: wrapper2 } = setup(false, {
        definition: { $set: updatedDefinition },
      });
      const instance2 = wrapper2.instance() as InboxAssociationsModal;

      // Should initialize with the saved state
      expect(instance2.state.selectedChannels).toHaveLength(1);
      expect(instance2.state.selectedChannels[0].id).toBe('channel-uuid-3');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined assetStore gracefully', () => {
      const { wrapper } = setup(false, {
        assetStore: { $set: {} as AssetStore },
      });
      const instance = wrapper.instance() as InboxAssociationsModal;

      expect(instance.state.selectedChannels).toHaveLength(0);
    });

    it('should handle empty inboxAssociations array', () => {
      const { wrapper } = setup(false, {
        definition: { $merge: { inboxAssociations: [] } },
      });
      const instance = wrapper.instance() as InboxAssociationsModal;

      expect(instance.state.selectedChannels).toHaveLength(0);
    });

    it('should handle undefined inboxAssociations', () => {
      const { wrapper } = setup(false, {
        definition: { $merge: { inboxAssociations: undefined } },
      });
      const instance = wrapper.instance() as InboxAssociationsModal;

      expect(instance.state.selectedChannels).toHaveLength(0);
    });
  });

  describe('debugging logs', () => {
    it('should log debug information during initialization', () => {
      setup(false);

      // Verify console.log was called with debug information
      const calls = (console.log as any).mock.calls.map((c: any[]) => c[0]);
      expect(calls.includes('🔍 Constructor Debug:')).toBe(true);
      const hasDefinitionLog =
        calls.includes('🔍 props.definition:') ||
        calls.includes('- props.definition:');
      const hasInboxAssociationsLog =
        calls.includes('🔍 props.definition.inboxAssociations:') ||
        calls.includes('- props.definition.inboxAssociations:');
      expect(hasDefinitionLog).toBe(true);
      expect(hasInboxAssociationsLog).toBe(true);
    });

    it('should log debug information during save', () => {
      const { wrapper } = setup(false);
      const instance = wrapper.instance() as InboxAssociationsModal;

      vi.clearAllMocks(); // Clear previous console.log calls

      instance['handleSave']();

      // Accept both legacy and updated log styles
      const calls = (console.log as any).mock.calls.map((c: any[]) => c[0]);
      const hasLegacy = calls.includes('🔍 HandleSave Debug:');
      const hasUpdated = calls.includes('🔄 INBOX MODAL: Updated definition:');
      expect(hasLegacy || hasUpdated).toBe(true);
    });

    it('should log debug information during cancel', () => {
      const { wrapper } = setup(false);
      const instance = wrapper.instance() as InboxAssociationsModal;

      vi.clearAllMocks(); // Clear previous console.log calls

      instance['handleCancel']();

      expect(console.log).toHaveBeenCalledWith('🔍 HandleCancel Debug:');
      expect(console.log).toHaveBeenCalledWith(
        '- Current definition.inboxAssociations:',
        mockDefinition.inboxAssociations,
      );
    });
  });
});
