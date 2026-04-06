import * as React from 'react';
import { OpenTicket } from 'flowTypes';
import { fakePropType } from 'config/ConfigProvider';

const OpenTicketComp: React.SFC<OpenTicket> = (
  { ticketer, subject, topic }: OpenTicket,
  context: any,
): JSX.Element => {
  const showTicketer = !ticketer.name.match(context.config.brand);
  return (
    <div style={{ textAlign: 'center' }}>
      <div>{subject ? subject : topic ? topic.name : null}</div>
      {showTicketer && (
        <div style={{ fontSize: '80%' }}>
          Using
          <span style={{ fontWeight: 400 }}>{ticketer.name}</span>
        </div>
      )}
    </div>
  );
};

OpenTicketComp.contextTypes = {
  config: fakePropType,
};

export default OpenTicketComp;
