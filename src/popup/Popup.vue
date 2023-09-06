<template>
  <v-app class="popup-main bg-surface">
    <v-app-bar :title="'timatra WorkitemHelper' + (settingsPage?' - Einstellungen' : '')" density="compact" color="primary">
      <template #append>
        <v-btn :icon="mdiCogOutline" :variant="settingsPage ? 'tonal':'text'" density="comfortable" @click="settingsPage = !settingsPage" />
      </template>
    </v-app-bar>

    <v-main class="bg-surface text-secondary">
      <v-container>
        <settings v-if="settingsPage" v-model:source-prefill="settingsProjectSourcePrefill" />
        <workitems v-else @create-project-mapping-with-source="settingsWithProjectSourcePrefill" />
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.popup-main {
  width: 550px;
  min-width: 550px;
  min-height: 600px;
}

</style>

<script setup lang="ts">
import { mdiCogOutline } from '@mdi/js'

import Workitems from "@p/components/Workitems.vue"
import Settings from "@p/components/Settings.vue"
import { ref } from 'vue'

const settingsPage = ref(false)

const settingsProjectSourcePrefill = ref("")

function settingsWithProjectSourcePrefill(sourcePrefill: string) {
  settingsProjectSourcePrefill.value = sourcePrefill
  settingsPage.value = true
}
</script>
