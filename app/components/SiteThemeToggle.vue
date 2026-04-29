<template>
  <ClientOnly>
    <v-btn
      :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      class="site-theme-toggle"
      color="primary"
      :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
      rounded="xl"
      size="large"
      variant="tonal"
      @click="toggle"
    />
    <template #fallback>
      <span class="site-theme-toggle site-theme-toggle--placeholder" aria-hidden="true" />
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
const { isDark, toggle } = useSiteTheme();
</script>

<style scoped>
.site-theme-toggle--placeholder {
  display: inline-block;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}
</style>
