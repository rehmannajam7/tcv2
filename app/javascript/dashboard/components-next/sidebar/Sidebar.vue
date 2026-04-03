<script setup>
import { h, computed, onMounted, ref, watch } from 'vue';
import { provideSidebarContext } from './provider';
import { useAccount } from 'dashboard/composables/useAccount';
import { useKbd } from 'dashboard/composables/utils/useKbd';
import { useMapGetter } from 'dashboard/composables/store';
import { useStore } from 'vuex';
import { useI18n } from 'vue-i18n';
import { usePolicy } from 'dashboard/composables/usePolicy';
import { useStorage } from '@vueuse/core';
import { OnClickOutside } from '@vueuse/components';
import { useSidebarKeyboardShortcuts } from './useSidebarKeyboardShortcuts';
import { useRoute, useRouter } from 'vue-router';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';

import Button from 'dashboard/components-next/button/Button.vue';
import SidebarGroup from './SidebarGroup.vue';
import SidebarProfileMenu from './SidebarProfileMenu.vue';
import ChannelLeaf from './ChannelLeaf.vue';
import SidebarAccountSwitcher from './SidebarAccountSwitcher.vue';
import Logo from 'next/icon/Logo.vue';
import ComposeConversation from 'dashboard/components-next/NewConversation/ComposeConversation.vue';

const emit = defineEmits([
  'closeKeyShortcutModal',
  'openKeyShortcutModal',
  'showCreateAccountModal',
]);

const { accountScopedRoute } = useAccount();
const store = useStore();
const searchShortcut = useKbd([`$mod`, 'k']);
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { shouldShow } = usePolicy();

const toggleShortcutModalFn = show => {
  if (show) {
    emit('openKeyShortcutModal');
  } else {
    emit('closeKeyShortcutModal');
  }
};

useSidebarKeyboardShortcuts(toggleShortcutModalFn);

const expandedItem = useStorage(
  'next-sidebar-expanded-item',
  null,
  sessionStorage
);

const setExpandedItem = name => {
  expandedItem.value = expandedItem.value === name ? null : name;
};
provideSidebarContext({
  expandedItem,
  setExpandedItem,
});

const resolvePath = to => {
  if (!to) return '/';
  try {
    return router.resolve(to)?.path || '/';
  } catch {
    return '/';
  }
};

const findRouteByName = name => {
  const routes = router.getRoutes();
  return routes.find(routeRecord => routeRecord.name === name);
};

const resolvePermissions = to => {
  if (!to) return [];
  if (to.params?.navigationPath) {
    const targetRoute = findRouteByName(to.params.navigationPath);
    return targetRoute?.meta?.permissions ?? [];
  }
  try {
    return router.resolve(to)?.meta?.permissions ?? [];
  } catch {
    return [];
  }
};

const resolveFeatureFlag = to => {
  if (!to) return '';
  if (to.params?.navigationPath) {
    const targetRoute = findRouteByName(to.params.navigationPath);
    return targetRoute?.meta?.featureFlag || '';
  }
  try {
    return router.resolve(to)?.meta?.featureFlag || '';
  } catch {
    return '';
  }
};

const resolveInstallationType = to => {
  if (!to) return [];
  if (to.params?.navigationPath) {
    const targetRoute = findRouteByName(to.params.navigationPath);
    return targetRoute?.meta?.installationTypes || [];
  }
  try {
    return router.resolve(to)?.meta?.installationTypes || [];
  } catch {
    return [];
  }
};

const isAllowed = to => {
  const permissions = resolvePermissions(to);
  const featureFlag = resolveFeatureFlag(to);
  const installationType = resolveInstallationType(to);
  return shouldShow(featureFlag, permissions, installationType);
};

const inboxes = useMapGetter('inboxes/getInboxes');
const labels = useMapGetter('labels/getLabelsOnSidebar');
const teams = useMapGetter('teams/getMyTeams');
const contactCustomViews = useMapGetter('customViews/getContactCustomViews');
const conversationCustomViews = useMapGetter(
  'customViews/getConversationCustomViews'
);

onMounted(() => {
  store.dispatch('labels/get');
  store.dispatch('inboxes/get');
  store.dispatch('notifications/unReadCount');
  store.dispatch('teams/get');
  store.dispatch('attributes/get');
  store.dispatch('customViews/get', 'conversation');
  store.dispatch('customViews/get', 'contact');
});

