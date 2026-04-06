import * as React from 'react';
import { CallBrain } from 'flowTypes';

import styles from './CallBrain.module.scss';
import { applyVueInReact } from 'veaury';
// @ts-ignore
import Unnnic from '@weni/unnnic-system';
import { BrainInfo } from '../../../../store/flowContext';
const UnnnicIcon = applyVueInReact(Unnnic.unnnicIcon);

export const getBrainInfoPlaceholder = (brainInfo: BrainInfo): JSX.Element => (
  <span
    className={`${styles.brain_info} ${
      !brainInfo.enabled ? styles.disabled : ''
    }`}
  >
    {brainInfo.enabled
      ? `${brainInfo.name} - ${brainInfo.occupation}`
      : `${brainInfo.name} (${brainInfo.occupation})`}
  </span>
);

const CallBrainComp: React.FunctionComponent<CallBrain> = (
  props: CallBrain,
): JSX.Element => {
  const iconScheme = props.brainInfo.enabled
    ? 'neutral-cloudy'
    : 'neutral-soft';

  return (
    <div
      className={`${styles.content} ${
        !props.brainInfo.enabled ? styles.disabled : ''
      }`}
    >
      <UnnnicIcon icon="hub" size="sm" scheme={iconScheme} />
      {getBrainInfoPlaceholder(props.brainInfo)}
      {!props.brainInfo.enabled && (
        <span className={styles.disabled_notice}>(Temporarily Disabled)</span>
      )}
    </div>
  );
};

export default CallBrainComp;
