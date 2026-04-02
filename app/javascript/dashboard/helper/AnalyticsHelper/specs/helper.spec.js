import helperObject, { AnalyticsHelper } from '../';

describe('helperObject', () => {
  it('should return an instance of AnalyticsHelper', () => {
    expect(helperObject).toBeInstanceOf(AnalyticsHelper);
  });
});

describe('AnalyticsHelper', () => {
  let analyticsHelper;
  let mockGtag;

  beforeEach(() => {
    // Create a mock function for gtag
    mockGtag = vi.fn();

    // Mock window.gtag
    Object.defineProperty(window, 'gtag', {
      writable: true,
      value: mockGtag,
    });

    analyticsHelper = new AnalyticsHelper({ trackingId: 'GA-TEST-123' });
  });

  describe('init', () => {
    it('should initialize Google Analytics with the correct tracking ID', async () => {
      await analyticsHelper.init();
      expect(analyticsHelper.isInitialized).toBe(true);
    });

    it('should not initialize if tracking ID is not provided', async () => {
      analyticsHelper = new AnalyticsHelper();
      await analyticsHelper.init();
      expect(analyticsHelper.isInitialized).toBe(false);
    });
  });

  describe('identify', () => {
    beforeEach(async () => {
      await analyticsHelper.init();
    });

    it('should call gtag with login event and user properties', () => {
      analyticsHelper.identify({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        accounts: [{ id: '1', name: 'Account 1' }],
        account_id: '1',
      });

      expect(mockGtag).toHaveBeenCalledWith('event', 'login', {
        method: 'chatwoot',
        user_id: '123',
        user_email: 'test@example.com',
        user_name: 'Test User',
      });

      expect(mockGtag).toHaveBeenCalledWith('event', 'join_group', {
        group_id: '1',
        group_name: 'Account 1',
        user_id: '123',
      });
    });

    it('should call gtag without group event when account not found', () => {
      analyticsHelper.identify({
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        accounts: [{ id: '1', name: 'Account 1' }],
        account_id: '5',
      });

      expect(mockGtag).toHaveBeenCalledWith(
        'event',
        'login',
        expect.any(Object)
      );
      expect(mockGtag).not.toHaveBeenCalledWith(
        'event',
        'join_group',
        expect.any(Object)
      );
    });

    it('should not call gtag if not initialized', () => {
      analyticsHelper.isInitialized = false;
      analyticsHelper.identify({});
      expect(mockGtag).not.toHaveBeenCalled();
    });
  });

  describe('track', () => {
    beforeEach(async () => {
      await analyticsHelper.init();
      analyticsHelper.user = { id: '123' };
    });

    it('should call gtag event with correct arguments', () => {
      analyticsHelper.track('Test Event', { prop1: 'value1', prop2: 'value2' });
      expect(mockGtag).toHaveBeenCalledWith('event', 'test_event', {
        user_id: '123',
        prop1: 'value1',
        prop2: 'value2',
      });
    });

    it('should call gtag event with default properties', () => {
      analyticsHelper.track('Test Event');
      expect(mockGtag).toHaveBeenCalledWith('event', 'test_event', {
        user_id: '123',
      });
    });

    it('should not call gtag if not initialized', () => {
      analyticsHelper.isInitialized = false;
      analyticsHelper.track('Test Event', { prop1: 'value1', prop2: 'value2' });
      expect(mockGtag).not.toHaveBeenCalled();
    });
  });

  describe('page', () => {
    beforeEach(async () => {
      await analyticsHelper.init();
      analyticsHelper.user = { id: '123' };
    });

    it('should call gtag page_view event with correct arguments', () => {
      const params = {
        title: 'Test page',
        url: '/test',
        path: '/test',
      };
      analyticsHelper.page(params);
      expect(mockGtag).toHaveBeenCalledWith('event', 'page_view', {
        page_title: 'Test page',
        page_location: '/test',
        page_path: '/test',
        user_id: '123',
        title: 'Test page',
        url: '/test',
        path: '/test',
      });
    });

    it('should not call gtag if not initialized', () => {
      analyticsHelper.isInitialized = false;
      analyticsHelper.page();
      expect(mockGtag).not.toHaveBeenCalled();
    });
  });
});
