import { applyMiddleware, createStore, Middleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import thunk from 'redux-thunk';

import rootReducer from 'store/rootReducer';
import AppState, { initialState } from 'store/state';

const middlewares: Middleware[] = [thunk];

export default (state: AppState = initialState) => {
  const store = createStore(
    rootReducer,
    state,
    composeWithDevTools(applyMiddleware(...middlewares)),
  );

  return store;
};