const sortedInboxes = computed(() =>
  inboxes.value.slice().sort((a, b) => a.name.localeCompare(b.name))
);

const newReportRoutes = () => [
  {
    name: 'Reports Agent',
    label: t('SIDEBAR.REPORTS_AGENT'),
    to: accountScopedRoute('agent_reports_index'),
    activeOn: ['agent_reports_show'],
  },
  {
    name: 'Reports Label',
    label: t('SIDEBAR.REPORTS_LABEL'),
    to: accountScopedRoute('label_reports_index'),
  },
  {
    name: 'Reports Inbox',
    label: t('SIDEBAR.REPORTS_INBOX'),
    to: accountScopedRoute('inbox_reports_index'),
    activeOn: ['inbox_reports_show'],
  },
  {
    name: 'Reports Team',
    label: t('SIDEBAR.REPORTS_TEAM'),
    to: accountScopedRoute('team_reports_index'),
    activeOn: ['team_reports_show'],
  },
];

const reportRoutes = computed(() => newReportRoutes());

const menuItems = computed(() => {
  return [
    {
      name: 'Inbox',
      label: t('SIDEBAR.INBOX'),
      icon: 'i-lucide-inbox',
      to: accountScopedRoute('inbox_view'),
      activeOn: ['inbox_view', 'inbox_view_conversation'],
      getterKeys: {
        badge: 'notifications/getHasUnreadNotifications',
      },
    },
    {
      name: 'Conversation',
      label: t('SIDEBAR.CONVERSATIONS'),
      icon: 'i-lucide-message-circle',
      children: [
        {
          name: 'All',
          label: t('SIDEBAR.ALL_CONVERSATIONS'),
          activeOn: ['inbox_conversation'],
          to: accountScopedRoute('home'),
        },
        {
          name: 'Mentions',
          label: t('SIDEBAR.MENTIONED_CONVERSATIONS'),
          activeOn: ['conversation_through_mentions'],
          to: accountScopedRoute('conversation_mentions'),
        },
        {
          name: 'Unattended',
          activeOn: ['conversation_through_unattended'],
          label: t('SIDEBAR.UNATTENDED_CONVERSATIONS'),
          to: accountScopedRoute('conversation_unattended'),
        },
        {
          name: 'Folders',
          label: t('SIDEBAR.CUSTOM_VIEWS_FOLDER'),
          icon: 'i-lucide-folder',
          activeOn: ['conversations_through_folders'],
          children: conversationCustomViews.value.map(view => ({
            name: `${view.name}-${view.id}`,
            label: view.name,
            to: accountScopedRoute('folder_conversations', { id: view.id }),
          })),
        },
        {
          name: 'Teams',
          label: t('SIDEBAR.TEAMS'),
          icon: 'i-lucide-users',
          activeOn: ['conversations_through_team'],
          children: teams.value.map(team => ({
            name: `${team.name}-${team.id}`,
            label: team.name,
            to: accountScopedRoute('team_conversations', { teamId: team.id }),
          })),
        },
        {
          name: 'Channels',
          label: t('SIDEBAR.CHANNELS'),
          icon: 'i-lucide-mailbox',
          activeOn: ['conversation_through_inbox'],
          children: sortedInboxes.value.map(inbox => ({
            name: `${inbox.name}-${inbox.id}`,
            label: inbox.name,
            to: accountScopedRoute('inbox_dashboard', { inbox_id: inbox.id }),
            component: leafProps =>
              h(ChannelLeaf, {
                label: leafProps.label,
                active: leafProps.active,
                inbox,
              }),
          })),
        },
        {
          name: 'Labels',
          label: t('SIDEBAR.LABELS'),
          icon: 'i-lucide-tag',
          activeOn: ['conversations_through_label'],
          children: labels.value.map(label => ({
            name: `${label.title}-${label.id}`,
            label: label.title,
            icon: h('span', {
              class: `size-[12px] ring-1 ring-n-alpha-1 dark:ring-white/20 ring-inset rounded-sm`,
              style: { backgroundColor: label.color },
            }),
            to: accountScopedRoute('label_conversations', {
              label: label.title,
            }),
          })),
        },
      ],
    },
    {
      name: 'Captain',
      icon: 'i-woot-captain',
      label: t('SIDEBAR.CAPTAIN'),
      children: [
        {
          name: 'Assistants',
          label: t('SIDEBAR.CAPTAIN_ASSISTANTS'),
          activeOn: [
            'captain_assistants_index',
            'captain_assistants_create_index',
          ],
          to: accountScopedRoute('captain_assistants_index', {
            navigationPath: 'captain_assistants_responses_index',
          }),
        },
        {
          name: 'Documents',
          label: t('SIDEBAR.CAPTAIN_DOCUMENTS'),
          activeOn: ['captain_assistants_documents_index'],
          to: accountScopedRoute('captain_assistants_index', {
            navigationPath: 'captain_assistants_documents_index',
          }),
        },
        {
          name: 'Responses',
          label: t('SIDEBAR.CAPTAIN_RESPONSES'),
          activeOn: [
            'captain_assistants_responses_index',
            'captain_assistants_responses_pending',
          ],
          to: accountScopedRoute('captain_assistants_index', {
            navigationPath: 'captain_assistants_responses_index',
          }),
        },
        {
          name: 'Tools',
          label: t('SIDEBAR.CAPTAIN_TOOLS'),
          activeOn: ['captain_tools_index'],
          to: accountScopedRoute('captain_assistants_index', {
            navigationPath: 'captain_tools_index',
          }),
        },
        {
          name: 'Scenarios',
          label: t('SIDEBAR.CAPTAIN_SCENARIOS'),
          activeOn: ['captain_assistants_scenarios_index'],
          to: accountScopedRoute('captain_assistants_index', {
            navigationPath: 'captain_assistants_scenarios_index',
          }),
        },
        {
          name: 'Playground',
          label: t('SIDEBAR.CAPTAIN_PLAYGROUND'),
          activeOn: ['captain_assistants_playground_index'],
          to: accountScopedRoute('captain_assistants_index', {
            navigationPath: 'captain_assistants_playground_index',
          }),
        },
        {
          name: 'Inboxes',
          label: t('SIDEBAR.CAPTAIN_INBOXES'),
          activeOn: ['captain_assistants_inboxes_index'],
          to: accountScopedRoute('captain_assistants_index', {
            navigationPath: 'captain_assistants_inboxes_index',
          }),
        },
        {
          name: 'Settings',
          label: t('SIDEBAR.CAPTAIN_SETTINGS'),
          activeOn: [
            'captain_assistants_settings_index',
            'captain_assistants_guardrails_index',
            'captain_assistants_guidelines_index',
          ],
          to: accountScopedRoute('captain_assistants_index', {
            navigationPath: 'captain_assistants_settings_index',
          }),
        },
      ],
    },
    {
      name: 'Contacts',
      label: t('SIDEBAR.CONTACTS'),
      icon: 'i-lucide-contact',
      children: [
        {
          name: 'All Contacts',
          label: t('SIDEBAR.ALL_CONTACTS'),
          to: accountScopedRoute(
            'contacts_dashboard_index',
            {},
            { page: 1, search: undefined }
          ),
          activeOn: ['contacts_dashboard_index', 'contacts_edit'],
        },
        {
          name: 'Active',
          label: t('SIDEBAR.ACTIVE'),
          to: accountScopedRoute('contacts_dashboard_active'),
          activeOn: ['contacts_dashboard_active'],
        },
        {
          name: 'Segments',
          icon: 'i-lucide-group',
          label: t('SIDEBAR.CUSTOM_VIEWS_SEGMENTS'),
          children: contactCustomViews.value.map(view => ({
            name: `${view.name}-${view.id}`,
            label: view.name,
            to: accountScopedRoute(
              'contacts_dashboard_segments_index',
              { segmentId: view.id },
              { page: 1 }
            ),
            activeOn: [
              'contacts_dashboard_segments_index',
              'contacts_edit_segment',
            ],
          })),
        },
        {
          name: 'Tagged With',
          icon: 'i-lucide-tag',
          label: t('SIDEBAR.TAGGED_WITH'),
          children: labels.value.map(label => ({
            name: `${label.title}-${label.id}`,
            label: label.title,
            icon: h('span', {
              class: `size-[12px] ring-1 ring-n-alpha-1 dark:ring-white/20 ring-inset rounded-sm`,
              style: { backgroundColor: label.color },
            }),
            to: accountScopedRoute(
              'contacts_dashboard_labels_index',
              { label: label.title },
              { page: 1, search: undefined }
            ),
            activeOn: [
              'contacts_dashboard_labels_index',
              'contacts_edit_label',
            ],
          })),
        },
      ],
    },
    {
      name: 'Reports',
      label: t('SIDEBAR.REPORTS'),
      icon: 'i-lucide-chart-spline',
      children: [
        {
          name: 'Report Overview',
          label: t('SIDEBAR.REPORTS_OVERVIEW'),
          to: accountScopedRoute('account_overview_reports'),
        },
        {
          name: 'Report Conversation',
          label: t('SIDEBAR.REPORTS_CONVERSATION'),
          to: accountScopedRoute('conversation_reports'),
        },
        ...reportRoutes.value,
        {
          name: 'Reports CSAT',
          label: t('SIDEBAR.CSAT'),
          to: accountScopedRoute('csat_reports'),
        },
        {
          name: 'Reports SLA',
          label: t('SIDEBAR.REPORTS_SLA'),
          to: accountScopedRoute('sla_reports'),
        },
        {
          name: 'Reports Bot',
          label: t('SIDEBAR.REPORTS_BOT'),
          to: accountScopedRoute('bot_reports'),
        },
      ],
    },
    {
      name: 'Campaigns',
      label: t('SIDEBAR.CAMPAIGNS'),
      icon: 'i-lucide-megaphone',
      children: [
        {
          name: 'Live chat',
          label: t('SIDEBAR.LIVE_CHAT'),
          to: accountScopedRoute('campaigns_livechat_index'),
        },
        {
          name: 'SMS',
          label: t('SIDEBAR.SMS'),
          to: accountScopedRoute('campaigns_sms_index'),
        },
        {
          name: 'WhatsApp',
          label: t('SIDEBAR.WHATSAPP'),
          to: accountScopedRoute('campaigns_whatsapp_index'),
        },
      ],
    },
    {
      name: 'Flow',
      label: 'Flows',
      icon: 'i-lucide-workflow',
      to: accountScopedRoute('flows_list'),
    },
    {
      name: 'Portals',
      label: t('SIDEBAR.HELP_CENTER.TITLE'),
      icon: 'i-lucide-library-big',
      children: [
        {
          name: 'Articles',
          label: t('SIDEBAR.HELP_CENTER.ARTICLES'),
          activeOn: [
            'portals_articles_index',
            'portals_articles_new',
            'portals_articles_edit',
          ],
          to: accountScopedRoute('portals_index', {
            navigationPath: 'portals_articles_index',
          }),
        },
        {
          name: 'Categories',
          label: t('SIDEBAR.HELP_CENTER.CATEGORIES'),
          activeOn: [
            'portals_categories_index',
            'portals_categories_articles_index',
            'portals_categories_articles_edit',
          ],
          to: accountScopedRoute('portals_index', {
            navigationPath: 'portals_categories_index',
          }),
        },
        {
          name: 'Locales',
          label: t('SIDEBAR.HELP_CENTER.LOCALES'),
          activeOn: ['portals_locales_index'],
          to: accountScopedRoute('portals_index', {
            navigationPath: 'portals_locales_index',
          }),
        },
        {
          name: 'Settings',
          label: t('SIDEBAR.HELP_CENTER.SETTINGS'),
          activeOn: ['portals_settings_index'],
          to: accountScopedRoute('portals_index', {
            navigationPath: 'portals_settings_index',
          }),
        },
      ],
    },
    {
      name: 'Settings',
      label: t('SIDEBAR.SETTINGS'),
      icon: 'i-lucide-bolt',
      children: [
        {
          name: 'Settings Account Settings',
          label: t('SIDEBAR.ACCOUNT_SETTINGS'),
          icon: 'i-lucide-briefcase',
          to: accountScopedRoute('general_settings_index'),
        },
        {
          name: 'Settings Agents',
          label: t('SIDEBAR.AGENTS'),
          icon: 'i-lucide-square-user',
          to: accountScopedRoute('agent_list'),
        },
        {
          name: 'Settings Teams',
          label: t('SIDEBAR.TEAMS'),
          icon: 'i-lucide-users',
          to: accountScopedRoute('settings_teams_list'),
        },
        {
          name: 'Settings Inboxes',
          label: t('SIDEBAR.INBOXES'),
          icon: 'i-lucide-inbox',
          to: accountScopedRoute('settings_inbox_list'),
        },
        {
          name: 'Settings Assignment Policy',
          label: t('SIDEBAR.AGENT_ASSIGNMENT'),
          icon: 'i-lucide-users-round',
          activeOn: [
            'assignment_policy_index',
            'agent_assignment_policy_index',
            'agent_assignment_policy_create',
            'agent_assignment_policy_edit',
            'agent_capacity_policy_index',
            'agent_capacity_policy_create',
            'agent_capacity_policy_edit',
          ],
          to: accountScopedRoute('assignment_policy_index'),
        },
        {
          name: 'Settings Labels',
          label: t('SIDEBAR.LABELS'),
          icon: 'i-lucide-tags',
          to: accountScopedRoute('labels_list'),
        },
        {
          name: 'Settings Custom Attributes',
          label: t('SIDEBAR.CUSTOM_ATTRIBUTES'),
          icon: 'i-lucide-code',
          to: accountScopedRoute('attributes_list'),
        },
        {
          name: 'Settings Automation',
          label: t('SIDEBAR.AUTOMATION'),
          icon: 'i-lucide-workflow',
          to: accountScopedRoute('automation_list'),
        },
        {
          name: 'Settings Agent Bots',
          label: t('SIDEBAR.AGENT_BOTS'),
          icon: 'i-lucide-bot',
          to: accountScopedRoute('agent_bots'),
        },
        {
          name: 'Settings Macros',
          label: t('SIDEBAR.MACROS'),
          icon: 'i-lucide-toy-brick',
          to: accountScopedRoute('macros_wrapper'),
        },
        {
          name: 'Settings Canned Responses',
          label: t('SIDEBAR.CANNED_RESPONSES'),
          icon: 'i-lucide-message-square-quote',
          to: accountScopedRoute('canned_list'),
        },
        {
          name: 'Settings Integrations',
          label: t('SIDEBAR.INTEGRATIONS'),
          icon: 'i-lucide-blocks',
          to: accountScopedRoute('settings_applications'),
        },
        {
          name: 'Settings Audit Logs',
          label: t('SIDEBAR.AUDIT_LOGS'),
          icon: 'i-lucide-briefcase',
          to: accountScopedRoute('auditlogs_list'),
        },
        {
          name: 'Settings Custom Roles',
          label: t('SIDEBAR.CUSTOM_ROLES'),
          icon: 'i-lucide-shield-plus',
          to: accountScopedRoute('custom_roles_list'),
        },
        {
          name: 'Settings Sla',
          label: t('SIDEBAR.SLA'),
          icon: 'i-lucide-clock-alert',
          to: accountScopedRoute('sla_list'),
        },
        {
          name: 'Settings Conversation Workflow',
          label: t('SIDEBAR.CONVERSATION_WORKFLOW'),
          icon: 'i-lucide-git-branch',
          to: accountScopedRoute('conversation_workflow_index'),
        },
        {
          name: 'Settings Security',
          label: t('SIDEBAR.SECURITY'),
          icon: 'i-lucide-shield',
          to: accountScopedRoute('security_settings_index'),
        },
        {
          name: 'Settings Billing',
          label: t('SIDEBAR.BILLING'),
          icon: 'i-lucide-credit-card',
          to: accountScopedRoute('billing_settings_index'),
        },
      ],
    },
  ];
});

