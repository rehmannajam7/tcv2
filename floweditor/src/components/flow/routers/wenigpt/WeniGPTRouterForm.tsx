import { react as bindCallbacks } from 'auto-bind';
import Dialog, { ButtonSet } from 'components/dialog/Dialog';
import { renderIssues } from 'components/flow/actions/helpers';
import { RouterFormProps } from 'components/flow/props';
import {
  nodeToState,
  stateToNode,
} from 'components/flow/routers/wenigpt/helpers';
import { createResultNameInput } from 'components/flow/routers/widgets';
import SelectElement from 'components/form/select/SelectElement';
import TextInputElement from 'components/form/textinput/TextInputElement';
import TypeList from 'components/nodeeditor/TypeList';
import * as React from 'react';
import { FormEntry, FormState, mergeForm, StringEntry } from 'store/nodeEditor';
import { shouldRequireIf, validate } from 'store/validators';

import styles from './WeniGPTRouterForm.module.scss';
import i18n from 'config/i18n';
import { getEndpoints } from 'config/endpoints';
import { getAuthToken, getAccountContext } from 'external/index';

export interface KnowledgeBase {
  id: string;
  name: string;
  content?: { intelligence?: string };
  label?: string;
}

export interface WeniGPTRouterFormState extends FormState {
  knowledgeBase: FormEntry;
  expression: StringEntry;
  resultName: StringEntry;
  knowledgeBases: KnowledgeBase[];
}

export default class WeniGPTRouterForm extends React.Component<
  RouterFormProps,
  WeniGPTRouterFormState
