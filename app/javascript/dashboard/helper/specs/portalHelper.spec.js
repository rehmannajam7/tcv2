import { buildPortalArticleURL, buildPortalURL } from '../portalHelper';

describe('PortalHelper', () => {
  describe('buildPortalURL', () => {
    it('returns the correct url', () => {
      window.chatwootConfig = {
        hostURL: 'https://stage.thumb-crowd.com',
        helpCenterURL: 'https://help.stage.thumb-crowd.com',
      };
      expect(buildPortalURL('handbook')).toEqual(
        'https://help.stage.thumb-crowd.com/hc/handbook'
      );
      window.chatwootConfig = {};
    });
  });

  describe('buildPortalArticleURL', () => {
    it('returns the correct url', () => {
      window.chatwootConfig = {
        hostURL: 'https://stage.thumb-crowd.com',
        helpCenterURL: 'https://help.stage.thumb-crowd.com',
      };
      expect(
        buildPortalArticleURL('handbook', 'culture', 'fr', 'article-slug')
      ).toEqual(
        'https://help.stage.thumb-crowd.com/hc/handbook/articles/article-slug'
      );
      window.chatwootConfig = {};
    });

    it('returns the correct url with custom domain', () => {
      window.chatwootConfig = {
        hostURL: 'https://stage.thumb-crowd.com',
        helpCenterURL: 'https://help.stage.thumb-crowd.com',
      };
      expect(
        buildPortalArticleURL(
          'handbook',
          'culture',
          'fr',
          'article-slug',
          'custom-domain.dev'
        )
      ).toEqual('https://custom-domain.dev/hc/handbook/articles/article-slug');
    });

    it('handles https in custom domain correctly', () => {
      window.chatwootConfig = {
        hostURL: 'https://stage.thumb-crowd.com',
        helpCenterURL: 'https://help.stage.thumb-crowd.com',
      };
      expect(
        buildPortalArticleURL(
          'handbook',
          'culture',
          'fr',
          'article-slug',
          'https://custom-domain.dev'
        )
      ).toEqual('https://custom-domain.dev/hc/handbook/articles/article-slug');
    });

    it('uses hostURL when helpCenterURL is not available', () => {
      window.chatwootConfig = {
        hostURL: 'https://stage.thumb-crowd.com',
        helpCenterURL: '',
      };
      expect(
        buildPortalArticleURL('handbook', 'culture', 'fr', 'article-slug')
      ).toEqual(
        'https://stage.thumb-crowd.com/hc/handbook/articles/article-slug'
      );
    });
  });
});