const flattenNavigableChildren = item => {
  return item.children?.flatMap(child => child.children || child) || [];
};

const hasAccessibleChildren = item => {
  if (!Array.isArray(item.children) || item.children.length === 0) return false;
  return flattenNavigableChildren(item).some(
    child => child.to && isAllowed(child.to)
  );
};

const railItems = computed(() => {
  return menuItems.value.filter(item => {
    if (item.to) return isAllowed(item.to);
    if (Array.isArray(item.children)) return hasAccessibleChildren(item);
    return true;
  });
});

const isRailItemActive = item => {
  if (item.to) {
    if (route.path === resolvePath(item.to)) return true;
    return item.activeOn?.includes(route.name);
  }

  const navigableChildren = flattenNavigableChildren(item);
  const pathSame = navigableChildren.find(
    child => child.to && route.path === resolvePath(child.to)
  );
  if (pathSame) return true;

  const activeOnPages = navigableChildren.filter(child =>
    child.activeOn?.includes(route.name)
  );
  if (activeOnPages.length > 0) return true;

  return navigableChildren.some(
    child => child.to && route.path.startsWith(resolvePath(child.to))
  );
};

const isPanelOpen = ref(false);
const activeRailItemName = ref(null);

const currentActiveRailItemName = computed(() => {
  return railItems.value.find(item => isRailItemActive(item))?.name || null;
});

