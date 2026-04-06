import * as React from 'react';
import { CallWebhook } from 'flowTypes';
import { ellipsize } from 'utils';
import styles from './CallWebhook.module.scss';

const CallWebhookComp: React.SFC<CallWebhook> = ({
  url,
}: CallWebhook): JSX.Element => (
  <div className={styles.text}>{ellipsize(url, 150)}</div>
);

export default CallWebhookComp;
