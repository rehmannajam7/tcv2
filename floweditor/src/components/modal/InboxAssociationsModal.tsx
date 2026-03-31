import * as React from 'react';
import { applyVueInReact } from 'veaury';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import i18n from 'config/i18n';
import AppState from 'store/state';
import { Asset, AssetStore } from 'store/flowContext';
import { FlowDefinition } from 'flowTypes';
import AssetSelector from 'components/form/assetselector/AssetSelector';
import { DispatchWithState, triggerSave } from 'store/thunks';
import { updateDefinition } from 'store/flowContext';

// @ts-ignore
import Unnnic from '@weni/unnnic-system';
import styles from './InboxAssociationsModal.module.scss';

const UnnnicModal = applyVueInReact(Unnnic.unnnicModal, {
  vue: {
    componentWrap: 'div',
    slotWrap: 'div',
    componentWrapAttrs: {
      style: {
        all: '',
        position: 'relative',
        zIndex: 10e2,
      },
    },
  },
  react: {
    componentWrap: 'div',
    slotWrap: 'div',
    componentWrapAttrs: {
      __use_react_component_wrap: '',
      style: {
        all: '',
      },
    },
  },
});

const UnnnicButton = applyVueInReact(Unnnic.unnnicButton, {
  vue: {
    componentWrap: 'div',
    slotWrap: 'div',
    componentWrapAttrs: {
      style: {
        display: 'flex',
        flex: 1,
      },
    },
  },
});

export interface InboxAssociationsModalStoreProps {
  definition: FlowDefinition;
  assetStore: AssetStore;
}

export interface InboxAssociationsModalDispatchProps {
  updateDefinition: (definition: FlowDefinition) => void;
  triggerSave: () => void;
}

export interface InboxAssociationsModalPassedProps {
  show: boolean;
  onClose: () => void;
}

export type InboxAssociationsModalProps = InboxAssociationsModalStoreProps &
  InboxAssociationsModalDispatchProps &
  InboxAssociationsModalPassedProps;

interface InboxAssociationsModalState {
  selectedChannels: Asset[];
}

export class InboxAssociationsModal extends React.Component<
  InboxAssociationsModalProps,
  InboxAssociationsModalState
