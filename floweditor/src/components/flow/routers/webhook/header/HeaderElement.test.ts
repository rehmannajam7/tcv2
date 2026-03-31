import HeaderElement, {
  headerContainerSpecId,
  HeaderElementProps,
  NAME_PLACEHOLDER,
  nameContainerSpecId,
  removeIcoSpecId,
  valueConatainerSpecId,
} from 'components/flow/routers/webhook/header/HeaderElement';
import { HeaderEntry } from 'components/flow/routers/webhook/WebhookRouterForm';
import { composeComponentTestUtils, getSpecWrapper, setMock } from 'testUtils';
import { set, setFalse } from 'utils';
import { shallowToJson } from 'enzyme-to-json';

const headers: HeaderEntry[] = [
  {
    value: {
      uuid: '00c4498e-1c9e-4c26-aa7c-f81d13573129',
      name: 'Content-Type',
      value: 'application/json',
    },
  },
  {
    value: {
      uuid: '3e7d8366-22ff-452b-953e-3a9a88b5d72c ',
      name: 'Authorization',
      value:
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWV9.TJVA95OrM7E2cBab30RMHrHDcEfxjoYZgeFONFh7HgQ',
    },
  },
  {
    value: {
      uuid: '236f2392-e576-4254-8c28-db175510c6a8',
      name: '',
      value: '',
    },
  },
];

const baseProps: HeaderElementProps = {
  entry: headers[0],
  index: 0,
  onRemove: vi.fn(),
  onChange: vi.fn(),
};

const { setup, spyOn } = composeComponentTestUtils(HeaderElement, baseProps);

describe(HeaderElement.name, () => {
  describe('render', () => {
    it('should render self, children with base props', () => {
      const { wrapper, props, instance } = setup();
      const inputs = wrapper.find('TextInputElement');

      expect(inputs.at(0).props()).toEqual({
        placeholder: NAME_PLACEHOLDER,
        name: NAME_PLACEHOLDER,
        onChange: instance.handleChangeName,
        entry: { value: props.entry.value.name },
      });

      expect(inputs.at(1).props()).toMatchSnapshot();
      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });

    it('should render remove icon', () => {
      const { wrapper } = setup(true, {
        index: set(1),
        empty: setFalse(),
        canRemove: set(true),
      });
      const removeIcon = getSpecWrapper(wrapper, removeIcoSpecId);

      expect(removeIcon.exists()).toBeTruthy();
      expect(shallowToJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('instance methods', () => {
    describe('handleChangeName', () => {
      it('should update state, call onChange prop', () => {
        const setStateSpy = spyOn('setState');
        const {
          wrapper,
          props: { onChange: onChangeMock },
          instance,
        } = setup(true, {
          onChange: setMock(),
        });

        instance.handleChangeName(headers[0].value.name);
        wrapper.update();

        expect(setStateSpy).toHaveBeenCalledTimes(1);
        expect(setStateSpy).toMatchSnapshot('setState');
        expect(onChangeMock).toHaveBeenCalledTimes(1);
        expect(onChangeMock).toMatchSnapshot('onChange');

        expect(
          wrapper
            .find('TextInputElement')
            .at(0)
            .prop('entry'),
        ).toEqual({ value: headers[0].value.name });
        expect(wrapper).toMatchSnapshot('text element');

        setStateSpy.mockRestore();
      });
    });

    describe('handleChangeValue', () => {
      it('should update state, call onChange prop', () => {
        const setStateSpy = spyOn('setState');
        const { wrapper, props, instance } = setup(true, {
          onChange: setMock(),
        });

        instance.handleChangeValue(headers[0].value);
        wrapper.update();

        expect(setStateSpy).toHaveBeenCalledTimes(1);
        expect(setStateSpy).toMatchSnapshot();
        expect(props.onChange).toHaveBeenCalledTimes(1);
        expect(props.onChange).toMatchSnapshot('header change');

        expect(
          wrapper
            .find('TextInputElement')
            .at(1)
            .prop('entry'),
        ).toEqual({ value: headers[0].value });
        expect(shallowToJson(wrapper)).toMatchSnapshot();

        setStateSpy.mockRestore();
      });
    });
  });
});
