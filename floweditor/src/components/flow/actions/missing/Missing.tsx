import * as React from 'react';
import { Action } from 'flowTypes';

/* istanbul ignore next -- @preserve */
const MissingComp: React.SFC<Action> = ({ type }: Action): JSX.Element => {
  return <div className="placeholder">No implementation yet for {type}</div>;
};

export default MissingComp;
