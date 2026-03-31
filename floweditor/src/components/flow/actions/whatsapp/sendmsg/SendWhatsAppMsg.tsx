import { SendWhatsAppMsg } from 'flowTypes';
import * as React from 'react';

import styles from 'components/flow/actions/whatsapp/sendmsg/SendWhatsAppMsg.module.scss';
import Pill from 'components/pill/Pill';
import {
  WHATSAPP_INTERACTION_TYPE_CTA,
  WHATSAPP_INTERACTION_TYPE_LOCATION,
} from 'components/flow/actions/whatsapp/sendmsg/constants';
import { applyVueInReact } from 'veaury';

// @ts-ignore
import Unnnic from '@weni/unnnic-system';
import { renderIf } from 'utils';

const UnnnicIcon = applyVueInReact(Unnnic.unnnicIcon, {
  vue: {
    componentWrap: 'div',
    slotWrap: 'div',
    componentWrapAttrs: {
      style: {
        all: '',
        display: 'flex',
      },
    },
  },
});

const SendWhatsAppMsgComp: React.FunctionComponent<SendWhatsAppMsg> = (
  action: SendWhatsAppMsg,
): JSX.Element => {
  let replies = null;
  let items = null;

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

  const listItems = action.list_items || [];
  if (listItems.length > 0) {
    items = (
      <div className={styles.list_items}>
        {listItems.map(item => (
          <Pill
            maxLength={20}
            advanced={true}
            key={action.uuid + item.title}
            text={item.title}
            disabled
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div>
        {action.text &&
          action.text.split(/\r?\n/).map((line: string, idx: number) => (
            <div key={action.uuid + idx} className={styles.line}>
              {line}
            </div>
          ))}
        <div className={styles.icons}>
          {renderIf(!!action.attachment)(
            <UnnnicIcon
              className={styles.attachment}
              icon={'attachment'}
              size="sm"
              scheme="neutral-cloudy"
            />,
          )}
          {renderIf(
            action.interaction_type === WHATSAPP_INTERACTION_TYPE_CTA.value,
          )(
            <div className={styles.cta_divider}>
              <UnnnicIcon
                icon={'open_in_new'}
                size="md"
                scheme="neutral-cloudy"
              />
              <div className={styles.cta_button_text}>{action.button_text}</div>
            </div>,
          )}
          {renderIf(
            action.interaction_type ===
              WHATSAPP_INTERACTION_TYPE_LOCATION.value,
          )(<UnnnicIcon icon="location_on" filled={false} size="sm" />)}
        </div>
      </div>

      <div className={replies ? styles.summary : ''}>{replies}</div>
      <div className={items ? styles.summary : ''}>{items}</div>
    </>
  );
};

export default SendWhatsAppMsgComp;
