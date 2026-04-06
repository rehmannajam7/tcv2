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

const emit = defineEmits(['selectLabel', 'close']);

const { t } = useI18n();
const store = useStore();
const labels = useMapGetter('labels/getLabels');
const tagLabelsRef = ref(null);
const selectedIndex = ref(0);

onMounted(() => {
  if (!labels.value.length) {
    store.dispatch('labels/get');
  }
});

const filteredLabels = computed(() => {
  const search = props.searchKey?.trim().toLowerCase() || '';
  return labels.value.filter(label =>
    search ? label.title.toLowerCase().includes(search) : true
  );
});

const adjustScroll = () => {
  if (!tagLabelsRef.value) return;
  const el = tagLabelsRef.value.querySelector(
    `#label-item-${selectedIndex.value}`
  );
  if (el) el.scrollIntoView({ block: 'nearest', behavior: 'auto' });
};

const onSelect = () => {
  emit('selectLabel', filteredLabels.value[selectedIndex.value]);
};

useKeyboardNavigableList({
  items: filteredLabels,
  onSelect,
  adjustScroll,
  selectedIndex,
});

watch(filteredLabels, list => {
  if (list.length < selectedIndex.value + 1) selectedIndex.value = 0;
});

const onItemClick = idx => {
  selectedIndex.value = idx;
  onSelect();
};
</script>

<template>
  <div
    v-if="filteredLabels.length"
    ref="tagLabelsRef"
    class="w-[22.5rem] p-2 flex flex-col gap-1 z-50 absolute rounded-xl bg-n-alpha-3 shadow outline outline-1 outline-n-weak backdrop-blur-[50px] max-h-[16rem] overflow-y-auto"
  >
    <div
      class="flex items-center justify-between px-2 py-1 border-b border-n-weak mb-1"
    >
      <span class="text-xs font-medium text-n-slate-11 uppercase tracking-wide">
        {{ t('CAPTAIN.TOOLS.LABELS.TITLE') }}
      </span>
      <button
        class="text-n-slate-10 hover:text-n-slate-12 text-xs"
        @click="emit('close')"
      >
        ✕
      </button>
    </div>
    <div
      v-for="(label, idx) in filteredLabels"
      :id="`label-item-${idx}`"
      :key="label.id"
      :class="{ 'bg-n-alpha-black2': idx === selectedIndex }"
      class="flex items-center gap-2 rounded-md py-1.5 px-2 cursor-pointer hover:bg-n-alpha-black2"
      @click="onItemClick(idx)"
    >
      <span
        class="size-2.5 rounded-full flex-shrink-0"
        :style="{ backgroundColor: label.color }"
      />
      <span class="text-n-slate-12 font-medium text-sm">{{ label.title }}</span>
      <span class="text-n-slate-11 text-xs truncate">
        {{ label.description }}
      </span>
    </div>
  </div>
</template>