watch(
  currentActiveRailItemName,
  nextName => {
    if (!nextName) return;
    if (!activeRailItemName.value || !isPanelOpen.value) {
      activeRailItemName.value = nextName;
    }
  },
  { immediate: true }
);

const activeRailItem = computed(() => {
  return (
    railItems.value.find(item => item.name === activeRailItemName.value) ||
    railItems.value[0] ||
    null
  );
});

const getDefaultTo = item => {
  if (item.to && isAllowed(item.to)) return item.to;
  if (!Array.isArray(item.children)) return null;

  const candidate = flattenNavigableChildren(item).find(
    child => child.to && isAllowed(child.to)
  );
  return candidate?.to || null;
};

const navigateIfNeeded = to => {
  if (!to) return;
  const targetPath = resolvePath(to);
  if (route.path !== targetPath) router.push(to);
};

const openPanelForItem = item => {
  activeRailItemName.value = item.name;

  if (!Array.isArray(item.children)) {
    navigateIfNeeded(getDefaultTo(item));
    isPanelOpen.value = false;
    return;
  }

  isPanelOpen.value = true;
  expandedItem.value = item.name;
  navigateIfNeeded(getDefaultTo(item));
};

const closePanel = () => {
  isPanelOpen.value = false;
};

useKeyboardEvents({
  Escape: {
    action: () => {
      if (isPanelOpen.value) closePanel();
    },
    allowOnFocusedInput: true,
  },
});
</script>

