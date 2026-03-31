import { react as bindCallbacks } from 'auto-bind';
import * as React from 'react';
import Dialog, { ButtonSet } from 'components/dialog/Dialog';
import { hasErrors, renderIssues } from 'components/flow/actions/helpers';
import { RouterFormProps } from 'components/flow/props';
import CaseList, {
  CaseListType,
  CaseProps,
} from 'components/flow/routers/caselist/CaseList';
import {
  nodeToState,
  stateToNode,
} from 'components/flow/routers/smart/response/helpers';
import { createResultNameInput } from 'components/flow/routers/widgets';
import TimeoutControl from 'components/form/timeout/TimeoutControl';
import TypeList from 'components/nodeeditor/TypeList';
import { FormState, StringEntry } from 'store/nodeEditor';
import { Alphanumeric, StartIsNonNumeric, validate } from 'store/validators';
import styles from './ResponseRouterForm.module.scss';
import i18n from 'config/i18n';

import DescriptionAlert from '../DescriptionAlert/DescriptionAlert';
import { renderIf } from '../../../../../utils';

export const leadInSpecId = 'lead-in';

export interface SmartResponseRouterFormState extends FormState {
  cases: CaseProps[];
  hiddenCases: CaseProps[];
  resultName: StringEntry;
  timeout: number;
  hasDescription?: boolean;
}

export default class SmartResponseRouterForm extends React.Component<
  RouterFormProps,
  SmartResponseRouterFormState
> {
  constructor(props: RouterFormProps) {
    super(props);

    this.state = nodeToState(this.props.nodeSettings);

    bindCallbacks(this, {
      include: [/^on/, /^handle/],
    });
  }

  public componentDidMount() {
    window.addEventListener('message', (event: any) => {
      if (
        event &&
        event.data &&
        event.data.event === 'setConnectProjectDescription'
      ) {
        if (event.data.connectProjectDescription.trim().length > 0) {
          this.setState({ hasDescription: true });
        }
      }
    });

    window.parent.postMessage({ event: 'getConnectProjectDescription' }, '*');
  }

  private handleUpdateResultName(value: string): void {
    const resultName = validate(
      i18n.t('forms.result_name', 'Result Name'),
      value,
      [Alphanumeric, StartIsNonNumeric],
    );

    const invalidCase = !!this.state.cases.find(
      (caseProps: CaseProps) => !caseProps.valid,
    );
    this.setState({
      resultName,
      valid: !invalidCase && !hasErrors(resultName),
    });
  }

  private handleUpdateTimeout(timeout: number): void {
    this.setState({ timeout });
  }

  private handleCasesUpdated(cases: CaseProps[]): void {
    const invalidCase = cases.find((caseProps: CaseProps) => !caseProps.valid);
    const nameErrors = hasErrors(this.state.resultName);
    this.setState({ cases, valid: !invalidCase && !nameErrors });
  }

  private handleSave(): void {
    if (this.state.valid) {
      this.props.updateRouter(
        stateToNode(this.props.nodeSettings, this.props.typeConfig, this.state),
      );
      this.props.onClose(false);
    }
  }

  private getButtons(): ButtonSet {
    return {
      primary: { name: i18n.t('buttons.confirm'), onClick: this.handleSave },
      secondary: {
        name: i18n.t('buttons.cancel', 'Cancel'),
        onClick: () => this.props.onClose(true),
      },
    };
  }

  private openDescriptionEdit(): void {
    window.parent.postMessage({ event: 'openConnectEditProject' }, '*');
  }

  public renderEdit(): JSX.Element {
    const typeConfig = this.props.typeConfig;

    return (
      <Dialog
        title={typeConfig.name}
        headerClass={typeConfig.type}
        buttons={this.getButtons()}
        gutter={
          <TimeoutControl
            timeout={this.state.timeout}
            onChanged={this.handleUpdateTimeout}
          />
        }
        new={typeConfig.new}
      >
        <TypeList
          __className=""
          initialType={typeConfig}
          onChange={this.props.onTypeChange}
          nodeSettings={this.props.nodeSettings}
        />

        {renderIf(!this.state.hasDescription)(
          <DescriptionAlert
            openDescriptionEdit={() => this.openDescriptionEdit()}
          />,
        )}

        <div className={styles.content}>
          <div className={styles.phrases}>
            <div className={styles.header}>
              <span className={styles.title}>
                {i18n.t(
                  'forms.smart_wait.command_phrases_title',
                  'Command phrases',
                )}
              </span>
              <span className={styles.description}>
                {i18n.t(
                  'forms.smart_wait.command_phrases_description',
                  'Write command phrases related to the category',
                )}
              </span>
            </div>
          </div>
          <div className={styles.categories}>
            <div className={styles.header}>
              <span className={styles.title}>
                {i18n.t('forms.smart_wait.category_title', 'Categorize as')}
              </span>
              <span className={styles.description}>
                {i18n.t(
                  'forms.smart_wait.category_description',
                  "Define the Category you want to classify the Contact's response.",
                )}
              </span>
            </div>
          </div>
        </div>
        <CaseList
          data-spec="cases"
          cases={this.state.cases}
          onCasesUpdated={this.handleCasesUpdated}
          type={CaseListType.smart}
        />
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
