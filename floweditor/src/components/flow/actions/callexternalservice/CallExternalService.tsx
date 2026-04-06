import * as React from 'react';
import { CallExternalService } from 'flowTypes';
import { fakePropType } from 'config/ConfigProvider';

const CallExternalServiceComp: React.SFC<CallExternalService> = (
  { external_service, call }: CallExternalService,
  context: any,
): JSX.Element => {
  return (
    <div style={{ fontSize: '80%', textAlign: 'center' }}>
      <span style={{ fontWeight: 400 }}>{external_service.name}</span>
    </div>
  );
};

CallExternalServiceComp.contextTypes = {
  config: fakePropType,
};

export default CallExternalServiceComp;
