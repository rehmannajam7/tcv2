import { react as bindCallbacks } from 'auto-bind';
import * as axios from 'axios';
import { getTime, isMessage, isMT } from 'components/simulator/helpers';
import LogEvent, { EventProps } from 'components/simulator/LogEvent';
import ContextExplorer from './ContextExplorer';
import styles from 'components/simulator/Simulator.module.scss';
import SwitchElement, {
  SwitchSizes,
} from 'components/form/switch/SwitchElement';
import GuidingSteps from 'components/guidingsteps/GuidingSteps';
import { ConfigProviderContext, fakePropType } from 'config/ConfigProvider';
import { getURL } from 'external';
import { getAuthToken, getAccountContext } from 'external';
import { FlowDefinition, Group, Wait } from 'flowTypes';
import update from 'immutability-helper';
import { ReactNode } from 'react';
import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Activity, RecentMessage } from 'store/editor';
import { RenderNodeMap, Asset } from 'store/flowContext';
import { getCurrentDefinition } from 'store/helpers';
import AppState from 'store/state';
import { DispatchWithState, MergeEditorState } from 'store/thunks';
import { createUUID } from 'utils';
import { PopTabType } from 'config/interfaces';
import i18n from 'config/i18n';
import { applyVueInReact } from 'veaury';

// @ts-ignore
import Unnnic from '@weni/unnnic-system';

const UnnnicIcon = applyVueInReact(Unnnic.unnnicIcon, {
  vue: {
    componentWrap: 'div',
    slotWrap: 'div',
    componentWrapAttrs: {
      style: {
        all: '',
      },
    },
  },
});

const MESSAGE_DELAY_MS = 200;

const MAP_THUMB =
  'https://user-images.githubusercontent.com/30026625/254405938-58f4c526-b06e-4890-b19c-2d3af55b7962.jpg';
const IMAGE_A =
  'https://s3.amazonaws.com/floweditor-assets.temba.io/simulator/sim_image_a.jpg';
const IMAGE_B =
  'https://s3.amazonaws.com/floweditor-assets.temba.io/simulator/sim_image_b.jpg';
const IMAGE_C =
  'https://s3.amazonaws.com/floweditor-assets.temba.io/simulator/sim_image_c.jpg';
const AUDIO_A =
  'https://s3.amazonaws.com/floweditor-assets.temba.io/simulator/sim_audio_a.mp3';
const VIDEO_A =
  'https://s3.amazonaws.com/floweditor-assets.temba.io/simulator/sim_video_a.mp4';

const VIDEO_A_THUMB =
  'https://s3.amazonaws.com/floweditor-assets.temba.io/simulator/sim_video_a_thumb.jpg';

interface PostMessage {
  text: string;
  uuid: string;
  urn: string;
  attachments: string[];
}

interface Message {
  text: string;
  inbound: boolean;
}

export interface SimulatorStoreProps {
  nodes: RenderNodeMap;
  definition: FlowDefinition;

  activity: Activity;

  language: Asset;

  // TODO: take away responsibility of simulator for resetting this
  liveActivity: Activity;
}

export interface SimulatorPassedProps {
  mergeEditorState: MergeEditorState;
  onToggled: (visible: boolean, tab: PopTabType) => void;
  popped: string;
}

export type SimulatorProps = SimulatorStoreProps & SimulatorPassedProps;

enum DrawerType {
  audio = 'audio',
  images = 'images',
  videos = 'videos',
  location = 'location',
  digit = 'digit',
  digits = 'digits',
  quickReplies = 'quickReplies',
  optionList = 'optionList',
}

interface SimulatorState {
  visible: boolean;
  session?: Session;
  context?: any;
  contact: Contact;
  channel: string;
  events: EventProps[];
  active: boolean;
  time: string;

  keypadEntry: string;

  quickReplies?: string[];
  optionList?: string[];

  // are we currently simulating a sprint
  sprinting: boolean;

  // is our drawer open
  drawerOpen: boolean;

  // what type of drawer are we looking at
  drawerType?: DrawerType;

  // how tall our drawer is
  drawerHeight: number;

  // is our attachment type selection open
  attachmentOptionsVisible: boolean;

  // if we can see our context explorer
  contextExplorerVisible: boolean;

  // are we at a wait hint, ie, a forced attachment
  waitingForHint: boolean;

  simulatorStyle: string;
}

interface Contact {
  uuid: string;
  urns: string[];
  fields: {};
  groups: Group[];
}

interface Step {
  arrived_on: Date;
  uuid: string;
  exit_uuid: string;
  node_uuid: string;
}

interface Run {
  path: Step[];
  flow_uuid: string;
  status: string;
  events?: EventProps[];
  wait?: Wait;
}

interface RunContext {
  contact: Contact;
  session: Session;
  context?: any;
  events: EventProps[];
}

interface Session {
  runs: Run[];
  contact: Contact;
  input?: any;
  wait?: Wait;
  status?: string;
}

/**
 * Our dev console for simulating or testing expressions
 */
