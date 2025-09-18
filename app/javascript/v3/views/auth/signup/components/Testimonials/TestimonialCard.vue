<script>
export default {
  props: {
    reviewContent: {
      type: String,
      default: '',
    },
    authorImage: {
      type: String,
      default: '',
    },
    authorName: {
      type: String,
      default: '',
    },
    authorDesignation: {
      type: String,
      default: '',
    },
  },
};
</script>

<template>
  <div
    class="flex flex-col items-start justify-center p-4 w-full text-white"
  >
    <p class="text-sm text-white/90 tracking-normal leading-relaxed mb-4">
      "{{ reviewContent }}"
    </p>
    <div class="flex items-center text-white">
      <div class="bg-white/20 rounded-full p-1">
        <img :src="authorImage" class="h-8 w-8 rounded-full object-cover" />
      </div>
      <div class="ml-3">
        <div class="text-sm font-medium text-white">{{ authorName }}</div>
        <div class="text-xs text-white/70">{{ authorDesignation }}</div>
      </div>
    </div>
  </div>
</template>