> {
  constructor(props: InboxAssociationsModalProps) {
    super(props);

    console.log('🔍 Constructor Debug:');
    console.log('🔍 props.definition:', JSON.stringify(props.definition, null, 2));
    console.log('🔍 props.definition.inboxAssociations:', JSON.stringify(props.definition.inboxAssociations, null, 2));
    console.log('🔍 props.assetStore.channels:', JSON.stringify(props.assetStore.channels, null, 2));
    console.log('🔍 props.assetStore.channels?.items:', JSON.stringify(props.assetStore.channels?.items, null, 2));

    // Initialize selected channels from current definition
    const currentChannels = this.props.definition.inboxAssociations || [];
    console.log('- currentChannels:', currentChannels);
    
    // Get all available channels from the asset store
    // Handle both array format (from API) and object format (expected by types)
    const channelItemsRaw = this.props.assetStore.channels?.items || {};
    const channelItems = Array.isArray(channelItemsRaw) ? channelItemsRaw : Object.values(channelItemsRaw);
    
    console.log('- Available channel items (normalized to array):', JSON.stringify(channelItems, null, 2));
    console.log('- Available channel count:', channelItems.length);
    
    // Log each available channel in detail
    channelItems.forEach((channel, index) => {
      console.log(`🔍 CONSTRUCTOR: Available channel [${index}]:`, JSON.stringify(channel, null, 2));
    });

    const selectedChannels = currentChannels
      .map(channelId => {
        console.log(`- Looking up channelId: ${channelId}`);
        const idStr = String(channelId);
        
        // Find channel by matching the id property of the asset
        let channel = channelItems.find((asset: Asset) => String(asset.id) === idStr);
        
        // If not found, try to find by matching the uuid in content
        if (!channel) {
          console.log(`- Asset.id lookup failed for ${channelId}, searching by content.uuid`);
          channel = channelItems.find((asset: Asset) => 
            asset.content && String(asset.content.uuid) === idStr
          );
        }

        // If still not found, try to find by matching content.id (numeric/string)
        if (!channel) {
          console.log(`- content.uuid lookup failed for ${channelId}, searching by content.id`);
          channel = channelItems.find((asset: Asset) => 
            asset.content && asset.content.id != null && String(asset.content.id) === idStr
          );
        }
        
        console.log(`- Found channel for ${channelId}:`, JSON.stringify(channel, null, 2));
        return channel;
      })
      .filter(Boolean); // Remove any undefined channels

    console.log('- Final selectedChannels:', selectedChannels);
    console.log('- Selected channel count:', selectedChannels.length);

    this.state = {
      selectedChannels,
    };
  }

  componentDidUpdate(prevProps: InboxAssociationsModalProps): void {
    console.log('🔍 ComponentDidUpdate Debug:');
    console.log('- prevProps.definition.inboxAssociations:', JSON.stringify(prevProps.definition.inboxAssociations, null, 2));
    console.log('- this.props.definition.inboxAssociations:', JSON.stringify(this.props.definition.inboxAssociations, null, 2));
    
    // Update selected channels if the definition changes
    if (prevProps.definition.inboxAssociations !== this.props.definition.inboxAssociations) {
      console.log('- inboxAssociations changed, updating state');
      
      const currentChannels = this.props.definition.inboxAssociations || [];
      const channelItems = this.props.assetStore.channels?.items || {};
      
      const selectedChannels = currentChannels
        .map(channelId => {
          console.log(`- ComponentDidUpdate: Looking up channelId: ${channelId}`);
          const idStr = String(channelId);
          
          // Try direct lookup first with string key
          let channel = (channelItems as any)[idStr];
          
          // If not found, try to find by matching the id property of the asset
          if (!channel) {
            console.log(`- ComponentDidUpdate: Direct lookup failed for ${channelId}, searching by asset.id`);
            channel = Object.values(channelItems).find((asset: Asset) => String(asset.id) === idStr);
          }
          
          // If still not found, try to find by matching the uuid in content
          if (!channel) {
            console.log(`- ComponentDidUpdate: Asset.id lookup failed for ${channelId}, searching by content.uuid`);
            channel = Object.values(channelItems).find((asset: Asset) => 
              asset.content && String(asset.content.uuid) === idStr
            );
          }

          // If still not found, try matching content.id
          if (!channel) {
            console.log(`- ComponentDidUpdate: content.uuid lookup failed for ${channelId}, searching by content.id`);
            channel = Object.values(channelItems).find((asset: Asset) => 
              asset.content && asset.content.id != null && String(asset.content.id) === idStr
            );
          }
          
          console.log(`- ComponentDidUpdate: Found channel for ${channelId}:`, channel);
          return channel;
        })
        .filter(Boolean);

      console.log('- ComponentDidUpdate: Final selectedChannels:', selectedChannels);
      
      this.setState({ selectedChannels });
    }
    
    // Also check if the asset store channels have been updated (e.g., loaded for the first time)
    if (prevProps.assetStore.channels !== this.props.assetStore.channels) {
      console.log('- Asset store channels changed, re-initializing selected channels');
      
      const currentChannels = this.props.definition.inboxAssociations || [];
      const channelItems = this.props.assetStore.channels?.items || {};
      
      // Only update if we have channels to work with and some are supposed to be selected
      if (Object.keys(channelItems).length > 0 && currentChannels.length > 0) {
        const selectedChannels = currentChannels
          .map(channelId => {
            console.log(`- AssetStore update: Looking up channelId: ${channelId}`);
            const idStr = String(channelId);
            
            // Try direct lookup first with string key
            let channel = (channelItems as any)[idStr];
            
            // If not found, try to find by matching the id property of the asset
            if (!channel) {
              console.log(`- AssetStore update: Direct lookup failed for ${channelId}, searching by asset.id`);
              channel = Object.values(channelItems).find((asset: Asset) => String(asset.id) === idStr);
            }
            
            // If still not found, try to find by matching the uuid in content
            if (!channel) {
              console.log(`- AssetStore update: Asset.id lookup failed for ${channelId}, searching by content.uuid`);
              channel = Object.values(channelItems).find((asset: Asset) => 
                asset.content && String(asset.content.uuid) === idStr
              );
            }

            // If still not found, try matching content.id
            if (!channel) {
              console.log(`- AssetStore update: content.uuid lookup failed for ${channelId}, searching by content.id`);
              channel = Object.values(channelItems).find((asset: Asset) => 
                asset.content && asset.content.id != null && String(asset.content.id) === idStr
              );
            }
            
            console.log(`- AssetStore update: Found channel for ${channelId}:`, channel);
            return channel;
          })
          .filter(Boolean);

        console.log('- AssetStore update: Final selectedChannels:', selectedChannels);
        
        // Only update state if we found more channels than currently selected
        if (selectedChannels.length > this.state.selectedChannels.length) {
          this.setState({ selectedChannels });
        }
      }
    }
  }

  private handleChannelChange = (channels: Asset[]): void => {
    console.log('🔄 INBOX MODAL: handleChannelChange called', {
      newChannels: JSON.stringify(channels, null, 2),
      channelCount: channels.length,
      timestamp: new Date().toISOString()
    });
    
    this.setState({ selectedChannels: channels }, () => {
      console.log('🔄 INBOX MODAL: State updated after channel change', {
        selectedChannels: JSON.stringify(this.state.selectedChannels, null, 2),
        selectedChannelCount: this.state.selectedChannels.length
      });
    });
  };

  private handleSave = (): void => {
    console.log('🔄 INBOX MODAL: handleSave called', {
      selectedChannels: JSON.stringify(this.state.selectedChannels, null, 2),
      selectedChannelsCount: this.state.selectedChannels.length,
      timestamp: new Date().toISOString()
    });

    // Log each selected channel in detail
    this.state.selectedChannels.forEach((channel, index) => {
      console.log(`🔄 INBOX MODAL: Selected channel ${index + 1}:`, {
        name: channel.name,
        id: channel.id,
        content_uuid: channel.content?.uuid,
        fullChannel: JSON.stringify(channel, null, 2)
      });
    });

    // Map selected channels to their UUIDs, preferring content.uuid over asset.id
    const channelUuids = this.state.selectedChannels
      .map((channel: Asset) => {
        const uuid = channel.content?.uuid || channel.id;
        console.log('🔄 INBOX MODAL: Mapping channel to UUID:', {
          channelName: channel.name,
          contentUuid: channel.content?.uuid,
          assetId: channel.id,
          selectedUuid: uuid
        });
        return uuid;
      })
      .filter((uuid: string) => uuid != null);

    console.log('🔄 INBOX MODAL: Final channel UUIDs for save:', {
      channelUuids: JSON.stringify(channelUuids, null, 2),
      count: channelUuids.length
    });

    // Get current definition
    const currentDefinition = this.props.definition;
    console.log('🔄 INBOX MODAL: Current definition before update:', {
      uuid: currentDefinition.uuid,
      name: currentDefinition.name,
      revision: currentDefinition.revision,
      currentInboxAssociations: JSON.stringify(currentDefinition.inboxAssociations, null, 2),
      hasInboxAssociations: !!currentDefinition.inboxAssociations
    });

    // Update the definition with inbox associations
    const updatedDefinition = {
      ...currentDefinition,
      inboxAssociations: channelUuids,
    };

    console.log('🔄 INBOX MODAL: Updated definition:', {
      uuid: updatedDefinition.uuid,
      name: updatedDefinition.name,
      revision: updatedDefinition.revision,
      newInboxAssociations: JSON.stringify(updatedDefinition.inboxAssociations, null, 2),
      inboxAssociationsCount: updatedDefinition.inboxAssociations?.length || 0,
      changesMade: JSON.stringify(currentDefinition.inboxAssociations) !== JSON.stringify(updatedDefinition.inboxAssociations)
    });

    // Update the definition in the store
    console.log('🔄 INBOX MODAL: Calling updateDefinition...');
    this.props.updateDefinition(updatedDefinition);
    
    console.log('🔄 INBOX MODAL: Calling triggerSave...');
    this.props.triggerSave();
    
    console.log('🔄 INBOX MODAL: Calling onClose...');
    this.props.onClose();
    
    console.log('🔄 INBOX MODAL: handleSave completed');
  };

  private handleCancel = (): void => {
    console.log('🔍 HandleCancel Debug:');
    console.log('- Current definition.inboxAssociations:', this.props.definition.inboxAssociations);
    
    // Reset to the current definition state
    const currentChannels = this.props.definition.inboxAssociations || [];
    
    // Handle both array format (from API) and object format (expected by types)
    const channelItemsRaw = this.props.assetStore.channels?.items || {};
    const channelItems = Array.isArray(channelItemsRaw) ? channelItemsRaw : Object.values(channelItemsRaw);
    
    const selectedChannels = currentChannels
      .map(channelId => {
        console.log(`- HandleCancel: Looking up channelId: ${channelId}`);
        const idStr = String(channelId);
        
        // Find channel by matching the id property of the asset
        let channel = channelItems.find((asset: Asset) => String(asset.id) === idStr);
        
        // If not found, try to find by matching the uuid in content
        if (!channel) {
          console.log(`- HandleCancel: Asset.id lookup failed for ${channelId}, searching by content.uuid`);
          channel = channelItems.find((asset: Asset) => 
            asset.content && String(asset.content.uuid) === idStr
          );
        }

        // If still not found, try matching content.id
        if (!channel) {
          console.log(`- HandleCancel: content.uuid lookup failed for ${channelId}, searching by content.id`);
          channel = channelItems.find((asset: Asset) => 
            asset.content && asset.content.id != null && String(asset.content.id) === idStr
          );
        }
        
        console.log(`- HandleCancel: Found channel for ${channelId}:`, channel);
        return channel;
      })
      .filter(Boolean);

    console.log('- HandleCancel: Reset selectedChannels:', selectedChannels);
    
    this.setState({ selectedChannels });
    this.props.onClose();
  };

  public render(): JSX.Element {
    console.log('🔍 Render Debug:');
    console.log('- this.props.show:', this.props.show);
    console.log('- this.props.assetStore.channels:', this.props.assetStore.channels);
    console.log('- this.props.assetStore.channels?.items:', this.props.assetStore.channels?.items);
    console.log('- Object.keys(this.props.assetStore.channels?.items || {}):', Object.keys(this.props.assetStore.channels?.items || {}));
    console.log('- this.state.selectedChannels:', this.state.selectedChannels);
    console.log('- AssetSelector will receive assets:', this.props.assetStore.channels);
    console.log('- AssetSelector will receive entry:', { value: this.state.selectedChannels });
    
    // More detailed debugging
    const channelItemsRaw = this.props.assetStore.channels?.items || {};
    const channelItems = Array.isArray(channelItemsRaw) ? channelItemsRaw : Object.values(channelItemsRaw);
    console.log('🔍 Channel Items Details (normalized to array):', JSON.stringify(channelItems, null, 2));
    
    console.log('🔍 Selected Channels Details:', JSON.stringify(this.state.selectedChannels, null, 2));
    console.log('🔍 Entry being passed to AssetSelector:', JSON.stringify({ value: this.state.selectedChannels }, null, 2));
    
    console.log('🔍 Asset Store Full Structure:', JSON.stringify(this.props.assetStore, null, 2));

    if (!this.props.show) {
      return <></>;
    }

    return (
      <UnnnicModal className={styles.modal} closeIcon={false}>
        <div className={styles.content}>
          <div className={styles.header}>
            <h2 className={styles.title}>
              {i18n.t('inbox_associations.title', 'Inbox Associations')}
            </h2>
            <p className={styles.description}>
              {i18n.t(
                'inbox_associations.description',
                'Select which channels this flow should be associated with for inbox routing.'
              )}
            </p>
          </div>

          <div className={styles.selector_container}>
            <label className={styles.label}>
              {i18n.t('inbox_associations.channels_label', 'Associated Channels')}
            </label>
            <AssetSelector
              name="channels"
              multi={true}
              assets={this.props.assetStore.channels}
              valueKey="id"
              entry={{ value: this.state.selectedChannels }}
              onChange={(channels: Asset[]) => {
                console.log('🔄 INBOX MODAL: AssetSelector onChange called', {
                  receivedChannels: JSON.stringify(channels, null, 2),
                  channelCount: channels?.length || 0,
                  timestamp: new Date().toISOString()
                });
                this.handleChannelChange(channels);
              }}
              createAssetFromInput={null}
              onAssetCreated={null}
              errorMessage={this.props.assetStore.channels?.error}
            />
          </div>

          <div className={styles.buttons}>
            <UnnnicButton
              type="tertiary"
              text={i18n.t('inbox_associations.cancel', 'Cancel')}
              onClick={this.handleCancel}
            />
            <UnnnicButton
              type="primary"
              text={i18n.t('inbox_associations.save', 'Save')}
              onClick={this.handleSave}
            />
          </div>
        </div>
      </UnnnicModal>
    );
  }
}

const mapStateToProps = (state: AppState): InboxAssociationsModalStoreProps => ({
  definition: state.flowContext.definition,
  assetStore: state.flowContext.assetStore,
});

const mapDispatchToProps = (dispatch: DispatchWithState): InboxAssociationsModalDispatchProps =>
  bindActionCreators(
    {
      updateDefinition,
      triggerSave,
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(InboxAssociationsModal);