export class Simulator extends React.Component<SimulatorProps, SimulatorState> {
  private debug: Session[] = [];
  private flows: FlowDefinition[] = [];
  private currentFlow: string;
  private inputBox: HTMLInputElement;

  private drawerEle: HTMLDivElement;

  // marks the bottom of our chat
  private bottom: any;

  public static contextTypes = {
    config: fakePropType,
  };

  constructor(props: SimulatorProps, context: ConfigProviderContext) {
    super(props);
    this.state = {
      active: false,
      visible: false,
      events: [],
      contact: {
        uuid: createUUID(),
        urns: ['tel:+12065551212'],
        fields: {},
        groups: [],
      },
      keypadEntry: '',
      drawerHeight: 0,
      channel: createUUID(),
      time: getTime(),
      waitingForHint: false,
      drawerOpen: false,
      attachmentOptionsVisible: false,
      contextExplorerVisible: false,
      sprinting: false,
      simulatorStyle: 'default',
    };
    this.bottomRef = this.bottomRef.bind(this);
    this.inputBoxRef = this.inputBoxRef.bind(this);
    this.currentFlow = this.props.definition.uuid;

    bindCallbacks(this, {
      include: [/^on/, /^get/, /^handle/],
    });
  }

  private bottomRef(ref: any): void {
    return (this.bottom = ref);
  }

  private inputBoxRef(ref: any): void {
    this.inputBox = ref;
  }

  private updateActivity(
    recentMessages: { [key: string]: RecentMessage[] } = {},
  ): void {
    if (this.state.session) {
      // if we are resetting, clear our recent messages

      let lastExit: string = null;
      const paths: { [key: string]: number } = {};
      const active: { [nodeUUID: string]: number } = {};
      let activeFlow: string;

      for (const run of this.state.session.runs) {
        let finalStep: Step = null;

        for (const step of run.path) {
          if (lastExit) {
            const key = lastExit + ':' + step.node_uuid;
            let pathCount = paths[key];
            if (!pathCount) {
              pathCount = 0;
            }
            paths[key] = ++pathCount;
            if (!(key in recentMessages)) {
              recentMessages[key] = [];
            }
          }
          lastExit = step.exit_uuid;
          finalStep = step;
        }

        if (finalStep) {
          let count = active[finalStep.node_uuid];
          if (!count) {
            count = 0;
          }

          if (lastExit) {
            const lastKey = lastExit + ':' + null;
            paths[lastKey] = 1;

            if (!(lastKey in recentMessages)) {
              recentMessages[lastKey] = [];
            }
          }

          if (this.state.session.status === 'waiting') {
            active[finalStep.node_uuid] = ++count;
          }
          activeFlow = run.flow_uuid;
        }
      }

      // if we are resetting, clear our recent messages
      const simulatedMessages = this.state.session.input
        ? this.props.activity.recentMessages || {}
        : {};

      for (const key in recentMessages) {
        let messages = simulatedMessages[key] || [];
        messages = recentMessages[key].concat(messages);
        simulatedMessages[key] = messages;
      }

      const activity: Activity = {
        segments: paths,
        nodes: active,
        recentMessages: simulatedMessages,
      };

      this.props.mergeEditorState({ activity });
      if (activeFlow && activeFlow !== this.currentFlow) {
        this.currentFlow = activeFlow;
      }
    }
  }

  private updateEvents(
    events: EventProps[],
    session: Session,
    recentMessages: { [key: string]: RecentMessage[] },
    callback: () => void,
  ): void {
    if (events && events.length > 0) {
      const toAdd = [];

      let quickReplies: string[] = null;
      let optionList: string[] = null;

      let messageFound = false;
      while (events && events.length > 0 && !messageFound) {
        const event = events.shift();
        if (!event) {
          continue;
        }

        if (isMessage(event)) {
          messageFound = true;

          // if it's a message add it to our recent messages
          let fromUUID = '';
          let toUUID = '';

          // work backwards, since our events are recent
          const runs =
            session && Array.isArray(session.runs) ? session.runs : [];
          for (let i = runs.length - 1; i >= 0; i--) {
            const path =
              runs[i] && Array.isArray(runs[i].path) ? runs[i].path : [];

            // start at the penultimate node since we have nowhere to render recent messages for the last node
            for (let j = path.length - 1; j >= 0; j--) {
              if (path[j] && path[j].uuid === event.step_uuid) {
                fromUUID = path[j].exit_uuid;
                toUUID =
                  path.length > j + 1 && path[j + 1]
                    ? path[j + 1].node_uuid
                    : null;
                break;
              }
            }

            if (fromUUID) {
              const key = `${fromUUID}:${toUUID}`;
              const msg: RecentMessage = {
                sent: event.created_on,
                text:
                  event.msg && typeof event.msg.text === 'string'
                    ? event.msg.text
                    : '',
              };
              if (key in recentMessages) {
                recentMessages[key].unshift(msg);
              } else {
                recentMessages[key] = [msg];
              }
            }
          }

          if (isMT(event) && event.msg) {
            // save off any quick replies we might have
            if (event.msg.quick_replies) {
              quickReplies = event.msg.quick_replies;
            } else if (
              event.msg.list_message &&
              Array.isArray(event.msg.list_message.list_items)
            ) {
              optionList = event.msg.list_message.list_items
                .map(item => (item && item.title ? item.title : ''))
                .filter(Boolean);
            }
          }
        }

        toAdd.push(event);
      }

      const newEvents = update(this.state.events, {
        $push: toAdd,
      }) as EventProps[];
      const newState: Partial<SimulatorState> = { events: newEvents };

      if (quickReplies !== null) {
        newState.quickReplies = quickReplies;
      }
      if (optionList !== null) {
        newState.optionList = optionList;
      }

      this.scrollToBottom();

      this.setState(newState as SimulatorState, () => {
        if (events.length === 0) {
          callback();
        } else {
          window.setTimeout(() => {
            this.updateEvents(events, session, recentMessages, callback);
          }, MESSAGE_DELAY_MS);
        }
      });
    } else {
      callback();
    }
  }

