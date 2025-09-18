<script>
import TestimonialCard from './TestimonialCard.vue';

export default {
  components: { TestimonialCard },
  emits: ['resizeContainers'],
  data() {
    return { 
      testimonials: [
        {
          id: 1,
          authorReview: "ThumbCrowd has transformed how we handle customer feedback. The automated triggers have increased our response rate by 300%.",
          authorImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
          authorName: "Sarah Johnson",
          authorCompany: "TechStart Inc."
        },
        {
          id: 2,
          authorReview: "The best customer service platform we've used. Our team productivity has doubled since implementing ThumbCrowd.",
          authorImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
          authorName: "Michael Chen",
          authorCompany: "Growth Solutions"
        }
      ]
    };
  },
  beforeMount() {
    this.$emit('resizeContainers', !!this.testimonials.length);
  },
};
</script>

<template>
  <div
    v-show="testimonials.length"
    class="w-full h-full"
  >
    <!-- Testimonials Content -->
    <div class="flex flex-col space-y-6">
      <TestimonialCard
        v-for="testimonial in testimonials.slice(0, 2)"
        :key="testimonial.id"
        :review-content="testimonial.authorReview"
        :author-image="testimonial.authorImage"
        :author-name="testimonial.authorName"
        :author-designation="testimonial.authorCompany"
        class="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.center--img {
}
</style>
