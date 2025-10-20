<script setup>
import { useMapGetter } from 'dashboard/composables/store.js';
import Icon from 'next/icon/Icon.vue';
import { computed } from 'vue';

const props = defineProps({
  to: { type: [Object, String], default: '' },
  label: { type: String, default: '' },
  icon: { type: [String, Object], default: '' },
  expandable: { type: Boolean, default: false },
  isExpanded: { type: Boolean, default: false },
  isActive: { type: Boolean, default: false },
  hasActiveChild: { type: Boolean, default: false },
  getterKeys: { type: Object, default: () => ({}) },
  external: { type: Boolean, default: false },
  target: { type: String, default: '' },
});

const emit = defineEmits(['toggle']);

const showBadge = useMapGetter(props.getterKeys.badge);

const isExternalLink = computed(() => {
  return typeof props.to === 'string' && (props.to.startsWith('http') || props.external);
});

const componentType = computed(() => {
  if (!props.to) return 'div';
  return isExternalLink.value ? 'a' : 'router-link';
});

const linkProps = computed(() => {
  if (!props.to) return {};
  
  if (isExternalLink.value) {
    return {
      href: props.to,
      target: props.target || '_blank',
      rel: 'noopener noreferrer'
    };
  }
  
  return { to: props.to };
});
</script>

<template>
  <component
    :is="componentType"
    class="flex items-center gap-2 px-2 py-1.5 rounded-lg h-8"
    role="button"
    draggable="false"
    v-bind="linkProps"
    :title="label"
    :class="{
      'text-n-blue-text bg-n-alpha-2 font-medium': isActive && !hasActiveChild,
      'text-n-slate-12 font-medium': hasActiveChild,
      'text-n-slate-11 hover:bg-n-alpha-2': !isActive && !hasActiveChild,
    }"
    @click.stop="emit('toggle')"
  >
    <div v-if="icon" class="relative flex items-center gap-2">
      <Icon v-if="icon" :icon="icon" class="size-4" />
      <span
        v-if="showBadge"
        class="size-2 -top-px ltr:-right-px rtl:-left-px bg-n-brand absolute rounded-full border border-n-solid-2"
      />
    </div>
    <span class="text-sm font-medium leading-5 flex-grow">
      {{ label }}
    </span>
    <span
      v-if="expandable"
      v-show="isExpanded"
      class="i-lucide-chevron-up size-3"
      @click.stop="emit('toggle')"
    />
  </component>
</template>