  private updateRunContext(runContext: RunContext, msg?: PostMessage): void {
    const wasJustActive =
      this.state.active ||
      (runContext && runContext.events && runContext.events.length > 0);
    this.setState({ quickReplies: [], optionList: [] }, () => {
      const runs =
        runContext &&
        runContext.session &&
        Array.isArray(runContext.session.runs)
          ? runContext.session.runs
          : [];
      const run = runs.length ? runs[runs.length - 1] : null;
      const path = run && Array.isArray(run.path) ? run.path : [];
      const step = path.length ? path[path.length - 1] : null;

      if (!runContext.events || (runContext.events.length === 0 && msg)) {
        runContext.events = [
          {
            msg: {
              uuid: createUUID(),
              urn:
                (this.state.contact &&
                  Array.isArray(this.state.contact.urns) &&
                  this.state.contact.urns[0]) ||
                '',
              text: msg && typeof msg.text === 'string' ? msg.text : '',
              attachments: (msg && msg.attachments) || [],
            },
            type: 'msg_created',
            created_on: new Date().toISOString(),
            step_uuid: step ? step.uuid : createUUID(),
          },
        ];
      }

      const newlyRecentMessages = {};

      this.updateEvents(
        runContext.events,
        runContext.session,
        newlyRecentMessages,
        () => {
          let active = false;
          const sessionRuns =
            runContext &&
            runContext.session &&
            Array.isArray(runContext.session.runs)
              ? runContext.session.runs
              : [];
          for (const run of sessionRuns) {
            if (run && run.status === 'waiting') {
              active = true;
              break;
            }
          }

          let newEvents = this.state.events;
          if (!active && wasJustActive) {
            newEvents = update(this.state.events, {
              $push: [
                {
                  type: 'info',
                  text: i18n.t('simulator.flow_exited', 'Exited flow'),
                  created_on: new Date(),
                } as any,
              ],
            }) as EventProps[];
          }

          const waitingForHint =
            runContext &&
            runContext.session &&
            runContext.session.wait &&
            runContext.session.wait.hint !== undefined;

          let drawerType = null;
          if (waitingForHint) {
            const hint =
              runContext.session.wait && runContext.session.wait.hint;
            switch (hint && hint.type) {
              case 'audio':
                drawerType = DrawerType.audio;
                break;
              case 'video':
                drawerType = DrawerType.videos;
                break;
              case 'image':
                drawerType = DrawerType.images;
                break;
              case 'location':
                drawerType = DrawerType.location;
                break;
              case 'digits':
                drawerType = DrawerType.digit;
                if (hint && hint.count !== 1) {
                  drawerType = DrawerType.digits;
                }
                break;
              default:
                if (hint) {
                  console.log('Unknown hint', hint.type);
                }
            }
          }

          let drawerOpen = waitingForHint;

          // if we have quick replies, open our drawe with attachment options
          if (!drawerType && this.hasQuickReplies()) {
            drawerType = DrawerType.quickReplies;
            drawerOpen = true;
          }

          if (!drawerType && this.hasOptions()) {
            drawerType = DrawerType.optionList;
            drawerOpen = true;
          }

          this.setState(
            {
              active,
              context: runContext.context,
              sprinting: false,
              session: runContext.session || this.state.session,
              events: newEvents,
              drawerOpen,
              drawerType,
              waitingForHint,
            },
            () => {
              this.updateActivity(newlyRecentMessages);
              this.handleFocusUpdate();
            },
          );
        },
      );
    });
  }

