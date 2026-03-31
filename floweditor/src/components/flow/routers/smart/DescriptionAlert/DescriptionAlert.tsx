import * as React from 'react';

import styles from './DescriptionAlert.module.scss';

import { applyVueInReact } from 'veaury';

// @ts-ignore
import Unnnic from '@weni/unnnic-system';
import { Trans } from 'react-i18next';

const UnnnicIcon = applyVueInReact(Unnnic.unnnicIcon);

export const leadInSpecId = 'lead-in';

export interface DescriptionAlertProps {
  openDescriptionEdit: () => void;
}

export default class DescriptionAlert extends React.Component<
  DescriptionAlertProps
> {
  public render(): JSX.Element {
    return (
      <div className={styles.alert} onClick={this.props.openDescriptionEdit}>
        <UnnnicIcon
          className={styles.icon}
          icon="info"
          size="sm"
          scheme="aux-blue-500"
          filled={true}
        />
        <span className={styles.alert_text}>
          <Trans i18nKey="forms.smart_wait.description_alert">
            <b>Important:</b>Edit your project, <u>add a description</u> and
            make your AI even more powerful.
          </Trans>
        </span>
      </div>
    );
  }
}
