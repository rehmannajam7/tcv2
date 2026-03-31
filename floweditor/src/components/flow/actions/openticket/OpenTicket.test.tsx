import OpenTicketComp from './OpenTicket';
import { Types } from 'config/interfaces';
import { composeComponentTestUtils } from 'testUtils';

const mockContext = {
  config: {
    brand: 'MyBrand',
  },
};

describe('OpenTicketComp', () => {
  it('should render subject if provided', () => {
    const baseProps = {
      ticketer: { name: 'John Doe', uuid: '1234' },
      subject: 'Test Subject',
      body: 'This is the body',
      result_name: 'Result Name',
      type: Types.open_ticket,
      uuid: '5678',
      context: mockContext,
    };
    const { setup } = composeComponentTestUtils(OpenTicketComp, baseProps);
    const { wrapper, props } = setup();
    expect(props.context).toBe(mockContext);
    expect(wrapper.text()).toContain('Test Subject');
  });

  it('should render topic name if subject is not provided', () => {
    const baseProps = {
      ticketer: { name: 'John Doe', uuid: '1234' },
      topic: {
        name: 'Test Topic',
      },
      body: 'This is the body',
      result_name: 'Result Name',
      type: Types.open_ticket,
      uuid: '5678',
      context: mockContext,
    };

    const { setup } = composeComponentTestUtils(OpenTicketComp, baseProps);
    const { wrapper } = setup();

    expect(wrapper.text()).toContain('Test Topic');
  });

  it('should display ticketer name if brand is not present in ticketer name', () => {
    const baseProps = {
      ticketer: { name: 'Another Brand Support', uuid: '1234' },
      body: 'This is the body',
      result_name: 'Result Name',
      type: Types.open_ticket,
      uuid: '5678',
      context: mockContext,
    };

    const { setup } = composeComponentTestUtils(OpenTicketComp, baseProps);
    const { wrapper } = setup();

    expect(wrapper.text()).toContain('Another Brand Support');
  });

  it('should not display ticketer name if brand is in ticketer name', () => {
    const baseProps = {
      ticketer: { name: 'RapidPro MyBrand', uuid: '1234' },
      body: 'This is the body',
      result_name: 'Result Name',
      type: Types.open_ticket,
      uuid: '5678',
      context: mockContext,
    };

    const { setup } = composeComponentTestUtils(OpenTicketComp, baseProps);
    const { wrapper } = setup();

    expect(wrapper.text()).not.toContain('Using');
  });
});