<template>
  <OnClickOutside
    class="relative flex h-full flex-shrink-0"
    @trigger="() => (isPanelOpen ? closePanel() : null)"
  >
    <aside
      class="w-14 bg-n-solid-2 rtl:border-l h-full ltr:border-r border-n-weak flex flex-col text-sm py-2 rounded-xl items-center"
    >
      <button
        type="button"
        class="grid flex-shrink-0 size-8 place-content-center rounded-lg"
        :aria-label="activeRailItem?.label || t('SIDEBAR.INBOX')"
        @click="
          () => (activeRailItem ? openPanelForItem(activeRailItem) : null)
        "
      >
        <Logo class="size-4" />
      </button>

      <div class="flex flex-col gap-2 mt-3">
        <RouterLink
          v-tooltip.right="t('COMBOBOX.SEARCH_PLACEHOLDER')"
          :to="{ name: 'search' }"
          :aria-label="t('COMBOBOX.SEARCH_PLACEHOLDER')"
          class="grid size-9 place-content-center rounded-lg outline outline-1 outline-n-weak bg-n-solid-3 dark:bg-n-black/30"
        >
          <span class="i-lucide-search size-4 text-n-slate-11" />
        </RouterLink>

        <ComposeConversation align-position="right">
          <template #trigger="{ toggle }">
            <Button
              icon="i-lucide-pen-line"
              color="slate"
              size="sm"
              class="!size-9 !bg-n-solid-3 dark:!bg-n-black/30 !outline-n-weak !text-n-slate-11"
              :aria-label="t('CONTACT.NEW_CONVERSATION.TITLE')"
              @click="toggle"
            />
          </template>
        </ComposeConversation>
      </div>

      <nav
        class="flex flex-col flex-grow gap-2 mt-4 overflow-y-auto no-scrollbar"
      >
        <ul class="flex flex-col gap-1 m-0 list-none">
          <li v-for="item in railItems" :key="item.name" class="grid">
            <Button
              v-tooltip.right="item.label"
              :icon="item.icon"
              ghost
              slate
              sm
              class="!size-9 !rounded-lg"
              :class="{
                'bg-n-alpha-2':
                  isRailItemActive(item) || item.name === activeRailItemName,
              }"
              :aria-label="item.label"
              @click="openPanelForItem(item)"
            />
          </li>
        </ul>
      </nav>

      <div class="flex flex-col items-center gap-2 mt-auto pt-2 pb-1">
        <span
          v-tooltip.right="searchShortcut"
          class="grid place-content-center text-[11px] text-n-slate-10 tracking-wide select-none pointer-events-none"
        >
          {{ searchShortcut }}
        </span>
        <SidebarProfileMenu
          compact
          @open-key-shortcut-modal="emit('openKeyShortcutModal')"
        />
      </div>
    </aside>

    <aside
      class="bg-n-solid-2 h-full flex flex-col text-sm pb-1 overflow-hidden transition-[width] duration-200 ease-in-out"
      :class="{
        'w-[200px]':
          isPanelOpen &&
          activeRailItem &&
          Array.isArray(activeRailItem.children),
        'ltr:border-r rtl:border-l border-n-weak rounded-xl shadow-lg':
          isPanelOpen &&
          activeRailItem &&
          Array.isArray(activeRailItem.children),
        'w-0 pointer-events-none':
          !isPanelOpen ||
          !activeRailItem ||
          !Array.isArray(activeRailItem.children),
      }"
      :aria-hidden="
        !(
          isPanelOpen &&
          activeRailItem &&
          Array.isArray(activeRailItem.children)
        )
      "
    >
      <div
        class="h-full transition-[opacity,transform] duration-200 ease-in-out"
        :class="{
          'opacity-100 translate-x-0':
            isPanelOpen &&
            activeRailItem &&
            Array.isArray(activeRailItem.children),
          'opacity-0 ltr:-translate-x-2 rtl:translate-x-2':
            !isPanelOpen ||
            !activeRailItem ||
            !Array.isArray(activeRailItem.children),
        }"
      >
        <template
          v-if="activeRailItem && Array.isArray(activeRailItem.children)"
        >
          <section class="flex items-center justify-between gap-2 px-2 pt-2">
            <span class="flex-grow min-w-0 font-medium truncate">
              {{ activeRailItem.label }}
            </span>
            <Button
              icon="i-lucide-x"
              ghost
              slate
              sm
              class="!size-7 !rounded-lg"
              :aria-label="t('GENERAL.CLOSE')"
              @click="closePanel"
            />
          </section>

          <section class="grid gap-2 mt-2 mb-4">
            <div class="flex items-center min-w-0 gap-2 px-2">
              <div class="flex-shrink-0 w-px h-3 bg-n-strong" />
              <SidebarAccountSwitcher
                class="flex-grow min-w-0 -mx-1"
                @show-create-account-modal="emit('showCreateAccountModal')"
              />
            </div>
            <div class="flex gap-2 px-2">
              <RouterLink
                :to="{ name: 'search' }"
                class="flex items-center w-full gap-2 px-2 py-1 rounded-lg h-7 outline outline-1 outline-n-weak bg-n-solid-3 dark:bg-n-black/30"
              >
                <span
                  class="flex-shrink-0 i-lucide-search size-4 text-n-slate-11"
                />
                <span class="flex-grow text-left">
                  {{ t('COMBOBOX.SEARCH_PLACEHOLDER') }}
                </span>
                <span
                  class="hidden tracking-wide pointer-events-none select-none text-n-slate-10"
                >
                  {{ searchShortcut }}
                </span>
              </RouterLink>
              <ComposeConversation align-position="right">
                <template #trigger="{ toggle }">
                  <Button
                    icon="i-lucide-pen-line"
                    color="slate"
                    size="sm"
                    class="!h-7 !bg-n-solid-3 dark:!bg-n-black/30 !outline-n-weak !text-n-slate-11"
                    @click="toggle"
                  />
                </template>
              </ComposeConversation>
            </div>
          </section>

          <nav
            class="grid flex-grow gap-2 px-2 pb-5 overflow-y-scroll no-scrollbar"
          >
            <ul class="flex flex-col m-0 list-none">
              <SidebarGroup v-bind="activeRailItem" />
            </ul>
          </nav>
        </template>
      </div>
    </aside>
  </OnClickOutside>
</template>