  private startFlow(): void {
    this.setState({ sprinting: true }, () => {
      const now = new Date().toISOString();

      const body: any = {
        flow: getCurrentDefinition(
          this.props.definition,
          this.props.nodes,
          false,
        ),
        trigger: {
          type: 'manual',
          environment: {
            date_format: 'DD-MM-YYYY',
            time_format: 'tt:mm',
            timezone: 'America/New_York',
            allowed_languages: ['eng'],
            default_country: 'US',
            redaction_policy: 'none',
          },
          contact: {
            uuid: this.state.contact.uuid,
            urns: this.state.contact.urns,
            fields: this.state.contact.fields,
            groups: this.state.contact.groups,
            name: this.props.definition.name,
          },
          params: {},
          triggered_on: now,
        },
      };

      const simulateStartUrl = getURL(
        this.context.config.endpoints.simulateStart,
      );

      // Debug logging for URL construction
      console.log('🔍 Simulator startFlow: Attempting to start flow');
      console.log(
        '🔍 Simulator startFlow: Config endpoints:',
        this.context.config.endpoints,
      );
      console.log(
        '🔍 Simulator startFlow: simulateStart endpoint:',
        this.context.config.endpoints.simulateStart,
      );
      console.log('🔍 Simulator startFlow: Constructed URL:', simulateStartUrl);
      console.log('🔍 Simulator startFlow: URL type:', typeof simulateStartUrl);
      console.log('🔍 Simulator startFlow: Body:', body);

      if (
        !simulateStartUrl ||
        simulateStartUrl === 'undefined' ||
        simulateStartUrl === ''
      ) {
        console.error('❌ Simulator startFlow: Invalid API URL detected!');
        console.error(
          '❌ Simulator startFlow: simulateStart endpoint:',
          this.context.config.endpoints.simulateStart,
        );

        const currentStepUuid = createUUID();
        const events = update(this.state.events, {
          $push: [
            {
              step_uuid: currentStepUuid,
              type: 'error',
              text:
                'Invalid simulator configuration: simulateStart URL is empty',
            } as EventProps,
          ],
        });

        // ensure non-readonly array is used when updating state
        this.setState({
          events: [...(events as EventProps[])],
          sprinting: false,
        });
        return;
      }

      // Mock mode removed; always use live API

      // Get authentication token and account context
      const authToken = getAuthToken();
      const accountId = getAccountContext();

      console.log('🔍 Simulator startFlow: Auth token available:', !!authToken);
      console.log('🔍 Simulator startFlow: Account ID:', accountId);

      // Prepare headers with authentication
      const headers: any = {
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
        headers['X-Requested-With'] = 'XMLHttpRequest';
        if (accountId) {
          headers['X-Account-ID'] = accountId;
        }
      }

      console.log('🔍 Simulator startFlow: Request headers:', headers);

      axios.default
        .post(simulateStartUrl, body, { headers })
        .then((response: axios.AxiosResponse) => {
          console.log('✅ Simulator startFlow: Response received:', response);
          this.updateRunContext(response.data as RunContext);
        })
        .catch(error => {
          console.error('❌ Simulator startFlow: Request failed:', error);
          console.error('❌ Simulator startFlow: Error details:', {
            message: error.message,
            response: error.response,
            config: error.config,
          });

          const currentStepUuid = createUUID();
          const events = update(this.state.events, {
            $push: [
              {
                step_uuid: currentStepUuid,
                type: 'error',
                text:
                  error.response && error.response.status > 499
                    ? 'Server error, try again later'
                    : error.response &&
                      error.response.data &&
                      error.response.data.error
                    ? error.response.data.error
                    : 'Network error, check your connection',
              } as EventProps,
            ],
          });
          // ensure non-readonly array is used when updating state
          this.setState({
            events: [...(events as EventProps[])],
            sprinting: false,
          });
        });
    });
  }

