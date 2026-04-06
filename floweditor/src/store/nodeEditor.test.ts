import { getTypeConfig } from 'config';
import { Types } from 'config/interfaces';
import Constants from 'store/constants';
import reducer, {
  initialState,
  typeConfig as typeConfigReducer,
  updateTypeConfig,
  updateUserAddingAction,
  userAddingAction as userAddingActionReducer,
  mergeForm,
} from 'store/nodeEditor';

const definition = require('test/flows/boring.json');

describe('nodeEditor action creators', () => {
  describe('updateTypeConfig', () => {
    it('should create an action to update typeConfig state', () => {
      const typeConfig = getTypeConfig(Types.send_msg);
      const expectedAction = {
        type: Constants.UPDATE_TYPE_CONFIG,
        payload: {
          typeConfig,
        },
      };
      expect(updateTypeConfig(typeConfig)).toEqual(expectedAction);
    });
  });

  describe('updateUserAddingAction', () => {
    it('should create an action to update userAddingAction state', () => {
      const userAddingAction = false;
      const expectedAction = {
        type: Constants.UPDATE_USER_ADDING_ACTION,
        payload: {
          userAddingAction,
        },
      };
      expect(updateUserAddingAction(userAddingAction)).toEqual(expectedAction);
    });
  });
});

describe('nodeEditor reducers', () => {
  describe('typeConfig reducer', () => {
    const reduce = (action: any) => typeConfigReducer(undefined, action);

    it('should return initial state', () => {
      expect(reduce({})).toEqual(initialState.typeConfig);
    });

    it('should handle UPDATE_TYPE_CONFIG', () => {
      const typeConfig = getTypeConfig(Types.send_msg);
      const action = updateTypeConfig(typeConfig);
      expect(reduce(action)).toEqual(typeConfig);
    });
  });

  describe('userAddingAction reducer', () => {
    const reduce = (action: any) => userAddingActionReducer(undefined, action);

    it('should return initial state', () => {
      expect(reduce({})).toEqual(initialState.userAddingAction);
    });

    it('should handle UPDATE_USER_ADDING_ACTION', () => {
      const userAddingAction = true;
      const action = updateUserAddingAction(userAddingAction);
      expect(reduce(action)).toEqual(userAddingAction);
    });
  });
});

describe('nodeEditor mergeForm', () => {
  it('should merge form data', () => {
    const initialFormState: any = {
      valid: true,
      validationFailures: [],
      name: {
        value: 'test name',
      },
      description: {
        value: 'test description',
      },
      array: {
        value: [1, 2, 3],
      },
      object: {
        value: { foo: 'bar' },
      },
      array_object_value: [
        {
          value: {
            uuid: '1234',
            name: 'baz',
          },
        },
      ],
      array_object_uuid: [
        {
          uuid: '1234',
          name: 'not baz',
        },
      ],
      string_array__invalid: ['first'],
    };

    const updates: any = {
      valid: true,
      validationFailures: [],
      name: {
        value: 'updated name',
        validationFailures: [{ message: 'invalid' }],
      },
      array: {
        value: [4, 5, 6],
      },
      object: {
        value: { baz: 'qux' },
      },
      array_object_value: [
        {
          value: {
            uuid: '1234',
            name: 'baq',
          },
          validationFailures: [{ message: 'invalid' }],
        },
      ],
      array_object_uuid: [
        {
          uuid: '1234',
          name: 'not baq',
        },
      ],
      string_array__invalid: ['first', 'second'],
    };

    let updated = mergeForm(initialFormState, updates, ['description']);

    expect(updated).toEqual({
      valid: false,
      validationFailures: [],
      name: {
        value: 'updated name',
        validationFailures: [{ message: 'invalid' }],
      },
      array: {
        value: [4, 5, 6],
      },
      object: {
        value: { baz: 'qux' },
      },
      array_object_value: [
        {
          value: {
            uuid: '1234',
            name: 'baq',
          },
          validationFailures: [{ message: 'invalid' }],
        },
      ],
      array_object_uuid: [
        {
          uuid: '1234',
          name: 'not baq',
        },
      ],
      string_array__invalid: ['first'], // not a valid entry for merge form, so it should not be updated
    });

    updated = mergeForm(updated, {}, [
      {
        array_object_uuid: [
          {
            uuid: '1234',
          },
        ],
      },
      {
        array_object_value: [
          {
            value: {
              uuid: '1234',
            },
          },
        ],
      },
      {
        string_array__invalid: 'invalid',
      },
    ]);

    expect(updated).toEqual({
      valid: false,
      validationFailures: [],
      name: {
        value: 'updated name',
        validationFailures: [{ message: 'invalid' }],
      },
      array: {
        value: [4, 5, 6],
      },
      object: {
        value: { baz: 'qux' },
      },
      array_object_value: [],
      array_object_uuid: [],
      string_array__invalid: ['first'],
    });
  });
});