> {
  constructor(props: RouterFormProps) {
    super(props);
    this.state = nodeToState(this.props.nodeSettings, this.props.assetStore);
    bindCallbacks(this, {
      include: [/^handle/],
    });
  }

  public async componentDidMount(): Promise<void> {
    if ((this.state.knowledgeBases || []).length >= 0) {
      try {
        const endpoints = getEndpoints();
        console.log('🔍 WeniGPT: Endpoints resolved:', {
          knowledgeBases: endpoints.knowledgeBases,
          captainAssistants: endpoints.captainAssistants
        });
        
        const headers: any = { 'Content-Type': 'application/json' };
        const token = getAuthToken() || (new URLSearchParams(window.location.search).get('token') || '');
        // Prefer accountId from path when running inside Chatwoot app
        const pathMatch = window.location.pathname.match(/\/accounts\/(\d+)/);
        const accountIdFromPath = pathMatch ? pathMatch[1] : null;
        const accountId = accountIdFromPath || getAccountContext() || (new URLSearchParams(window.location.search).get('account_id') || '');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          headers['api-access-token'] = token;
        }
        if (accountId) {
          headers['X-Account-ID'] = accountId;
        }

        console.log('🔍 WeniGPT: Making API calls with headers:', headers);
        console.log('🔍 WeniGPT: Knowledge bases URL:', endpoints.knowledgeBases);
        console.log('🔍 WeniGPT: Captain assistants URL:', endpoints.captainAssistants);
        
        const kbResp = await fetch(endpoints.knowledgeBases, {
          method: 'GET',
          headers,
        }).catch((error: Error) => {
          return null;
        });
        
        console.log('🔍 WeniGPT: Knowledge bases fetch completed:', kbResp ? {
          status: kbResp.status,
          statusText: kbResp.statusText,
          ok: kbResp.ok,
          url: kbResp.url
        } : 'null');
        
        const captainResp = await fetch(endpoints.captainAssistants, {
          method: 'GET',
          headers,
        }).catch((error: Error) => {
          console.error('🔍 WeniGPT: Captain assistants API failed:', error);
          return null;
        });
        
        console.log('🔍 WeniGPT: Captain assistants fetch completed:', captainResp ? {
          status: captainResp.status,
          statusText: captainResp.statusText,
          ok: captainResp.ok,
          url: captainResp.url
        } : 'null');
        
        console.log('🔍 WeniGPT: API responses:', {
          kbResp: kbResp ? { status: kbResp.status, ok: kbResp.ok } : 'null',
          captainResp: captainResp ? { status: captainResp.status, ok: captainResp.ok } : 'null'
        });

        let kbJson = kbResp && kbResp.ok ? await kbResp.json() : null;
        let captainJson = captainResp && captainResp.ok ? await captainResp.json() : null;
        
        console.log('🔍 WeniGPT: Raw JSON data:', {
          kbJson: kbJson ? JSON.stringify(kbJson).substring(0, 200) : 'null',
          captainJson: captainJson ? JSON.stringify(captainJson).substring(0, 200) : 'null'
        });

        // Handle API wrapper format (statusCode + body)
        const parseApiResponse = (data: any) => {
          if (!data) return null;
          
          // Check if it's the wrapper format with statusCode and body
          if (data.statusCode === 200 && data.body) {
            try {
              const bodyData = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;
              console.log('🔍 WeniGPT: Parsed wrapper format:', bodyData);
              return bodyData;
            } catch (e) {
              console.error('🔍 WeniGPT: Failed to parse body:', e);
              return data;
            }
          }
          
          return data;
        };
        
        kbJson = parseApiResponse(kbJson);
        captainJson = parseApiResponse(captainJson);
        
        console.log('🔍 WeniGPT: Parsed JSON data after wrapper handling:', {
          kbJson: kbJson ? 'data received' : 'null',
          captainJson: captainJson ? 'data received' : 'null'
        });

        const extract = (data: unknown) => {
          if (Array.isArray(data)) return data;
          if (data && typeof data === 'object') {
            const obj: any = data;
            if (Array.isArray(obj.payload)) return obj.payload;
            if (Array.isArray(obj.results)) return obj.results;
            if (Array.isArray(obj.data)) return obj.data;
          }
          return [];
        };

        interface APIKnowledgeBase {
          id?: string | number;
          uuid?: string;
          name?: string;
          label?: string;
          intelligence?: string;
          content?: { intelligence?: string };
        }

        const wenigptKBs = extract(kbJson).map((item: APIKnowledgeBase) => {
          const mapped = {
            id: String(item.id ?? item.uuid ?? ''),
            name: item.name ?? item.label ?? String(item.id ?? ''),
            content: { intelligence: item.intelligence ?? item?.content?.intelligence ?? 'KB' },
          };
          console.log('🔍 WeniGPT: Mapping KB item:', item, '->', mapped);
          return mapped;
        });
        
        console.log('🔍 WeniGPT: Extracted WeniGPT KBs:', wenigptKBs);

        const captainKBs = extract(captainJson).map((item: APIKnowledgeBase) => {
          const mapped = {
            id: String(item.id ?? item.uuid ?? ''),
            name: item.name ?? item.label ?? String(item.id ?? ''),
            content: { intelligence: 'Captain' },
          };
          console.log('🔍 WeniGPT: Mapping Captain item:', item, '->', mapped);
          return mapped;
        });
        
        console.log('🔍 WeniGPT: Extracted Captain KBs:', captainKBs);

        let merged = [...wenigptKBs, ...captainKBs].map((kb) => ({
          ...kb,
          label: `${kb.content?.intelligence} - ${kb.name}`,
        }));
        
        console.log('🔍 WeniGPT: Merged KBs before fallback:', merged);
        console.log('🔍 WeniGPT: First few items:', merged.slice(0, 3));

        if (merged.length === 0) {
          console.log('🔍 WeniGPT: No data from APIs, trying static fallback...');
          try {
            const fallback = await fetch('/assets/knowledge_bases.json');
            console.log('🔍 WeniGPT: Fallback fetch response:', { status: fallback.status, ok: fallback.ok });
            if (fallback.ok) {
              const fallbackJson = await fallback.json();
              console.log('🔍 WeniGPT: Fallback JSON data:', fallbackJson);
              merged = (Array.isArray(fallbackJson) ? fallbackJson : []).map(
                (item: APIKnowledgeBase) => ({
                  id: String(item.id ?? item.uuid ?? ''),
                  name: item.name ?? item.label ?? String(item.id ?? ''),
                  content: { intelligence: item.intelligence ?? 'KB' },
                  label: `${item.intelligence ?? 'KB'} - ${
                    item.name ?? String(item.id ?? '')
                  }`,
                }),
              );
              console.log('🔍 WeniGPT: Final merged data from fallback:', merged);
            }
          } catch (error) {
            console.error('🔍 WeniGPT: Fallback failed:', error);
          }
        } else {
          console.log('🔍 WeniGPT: Using API data, no fallback needed');
        }

        if (merged.length > 0) {
          this.setState({ knowledgeBases: merged });
        } else {
          this.setState({ knowledgeBases: this.state.knowledgeBases });
        }
      } catch (_) {
        // ignore network errors; UI already shows redirect link
      }
    }
  }

  public componentDidUpdate(prevProps: Readonly<RouterFormProps>): void {
    if (prevProps.assetStore !== this.props.assetStore) {
      const recalculated = nodeToState(this.props.nodeSettings, this.props.assetStore);
      this.setState({ knowledgeBases: recalculated.knowledgeBases });
    }
  }

  private handleUpdate(
    keys: {
      knowledgeBase?: any;
      expression?: string;
      resultName?: string;
    },
    submitting = false,
  ): boolean {
    const updates: Partial<WeniGPTRouterFormState> = {};

    if (keys.hasOwnProperty('knowledgeBase')) {
      updates.knowledgeBase = validate(
        i18n.t('forms.knowledge_base', 'Knowledge Base'),
        keys.knowledgeBase,
        [shouldRequireIf(submitting)],
      );
    }

    if (keys.hasOwnProperty('expression')) {
      updates.expression = validate(
        i18n.t('forms.expression', 'Expression'),
        keys.expression,
        [shouldRequireIf(submitting)],
      );
    }

    if (keys.hasOwnProperty('resultName')) {
      updates.resultName = validate(
        i18n.t('forms.result_name', 'Result Name'),
        keys.resultName,
        [shouldRequireIf(submitting)],
      );
    }

    const updated = mergeForm(this.state, updates);

    // update our form
    this.setState(updated);
    return updated.valid;
  }

  private handleUpdateResultName(value: string): boolean {
    return this.handleUpdate({ resultName: value });
  }

  private handleExpressionUpdate(expression: string): boolean {
    return this.handleUpdate({ expression });
  }

  private handleKnowledgeBaseUpdate(knowledgeBase: any): boolean {
    return this.handleUpdate({ knowledgeBase });
  }

  private handleRedirectClick(): void {
    window.parent.postMessage(
      { event: 'redirect', path: 'intelligences:init/force' },
      '*',
    );
  }

  private handleSave(): void {
    const valid = this.handleUpdate(
      {
        knowledgeBase: this.state.knowledgeBase.value,
        expression: this.state.expression.value,
        resultName: this.state.resultName.value,
      },
      true,
    );

    if (valid) {
      this.props.updateRouter(stateToNode(this.props.nodeSettings, this.state));
      this.props.onClose(false);
    }
  }

  private getButtons(): ButtonSet {
    return {
      primary: { name: i18n.t('buttons.save'), onClick: this.handleSave },
      secondary: {
        name: i18n.t('buttons.cancel', 'Cancel'),
        onClick: () => this.props.onClose(true),
      },
    };
  }

  private renderEdit(): JSX.Element {
    const typeConfig = this.props.typeConfig;

    return (
      <Dialog
        title={typeConfig.name}
        headerClass={typeConfig.type}
        buttons={this.getButtons()}
      >
        <TypeList
          __className=""
          initialType={typeConfig}
          onChange={this.props.onTypeChange}
          nodeSettings={this.props.nodeSettings}
        />
        <div className={styles.content}>
          <div className={styles.knowledge_base}>
            <SelectElement
              key="knowledge_base_select"
              name={i18n.t('forms.knowledge_base', 'Knowledge Base')}
              placeholder={i18n.t(
                'forms.knowledge_base_placeholder',
                'Select a knowledge base',
              )}
              showLabel={true}
              entry={this.state.knowledgeBase}
              onChange={this.handleKnowledgeBaseUpdate}
              options={this.state.knowledgeBases}
              nameKey="label"
              valueKey="id"
            />

            <div className={styles.message}>
              <span>
                {i18n.t(
                  'forms.knowledge_base_message',
                  "Don't have any knowledge base for your AI yet?",
                )}
              </span>
              <span className={styles.link} onClick={this.handleRedirectClick}>
                {i18n.t('forms.knowledge_base_click', 'Click here')}
              </span>
            </div>
          </div>

          <TextInputElement
            name={i18n.t(
              'forms.expression_input',
              'Insert an expression to be used as input',
            )}
            showLabel={true}
            placeholder={i18n.t(
              'forms.expression_input_placeholder',
              'Ex: @input.text',
            )}
            entry={this.state.expression}
            onChange={this.handleExpressionUpdate}
            autocomplete={true}
            textarea={true}
          />
        </div>
        {createResultNameInput(
          this.state.resultName,
          this.handleUpdateResultName,
        )}
        {renderIssues(this.props)}
      </Dialog>
    );
  }

  public render(): JSX.Element {
    return this.renderEdit();
  }
}