  private resume(text: string, attachment?: string): void {
    if (!text && !attachment) {
      return;
    }

    if (text === '\\debug') {
      console.log(JSON.stringify(this.debug, null, 2));
      return;
    }

    if (text === '\\recalc') {
      console.log('recal..');
      // this.props.plumberRepaint();
      return;
    }

    this.setState(
      { sprinting: true, attachmentOptionsVisible: false, drawerOpen: false },
      () => {
        const now = new Date().toISOString();

        const msg: PostMessage = {
          text,
          uuid: createUUID(),
          urn: this.state.session.contact.urns[0],
          attachments: attachment ? [attachment] : [],
        };

        const body: any = {
          flow: getCurrentDefinition(
            this.props.definition,
            this.props.nodes,
            false,
          ),
          session: this.state.session,
          resume: {
            type: 'msg',
            msg,
            resumed_on: now,
            contact: this.state.session.contact,
          },
        };

        const simulateResumeUrl = getURL(
          this.context.config.endpoints.simulateResume,
        );

        // Debug logging for URL construction
        console.log('🔍 Simulator resume: Attempting to resume flow');
        console.log(
          '🔍 Simulator resume: Config endpoints:',
          this.context.config.endpoints,
        );
        console.log(
          '🔍 Simulator resume: simulateResume endpoint:',
          this.context.config.endpoints.simulateResume,
        );
        console.log('🔍 Simulator resume: Constructed URL:', simulateResumeUrl);
        console.log('🔍 Simulator resume: URL type:', typeof simulateResumeUrl);
        console.log('🔍 Simulator resume: Message:', text);
        console.log('🔍 Simulator resume: Body:', body);

        if (
          !simulateResumeUrl ||
          simulateResumeUrl === 'undefined' ||
          simulateResumeUrl === ''
        ) {
          console.error('❌ Simulator resume: Invalid API URL detected!');
          console.error(
            '❌ Simulator resume: simulateResume endpoint:',
            this.context.config.endpoints.simulateResume,
          );
          return;
        }

        // Mock mode removed; always use live API

        // Get authentication token and account context
        const authToken = getAuthToken();
        const accountId = getAccountContext();

        console.log('🔍 Simulator resume: Auth token available:', !!authToken);
        console.log('🔍 Simulator resume: Account ID:', accountId);

        // Prepare headers with authentication
        const headers: any = {
          'Content-Type': 'application/json',
        };

        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
          headers['X-Requested-With'] = 'XMLHttpRequest';
          if (accountId) {
            headers['X-Account-ID'] = accountId;
          }
        }

        console.log('🔍 Simulator resume: Request headers:', headers);

        axios.default
          .post(simulateResumeUrl, body, { headers })
          .then((response: axios.AxiosResponse) => {
            console.log('✅ Simulator resume: Response received:', response);
            this.updateRunContext(response.data as RunContext, msg);
          })
          .catch(error => {
            console.error('❌ Simulator resume: Request failed:', error);
            console.error('❌ Simulator resume: Error details:', {
              message: error.message,
              response: error.response,
              config: error.config,
            });

            const currentStepUuid =
              this.state.session &&
              this.state.session.runs &&
              this.state.session.runs.length &&
              this.state.session.runs[this.state.session.runs.length - 1]
                .path &&
              this.state.session.runs[this.state.session.runs.length - 1].path
                .length
                ? this.state.session.runs[this.state.session.runs.length - 1]
                    .path[
                    this.state.session.runs[this.state.session.runs.length - 1]
                      .path.length - 1
                  ].uuid
                : createUUID();

            const events = update(this.state.events, {
              $push: [
                {
                  step_uuid: currentStepUuid,
                  type: 'error',
                  text:
                    error.response && error.response.status > 499
                      ? 'Server error, try again later'
                      : error.response &&
                        error.response.data &&
                        error.response.data.error
                      ? error.response.data.error
                      : 'Network error, check your connection',
                } as EventProps,
              ],
            });
            // ensure non-readonly array is used when updating state
            this.setState({
              events: [...(events as EventProps[])],
              sprinting: false,
            });
          });
      },
    );
  }

  private onReset(event: any): void {
    this.startFlow();
  }

  private scrollToBottom(delay?: number): void {
    const wait = delay || 0;
    if (this.bottom) {
      window.setTimeout(() => {
        if (this.bottom && typeof this.bottom.scrollIntoView === 'function') {
          this.bottom.scrollIntoView(false);
        }
      }, wait);
    }
  }

  public componentDidUpdate(
    prevProps: SimulatorProps,
    prevState: SimulatorState,
  ): void {
    if (this.drawerEle !== null) {
      if (
        prevState.drawerHeight !== this.drawerEle.clientHeight ||
        prevState.drawerOpen !== this.state.drawerOpen
      ) {
        this.setState({ drawerHeight: this.drawerEle.clientHeight }, () => {
          this.scrollToBottom(800);
        });
      }
    }
  }

  private onKeyUp(event: any): void {
    if (event.key === 'Enter') {
      const ele = event.target;
      const text = ele.value;
      ele.value = '';
      this.resume(text);
    }
  }

  private onToggle(event: any): void {
    this.props.mergeEditorState({ currentGuide: null, guidingStep: -1 });

    const newVisible = !this.state.visible;

    this.props.onToggled(newVisible, PopTabType.SIMULATOR);

    this.props.mergeEditorState({ simulating: newVisible });

    this.setState(
      { visible: newVisible, contextExplorerVisible: false },
      () => {
        // clear our viewing definition
        if (!this.state.visible) {
          window.setTimeout(() => {
            this.props.mergeEditorState({ activity: this.props.liveActivity });
          }, 500);
        } else {
          this.updateActivity();

          // start our flow if we haven't already
          if (this.state.events.length === 0) {
            this.startFlow();
          }

          this.handleFocusUpdate();
        }
      },
    );
  }

  private handleFocusUpdate(): void {
    if (this.inputBox) {
      this.inputBox.focus();
    }
  }

  private sendAttachment(attachment: string): void {
    this.setState(
      { drawerOpen: false, attachmentOptionsVisible: false },
      () => {
        window.setTimeout(() => {
          this.resume(null, attachment);
        }, 200);
      },
    );
  }

  private getImageDrawer(): JSX.Element {
    return (
      <div className={styles.drawer_items}>
        <div
          data-testid="image_a"
          className={styles.drawer_item}
          onClick={() => {
            this.sendAttachment('image/jpeg:' + IMAGE_A);
          }}
        >
          <img src={IMAGE_A} alt="Attachment" />
        </div>
        <div
          className={styles.drawer_item}
          onClick={() => {
            this.sendAttachment('image/jpeg:' + IMAGE_B);
          }}
        >
          <img src={IMAGE_B} alt="Attachment" />
        </div>
        <div
          className={styles.drawer_item}
          onClick={() => {
            this.sendAttachment('image/jpeg:' + IMAGE_C);
          }}
        >
          <img src={IMAGE_C} alt="Attachment" />
        </div>
      </div>
    );
  }

  public getLocationDrawer(): JSX.Element {
    return (
      <div
        className={styles.map_thumb}
        onClick={() => {
          this.sendAttachment('geo:2.904194,-79.003418');
        }}
      >
        <img src={MAP_THUMB} alt="Attachment" />
      </div>
    );
  }

  private getAudioDrawer(): JSX.Element {
    return (
      <div
        className={styles.audio_picker}
        onClick={() => {
          this.sendAttachment('audio/mp3:' + AUDIO_A);
        }}
      >
        <UnnnicIcon
          className={styles.audio_icon}
          icon="microphone"
          size="md"
          scheme="neutral-cloudy"
        />
        <div className={styles.audio_message}>Upload Audio</div>
      </div>
    );
  }

  private getVideoDrawer(): JSX.Element {
    return (
      <div className={styles.drawer_items}>
        <div
          className={styles.drawer_item}
          onClick={() => {
            this.sendAttachment('video/mp4:' + VIDEO_A);
          }}
        >
          <img src={VIDEO_A_THUMB} alt="Attachment" />
        </div>
        <div
          className={styles.drawer_item}
          onClick={() => {
            this.sendAttachment('video/mp4:' + VIDEO_A);
          }}
        >
          <img src={VIDEO_A_THUMB} alt="Attachment" />
        </div>
        <div
          className={styles.drawer_item}
          onClick={() => {
            this.sendAttachment('video/mp4:' + VIDEO_A);
          }}
        >
          <img src={VIDEO_A_THUMB} alt="Attachment" />
        </div>
      </div>
    );
  }

  private getQuickRepliesDrawer(): JSX.Element {
    return (
      <div className={styles.quick_replies}>
        {this.state.quickReplies.map(reply => (
          <div
            className={styles.quick_reply}
            onClick={() => {
              this.resume(reply);
            }}
            key={`reply_${reply}`}
          >
            {reply}
          </div>
        ))}
      </div>
    );
  }

  private getOptionsDrawer(): JSX.Element {
    return (
      <div className={styles.quick_replies}>
        {this.state.optionList.map(option => (
          <div
            className={styles.quick_reply}
            onClick={() => {
              this.resume(option);
            }}
            key={`option_${option}`}
          >
            {option}
          </div>
        ))}
      </div>
    );
  }

  private handleKeyPress(btn: string, multiple: boolean): void {
    if (!multiple) {
      this.resume(btn);
    } else {
      if (btn === '#') {
        this.resume(this.state.keypadEntry);
        this.setState({ keypadEntry: '' });
      } else {
        this.setState((prevState: SimulatorState) => {
          return { keypadEntry: prevState.keypadEntry += btn };
        });
      }
    }
  }

  private getKeyRow(keys: string[], multiple: boolean): JSX.Element {
    return (
      <div className={styles.row}>
        {keys.map((key: string) => {
          return (
            <div
              key={'btn_' + key}
              onClick={() => {
                this.handleKeyPress(key, multiple);
              }}
              className={styles.key}
            >
              {key}
            </div>
          );
        })}
      </div>
    );
  }

  private getKeypadDrawer(multiple: boolean): JSX.Element {
    return (
      <div className={styles.keypad}>
        {multiple ? (
          <div className={styles.keypad_entry}>{this.state.keypadEntry}</div>
        ) : null}
        <div className={styles.keys}>
          {this.getKeyRow(['1', '2', '3'], multiple)}
          {this.getKeyRow(['4', '5', '6'], multiple)}
          {this.getKeyRow(['7', '8', '9'], multiple)}
          {this.getKeyRow(['*', '0', '#'], multiple)}
        </div>
      </div>
    );
  }

  private getDrawerContents(): JSX.Element {
    switch (this.state.drawerType) {
      case DrawerType.location:
        return this.getLocationDrawer();
      case DrawerType.audio:
        return this.getAudioDrawer();
      case DrawerType.images:
        return this.getImageDrawer();
      case DrawerType.videos:
        return this.getVideoDrawer();
      case DrawerType.quickReplies:
        return this.getQuickRepliesDrawer();
      case DrawerType.optionList:
        return this.getOptionsDrawer();
      case DrawerType.digits:
      case DrawerType.digit:
        return this.getKeypadDrawer(
          this.state.drawerType === DrawerType.digits,
        );
    }
    return null;
  }

  private handleDrawerRef(ref: HTMLDivElement): HTMLDivElement {
    return (this.drawerEle = ref);
  }

  public getDrawer(): JSX.Element {
    const style: any = {};

    if (this.state.drawerOpen) {
      style.bottom = 65;

      // are we being forced open
      if (this.state.waitingForHint) {
        style.bottom = 25;
        style.zIndex = 150;
        style.paddingBottom = 10;
      }
    } else {
      style.bottom = -this.state.drawerHeight;
    }

    return (
      <div
        ref={this.handleDrawerRef}
        style={style}
        className={
          styles.drawer +
          ' ' +
          (this.state.drawerOpen ? styles.drawer_visible : '') +
          ' ' +
          (this.state.attachmentOptionsVisible ? '' : styles.forced)
        }
      >
        {this.getDrawerContents()}
      </div>
    );
  }

  private hasQuickReplies(): boolean {
    return (this.state.quickReplies || []).length > 0;
  }

  private hasOptions(): boolean {
    return (this.state.optionList || []).length > 0;
  }

  private handleHideAttachments(): void {
    this.setState(
      {
        attachmentOptionsVisible: false,
        drawerOpen: false,
      },
      () => {
        if (this.hasQuickReplies()) {
          window.setTimeout(() => {
            this.showAttachmentDrawer(DrawerType.quickReplies);
          }, 300);
        } else if (this.hasOptions()) {
          window.setTimeout(() => {
            this.showAttachmentDrawer(DrawerType.optionList);
          }, 300);
        }
      },
    );
  }

  private getAttachmentButton(
    icon: string,
    drawerType: DrawerType,
  ): JSX.Element {
    return (
      <div
        data-testid={`attachment-${drawerType}`}
        onClick={() => {
          this.showAttachmentDrawer(drawerType);
        }}
      >
        <UnnnicIcon
          className={styles.icon}
          icon={icon}
          size="md"
          scheme="neutral-cloudy"
        />
      </div>
    );
  }

  private getAttachmentOptions(): JSX.Element {
    return (
      <div
        className={
          styles.attachment_buttons +
          ' ' +
          (this.state.attachmentOptionsVisible ? styles.visible : '')
        }
      >
        <span className="ml-auto">
          {this.getAttachmentButton('video-file-mp4-1', DrawerType.videos)}
        </span>
        {this.getAttachmentButton(
          'common-file-horizontal-image-1',
          DrawerType.images,
        )}
        {this.getAttachmentButton('microphone', DrawerType.audio)}
        {this.getAttachmentButton('location_on', DrawerType.location)}
        <div
          data-testid="hide_attachments_button"
          className="ml-auto"
          onClick={this.handleHideAttachments}
        >
          <UnnnicIcon icon="close" size="md" scheme="neutral-cloudy" />
        </div>
      </div>
    );
  }

  private getContextExplorer(): JSX.Element {
    return (
      <ContextExplorer
        visible={this.state.contextExplorerVisible}
        contents={this.state.context}
      />
    );
  }

  private handleHideAttachmentDrawer(): void {
    this.setState({ drawerOpen: false });
  }

  private showAttachmentDrawer(drawerType: DrawerType): void {
    // if we are already open but a different type, hide ourselves and reopen with the new type
    if (this.state.drawerOpen) {
      // if that type is already open, its a noop
      if (drawerType === this.state.drawerType) {
        return;
      }

      this.handleHideAttachmentDrawer();
      window.setTimeout(() => {
        this.showAttachmentDrawer(drawerType);
      }, 300);
    } else {
      this.setState((prevState: SimulatorState) => {
        return { drawerOpen: true, drawerType };
      });
    }
  }

  private handleSimulatorStyleChange() {
    this.setState({
      simulatorStyle:
        this.state.simulatorStyle === 'default' ? 'whatsapp' : 'default',
    });
  }

  private preloadBgImage() {
    const img = new Image();
    img.src =
      'https://user-images.githubusercontent.com/30026625/242899357-3b7dd272-b2bf-4ac4-a4e1-aba24556a9f2.png';
  }

  public componentDidMount() {
    this.preloadBgImage();
  }

  private startNextTour() {
    this.props.mergeEditorState({
      currentGuide: 'control_tools',
      guidingStep: 0,
    });
  }

  public render(): ReactNode {
    const simStyle =
      this.state.simulatorStyle === 'whatsapp' ? styles.whatsapp : '';

    const messages: JSX.Element[] = [];
    for (const event of this.state.events) {
      messages.push(
        <LogEvent
          {...event}
          key={event.type + '_' + String(event.created_on)}
          style={this.state.simulatorStyle === 'whatsapp' ? 'whatsapp' : ''}
        />,
      );
    }

    const hidden =
      this.props.popped && this.props.popped !== PopTabType.SIMULATOR;
    const simHidden = hidden || !this.state.visible ? styles.sim_hidden : '';
    const tabHidden = hidden || this.state.visible ? styles.tab_hidden : '';

    const messagesStyle: any = {
      height: 366 - (this.state.drawerOpen ? this.state.drawerHeight - 20 : 0),
    };

    // if attachments are forced open, account for missing attachment choice panel
    if (this.state.drawerOpen && this.state.waitingForHint) {
      messagesStyle.height += 25;
    }

    return (
      <div id="sim_container" className={styles.sim_container}>
        <div>
          <div
            id="simulator"
            className={styles.simulator + ' ' + simHidden}
            key={'sim'}
          >
            {this.getContextExplorer()}

            <div className={styles.screen}>
              <div className={styles.header + ' ' + simStyle}>
                <div className={styles.reset} onClick={this.onReset}>
                  <UnnnicIcon
                    icon="button-refresh-arrow-1"
                    size="md"
                    scheme="neutral-snow"
                  />
                </div>

                <div className={styles.close} onClick={this.onToggle}>
                  <UnnnicIcon icon="close" size="md" scheme="neutral-snow" />
                </div>
              </div>
              <div
                className={styles.messages + ' ' + simStyle}
                style={messagesStyle}
              >
                {messages}
                <div
                  id="bottom"
                  style={{ float: 'left', clear: 'both', marginTop: 20 }}
                  ref={this.bottomRef}
                />
              </div>
              <div className={styles.controls}>
                <input
                  ref={this.inputBoxRef}
                  type="text"
                  onKeyUp={this.onKeyUp}
                  disabled={
                    this.state.sprinting ||
                    Object.keys(this.props.nodes).length === 0
                  }
                  placeholder={
                    this.state.active
                      ? i18n.t('simulator.prompt.message', 'Enter message')
                      : i18n.t(
                          'simulator.prompt.restart',
                          'Press refresh to start again',
                        )
                  }
                />
                <div
                  data-testid="show_attachments_button"
                  className={styles.show_attachments_button}
                  onClick={() => {
                    this.setState({
                      attachmentOptionsVisible: true,
                      drawerOpen: false,
                    });
                  }}
                >
                  <UnnnicIcon
                    icon="attachment"
                    size="sm"
                    scheme="neutral-cloudy"
                  />
                </div>
              </div>
              {this.getAttachmentOptions()}
              {this.getDrawer()}
              <div className={styles.footer + ' ' + simStyle}>
                {!this.state.contextExplorerVisible ? (
                  <div className={styles.show_context_button}>
                    <div
                      data-testid="context_show_button"
                      className="context-button"
                      onClick={() => {
                        this.setState({
                          contextExplorerVisible: true,
                        });
                      }}
                    >
                      <UnnnicIcon
                        icon="alternate_email"
                        size="sm"
                        scheme="neutral-snow"
                      />
                    </div>
                  </div>
                ) : (
                  <div className={styles.show_context_button}>
                    <div
                      data-testid="context_hide_button"
                      className="context-button"
                      onClick={() => {
                        this.setState({
                          contextExplorerVisible: false,
                        });
                      }}
                    >
                      <UnnnicIcon
                        icon="close"
                        size="sm"
                        scheme="neutral-snow"
                      />
                    </div>
                  </div>
                )}

                <div
                  data-testid="whatsapp_switch"
                  className={styles.whatsapp_switch}
                >
                  <span>WhatsApp</span>
                  <SwitchElement
                    name="WhatsApp"
                    checked={this.state.simulatorStyle === 'whatsapp'}
                    onChange={this.handleSimulatorStyleChange}
                    size={SwitchSizes.small}
                  />
                </div>
                {/* Mock mode removed: simulator is always live */}
              </div>
            </div>
          </div>
        </div>

        <GuidingSteps
          className={styles.guiding_steps}
          guide="v2"
          step={2}
          title={i18n.t('guiding.v2.2.title', 'WhatsApp simulator skin')}
          description={i18n.t(
            'guiding.v2.2.description',
            'Now the simulator looks like WhatsApp\nso you can more faithfully predict how your flow will look.',
          )}
          buttonText={i18n.t('guiding.v2.2.button', 'Got it 3/3')}
          side="left"
          action={() => this.startNextTour()}
        >
          <div
            data-testid="simulator_toggle"
            className={styles.simulator_tab + ' ' + tabHidden}
            onClick={this.onToggle}
          >
            <div className={styles.simulator_tab_icon}>
              <UnnnicIcon
                icon="button-play-1"
                size="lg"
                scheme="neutral-snow"
              />
            </div>
            <div className={styles.simulator_tab_text}>
              {i18n.t('simulator.label', 'Run in Simulator')}
            </div>
          </div>
        </GuidingSteps>
      </div>
    );
  }
}

/* istanbul ignore next -- @preserve */
const mapStateToProps = ({
  flowContext: { definition, nodes },
  editorState: { liveActivity, activity, language },
}: AppState) => ({
  liveActivity,
  activity,
  definition,
  nodes,
  language,
});

/* istanbul ignore next -- @preserve */
const mapDispatchToProps = (dispatch: DispatchWithState) =>
  bindActionCreators({}, dispatch);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(Simulator);
