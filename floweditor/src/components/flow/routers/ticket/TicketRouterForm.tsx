import { react as bindCallbacks } from 'auto-bind';
import Dialog, { ButtonSet } from 'components/dialog/Dialog';
import {
  getAllErrorMessages,
  hasErrors,
  renderIssues,
} from 'components/flow/actions/helpers';
import { RouterFormProps } from 'components/flow/props';
import { nodeToState, stateToNode } from './helpers';
import { createResultNameInput } from 'components/flow/routers/widgets';
import TypeList from 'components/nodeeditor/TypeList';
import * as React from 'react';
import { FormState, mergeForm, StringEntry, FormEntry } from 'store/nodeEditor';
import {
  Alphanumeric,
  Required,
  shouldRequireIf,
  StartIsNonNumeric,
  validate,
} from 'store/validators';
import AssetSelector from 'components/form/assetselector/AssetSelector';
import { Asset } from 'store/flowContext';
import styles from './TicketRouterForm.module.scss';
import i18n from 'config/i18n';
import TextInputElement from 'components/form/textinput/TextInputElement';
import TembaSelect from 'temba/TembaSelect';
import { fakePropType } from 'config/ConfigProvider';
import { Topic, User } from 'flowTypes';
import axios from 'axios';

export interface TicketRouterFormState extends FormState {
  assignee: FormEntry;
  topic: FormEntry;
  ticketer: FormEntry;
  subject: StringEntry;
  body: StringEntry;
  resultName: StringEntry;
  queues: any[];
  topics: any[];
  loadingQueues: boolean;
}

export default class TicketRouterForm extends React.Component<
  RouterFormProps,
  TicketRouterFormState
