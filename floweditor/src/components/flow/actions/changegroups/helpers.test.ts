import {
  excludeDynamicGroups,
  mapGroupsToAssets,
  mapAssetsToGroups,
} from 'components/flow/actions/changegroups/helpers';
import { AssetType } from 'store/flowContext';

describe('utils', () => {
  it('should filter on excludeDynamicGroups', () => {
    expect(
      excludeDynamicGroups({
        id: 'dynamic_id',
        name: 'Dynamic',
        query: 'some query',
      }),
    ).toBeTruthy();

    expect(
      excludeDynamicGroups({
        id: 'static_id',
        name: 'Static',
        query: null,
      }),
    ).toBeFalsy();
  });

  it('should map groups to assets', () => {
    const groups = [
      {
        name: 'Group 1',
        uuid: 'group_1',
      },
      {
        name: 'Group 2',
        name_match: 'Group 2 Name Match',
        uuid: 'group_2',
      },
    ];

    const assets = [
      {
        name: 'Group 1',
        id: 'group_1',
        type: AssetType.Group,
      },
      {
        name: 'Group 2 Name Match',
        id: 'Group 2 Name Match',
        type: AssetType.NameMatch,
      },
    ];

    expect(mapGroupsToAssets(groups)).toEqual(assets);
  });

  it('should map assets to groups', () => {
    const assets = [
      {
        name: 'Group 1',
        id: 'group_1',
        type: AssetType.Group,
      },
      {
        name: 'Group 2 Name Match',
        id: 'Group 2 Name Match',
        type: AssetType.NameMatch,
      },
    ];

    const groups = [
      {
        name: 'Group 1',
        uuid: 'group_1',
      },
      {
        name_match: 'Group 2 Name Match',
      },
    ];

    expect(mapAssetsToGroups(assets)).toEqual(groups);
  });

  it('should return empty array if no search results', () => {
    expect(mapAssetsToGroups(null)).toEqual([]);
  });
});
