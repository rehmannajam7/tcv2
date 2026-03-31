import * as React from 'react';

import { applyVueInReact } from 'veaury';
// @ts-ignore
import Unnnic from '@weni/unnnic-system';

const UnnnicTag = applyVueInReact(Unnnic.unnnicTag);

export interface PillProps {
  advanced?: boolean;
  onClick?(event: React.MouseEvent<HTMLDivElement>): void;
  text: string;
  maxLength?: number;
  disabled?: boolean;
}

const Pill: React.SFC<PillProps> = (props: PillProps): JSX.Element => {
  let text = props.text;

  if (props.text.startsWith('@')) {
    text = '@(exp)';
  } else if (props.maxLength && text.length > props.maxLength) {
    text = props.text.substring(0, props.maxLength) + '...';
  }

  return (
    <UnnnicTag
      data-advanced={props.advanced}
      text={text}
      disabled={props.disabled}
      clickable={!!props.onClick}
      onClick={props.onClick}
    />
  );
};

export default Pill;
