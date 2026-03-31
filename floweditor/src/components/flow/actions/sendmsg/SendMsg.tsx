import Pill from 'components/pill/Pill';
import { SendMsg } from 'flowTypes';
import * as React from 'react';

import styles from './SendMsg.module.scss';
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

export const PLACEHOLDER = i18n.t(
  'actions.send_msg.placeholder',
  'Send a message to the contact',
);

const SendMsgComp: React.SFC<SendMsg> = (action: SendMsg): JSX.Element => {
  if (action.text) {
    let replies = null;

    const quickReplies = action.quick_replies || [];
    if (quickReplies.length > 0) {
      replies = (
        <div className={styles.quick_replies}>
          {quickReplies.map(reply => (
            <Pill
              maxLength={20}
              advanced={true}
              key={action.uuid + reply}
              text={reply}
              disabled
            />
          ))}
        </div>
      );
    }

    return (
      <>
        <div>
          {action.text.split(/\r?\n/).map((line: string, idx: number) => (
            <div key={action.uuid + idx} className={styles.line}>
              {line}
            </div>
          ))}
          <div className={styles.icons}>
            {action.attachments && action.attachments.length > 0 ? (
              <UnnnicIcon
                className={styles.attachment}
                icon={'attachment'}
                size="sm"
                scheme="neutral-cloudy"
              />
            ) : null}
            {action.templating && action.templating.template ? (
              <UnnnicIcon
                className={styles.whatsapp}
                icon={'messaging-whatsapp-1'}
                size="sm"
                scheme="neutral-cloudy"
              />
            ) : null}
            {action.topic ? (
              <UnnnicIcon
                className={styles.facebook}
                icon={'social-media-facebook-1'}
                size="sm"
                scheme="neutral-cloudy"
              />
            ) : null}
          </div>
        </div>
        <div className={replies ? styles.summary : ''}>{replies}</div>
      </>
    );
  }
  return <div className="placeholder">{PLACEHOLDER}</div>;
};

export default SendMsgComp;