> {
  public static contextTypes = {
    config: fakePropType,
  };

  constructor(props: RouterFormProps) {
    super(props);

    // if we only have one ticketer, initialize our form with it
    const ticketers = Object.values(this.props.assetStore.ticketers.items);
    const ticketer = ticketers.length === 1 ? ticketers[0] : null;
    this.state = nodeToState(this.props.nodeSettings, ticketer);

    if (this.state.ticketer.value) {
      try {
        const stateTicketer =
          props.assetStore.ticketers.items[this.state.ticketer.value.uuid];
        this.handleTopicsOptionsUpdateByTicketerType(stateTicketer, false);
      } catch (e) {}
    }

    bindCallbacks(this, {
      include: [/^handle/],
    });
  }
  private handleUpdate(
    keys: {
      assignee?: User;
      topic?: Topic;
      ticketer?: Asset;
      subject?: string;
      body?: string;
      resultName?: string;
      queues?: any[];
      topics?: any[];
    },
    submitting = false,
  ): boolean {
    const updates: Partial<TicketRouterFormState> = {};

    if (keys.hasOwnProperty('assignee')) {
      updates.assignee = validate(
        i18n.t('forms.assignee', 'Assignee'),
        keys.assignee,
        [shouldRequireIf(submitting)],
      );
    }

    if (keys.hasOwnProperty('topic')) {
      updates.topic = validate(i18n.t('forms.topic', 'Topic'), keys.topic, [
        shouldRequireIf(submitting),
      ]);
    }

    if (keys.hasOwnProperty('ticketer')) {
      updates.ticketer = validate(
        i18n.t('forms.ticketer', 'Ticketer'),
        keys.ticketer,
        [shouldRequireIf(submitting)],
      );
    }

    if (keys.hasOwnProperty('subject')) {
      updates.subject = validate(
        i18n.t('forms.subject', 'Subject'),
        keys.subject,
        [],
      );
    }

    if (keys.hasOwnProperty('body')) {
      updates.body = validate(i18n.t('forms.body', 'Body'), keys.body, [
        shouldRequireIf(submitting),
      ]);
    }

    if (keys.hasOwnProperty('resultName')) {
      updates.resultName = validate(
        i18n.t('forms.result_name', 'Result Name'),
        keys.resultName,
        [shouldRequireIf(submitting)],
      );
    }

    if (keys.hasOwnProperty('queues')) {
      updates.queues = keys.queues;
    }

    if (keys.hasOwnProperty('topics')) {
      updates.topics = keys.topics;
    }

    const updated = mergeForm(this.state, updates);

    // update our form
    this.setState(updated);
    return updated.valid;
  }

  private handleTicketerUpdate(selected: Asset[]): void {
    this.handleUpdate({ ticketer: selected[0] });
    this.handleTopicsOptionsUpdateByTicketerType(selected[0], true);
  }

  private handleTopicsOptionsUpdateByTicketerType(
    ticketer: any,
    hasContext: boolean,
  ): void {
    const isWenichatsType =
      ticketer &&
      ticketer.hasOwnProperty('type') &&
      (ticketer['type'] as string) === 'wenichats';

    const ticketerQueuesEndpoint = hasContext
      ? this.context.config.endpoints.ticketer_queues
      : this.props.assetStore.ticketers.endpoint.replace(
          'ticketers',
          'ticketer_queues',
        );

    const url = isWenichatsType
      ? ticketerQueuesEndpoint +
        `?ticketer_uuid=${ticketer.uuid || ticketer.id}`
      : hasContext
      ? this.context.config.endpoints.topics
      : this.props.assetStore.ticketers.endpoint.replace('ticketers', 'topics');

    isWenichatsType && this.setState({ loadingQueues: true });
    axios.get(url).then(response => {
      const topics = isWenichatsType ? response.data : response.data.results;

      let toUpdateTopic = topics.length > 0 ? topics[0] : {};
      if (this.state.topic.value) {
        toUpdateTopic = topics.find(
          (to: any) => to.uuid === this.state.topic.value.uuid,
        );
      }
      const toUpdate = isWenichatsType
        ? { queues: topics, topic: toUpdateTopic as Topic }
        : { topics: topics, topic: toUpdateTopic as Topic };
      this.handleUpdate(toUpdate);
      isWenichatsType && this.setState({ loadingQueues: false });
    });
  }

  private handleAssigneeUpdate(assignee: User): void {
    this.handleUpdate({ assignee });
  }

  private handleTopicUpdate(topic: Topic): void {
    this.handleUpdate({ topic });
  }

  private handleBodyUpdate(body: string): boolean {
    return this.handleUpdate({ body });
  }

  private handleResultNameUpdate(value: string): void {
    const resultName = validate(
      i18n.t('forms.result_name', 'Result Name'),
      value,
      [Required, Alphanumeric, StartIsNonNumeric],
    );
    this.setState({
      resultName,
      valid: this.state.valid && !hasErrors(resultName),
    });
  }

  private handleSave(): void {
    // validate all fields in case they haven't interacted
    const valid = this.handleUpdate(
      {
        ticketer: this.state.ticketer.value,
        subject: this.state.subject.value,
        body: this.state.body.value,
        resultName: this.state.resultName.value,
      },
      true,
    );

    if (valid) {
      this.props.updateRouter(stateToNode(this.props.nodeSettings, this.state));
      this.props.onClose(false);
    }
  }

  private getButtons(isWenichatsType: boolean): ButtonSet {
    return {
      primary: {
        name: i18n.t('buttons.ok', 'Ok'),
        onClick: this.handleSave,
        disabled:
          isWenichatsType &&
          (!this.state.topic.value || this.state.loadingQueues),
      },
      secondary: {
        name: i18n.t('buttons.cancel', 'Cancel'),
        onClick: () => this.props.onClose(true),
      },
    };
  }

  private renderEdit(): JSX.Element {
    const typeConfig = this.props.typeConfig;

    // if we only have one ticketer or we have issues, show the ticket chooser
    const showTicketers =
      Object.keys(this.props.assetStore.ticketers.items).length > 1 ||
      this.props.issues.length > 0;

    let currentTicketer = null;
    if (Object.keys(this.props.assetStore.ticketers.items).length > 0) {
      try {
        const currentTicketerUUID = this.state.ticketer.value.uuid;
        currentTicketer = this.props.assetStore.ticketers.items[
          currentTicketerUUID
        ];
      } catch (e) {}
    }

    const isWenichatsType =
      currentTicketer && (currentTicketer.type as string) === 'wenichats';

    return (
      <Dialog
        title={typeConfig.name}
        headerClass={typeConfig.type}
        buttons={this.getButtons(isWenichatsType)}
      >
        <TypeList
          __className=""
          initialType={typeConfig}
          onChange={this.props.onTypeChange}
          nodeSettings={this.props.nodeSettings}
        />
        {showTicketers ? (
          <div>
            <p>
              <span>Open ticket via... </span>
            </p>
            <AssetSelector
              key="select_ticketer"
              name={i18n.t('forms.ticketer', 'Ticketer')}
              placeholder={i18n.t(
                'forms.ticketer_placeholder',
                'Select the ticketing service to use',
              )}
              assets={this.props.assetStore.ticketers}
              onChange={this.handleTicketerUpdate}
              entry={this.state.ticketer}
            />
          </div>
        ) : (
          ''
        )}

        <div style={{ display: 'flex', width: '100%', marginTop: '0.5em' }}>
          <div style={{ flexBasis: 250 }}>
            <TembaSelect
              name={i18n.t('forms.topic', 'Topic')}
              options={isWenichatsType ? this.state.queues : this.state.topics}
              placeholder={i18n.t(
                'forms.topic_placeholder',
                'Select the topic to use',
              )}
              onChange={this.handleTopicUpdate}
              value={this.state.topic.value}
              createPrefix={i18n.t('forms.topic_prefix', 'Create Topic: ')}
              searchable={!isWenichatsType}
              valueKey="uuid"
              nameKey="name"
            />
          </div>

          <div style={{ flexGrow: 1, marginLeft: '0.5em' }}>
            <TembaSelect
              key="select_assignee"
              name={i18n.t('forms.assignee', 'Assignee')}
              placeholder={i18n.t(
                'forms.assign_to_optional',
                'Assign to (Optional)',
              )}
              valueKey="email"
              endpoint={this.context.config.endpoints.users}
              onChange={this.handleAssigneeUpdate}
              clearable={true}
              value={this.state.assignee.value}
              getName={(user: User) => {
                if (!user.first_name && !user.last_name) {
                  return user.email || '';
                }
                return `${user.first_name} ${user.last_name}`;
              }}
              errors={getAllErrorMessages(this.state.assignee.value)}
            />
          </div>
        </div>
        <div className={styles.body}>
          <TextInputElement
            name={i18n.t('forms.body', 'Body')}
            placeholder={i18n.t('forms.enter_a_body', 'Enter a body')}
            entry={this.state.body}
            onChange={this.handleBodyUpdate}
            autocomplete={true}
            textarea={true}
          />
        </div>

        {createResultNameInput(
          this.state.resultName,
          this.handleResultNameUpdate,
        )}
        {renderIssues(this.props)}
      </Dialog>
    );
  }

  public render(): JSX.Element {
    return this.renderEdit();
  }
}
