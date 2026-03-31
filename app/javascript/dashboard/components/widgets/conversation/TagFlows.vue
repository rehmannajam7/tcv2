<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { useKeyboardNavigableList } from 'dashboard/composables/useKeyboardNavigableList';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  searchKey: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['selectFlow', 'close']);

const { t } = useI18n();
const store = useStore();
const automations = useMapGetter('automations/getAutomations');
const tagFlowsRef = ref(null);
const selectedIndex = ref(0);

onMounted(() => {
  if (!automations.value.length) {
    store.dispatch('automations/get', { page: 1 });
  }
});

const filteredFlows = computed(() => {
  const search = props.searchKey?.trim().toLowerCase() || '';
  return automations.value
    .filter(flow => flow.active)
    .filter(flow =>
      search ? flow.name.toLowerCase().includes(search) : true
    );
});

const adjustScroll = () => {
  if (!tagFlowsRef.value) return;
  const el = tagFlowsRef.value.querySelector(
    `#flow-item-${selectedIndex.value}`
  );
  if (el) el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
};

const onSelect = () => {
  emit('selectFlow', filteredFlows.value[selectedIndex.value]);
};

useKeyboardNavigableList({
  items: filteredFlows,
  onSelect,
  adjustScroll,
  selectedIndex,
});

watch(filteredFlows, list => {
  if (list.length < selectedIndex.value + 1) selectedIndex.value = 0;
});

const onItemClick = idx => {
  selectedIndex.value = idx;
  onSelect();
};

const eventTypeLabel = eventKey => {
  const map = {
    conversation_created: t('CAPTAIN.TOOLS.FLOWS.EVENTS.CONVERSATION_CREATED'),
    conversation_updated: t('CAPTAIN.TOOLS.FLOWS.EVENTS.CONVERSATION_UPDATED'),
    message_created: t('CAPTAIN.TOOLS.FLOWS.EVENTS.MESSAGE_CREATED'),
    conversation_opened: t('CAPTAIN.TOOLS.FLOWS.EVENTS.CONVERSATION_OPENED'),
  };
  return map[eventKey] || eventKey;
};
</script>

<template>
  <div
    v-if="filteredFlows.length"
    ref="tagFlowsRef"
    class="w-[22.5rem] p-2 flex flex-col gap-1 z-50 absolute rounded-xl bg-n-alpha-3 shadow outline outline-1 outline-n-weak backdrop-blur-[50px] max-h-[20rem] overflow-y-auto"
  >
    <div
      class="flex items-center justify-between px-2 py-1 border-b border-n-weak mb-1"
    >
      <span class="text-xs font-medium text-n-slate-11 uppercase tracking-wide">
        {{ t('CAPTAIN.TOOLS.FLOWS.TITLE') }}
      </span>
      <button
        class="text-n-slate-10 hover:text-n-slate-12 text-xs"
        @click="emit('close')"
      >
        ✕
      </button>
    </div>
    <div
      v-for="(flow, idx) in filteredFlows"
      :id="`flow-item-${idx}`"
      :key="flow.id"
      :class="{ 'bg-n-alpha-black2': idx === selectedIndex }"
      class="flex flex-col gap-0.5 rounded-md py-2 px-2 cursor-pointer hover:bg-n-alpha-black2"
      @click="onItemClick(idx)"
    >
      <div class="flex items-center gap-2">
        <span class="text-n-slate-12 font-medium text-sm">{{ flow.name }}</span>
        <span
          class="text-xs px-1.5 py-0.5 rounded bg-n-teal-3 text-n-teal-11 flex-shrink-0"
        >
          {{ t('CAPTAIN.TOOLS.FLOWS.ACTIVE') }}
        </span>
      </div>
      <span class="text-n-slate-11 text-xs">
        {{ eventTypeLabel(flow.event_name) }}
      </span>
      <span v-if="flow.description" class="text-n-slate-10 text-xs truncate">
        {{ flow.description }}
      </span>
    </div>
  </div>
  <div
    v-else
    class="w-[22.5rem] p-4 z-50 absolute rounded-xl bg-n-alpha-3 shadow outline outline-1 outline-n-weak backdrop-blur-[50px] text-center"
  >
    <span class="text-n-slate-11 text-sm">
      {{ t('CAPTAIN.TOOLS.FLOWS.EMPTY') }}
    </span>
  </div>
</template>
