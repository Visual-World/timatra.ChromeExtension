<template>
  <div>
    <div class="text-subtitle-2">
      Mapping von Ticketsystem-Projektname zu timatra-Projektname
    </div>
    <v-list v-if="projectMappings" density="compact" base-color="secondary">
      <template v-for="(item, index) in projectMappings" :key="item.projectSource">
        <v-list-item
          :subtitle="`${item.projectSource} ⯈ ${item.projectTarget}`"
          class="px-0"
        >
          <template #append>
            <v-btn
              title="Löschen"
              :icon="mdiTrashCanOutline"
              variant="text"
              size="small"
              @click="del(index)"
            />
          </template>
        </v-list-item>
        <v-divider />
      </template>
    </v-list>

    <div class="mt-2" style="display: flex; flex-direction: row; gap: 4px; align-items: center;">
      <v-text-field
        v-model="projectSource"
        variant="outlined"
        label="Ticketsystem Projektname"
        density="compact"
        style="flex: 1;"
        hide-details
      />
      <v-text-field
        v-model="projectTarget"
        variant="outlined"
        label="Timatra Projektname"
        density="compact"
        style="flex: 1;"
        hide-details
      />
      <v-btn :icon="mdiPlus" density="comfortable" variant="text" @click="add"/>
    </div>
  </div>
</template>

<style scoped>
</style>


<script setup lang="ts">
import { WorkitemProjectMapping } from '@/shared-types/workitems'
import { onMounted, ref,watch } from 'vue'
import {mdiTrashCanOutline,mdiPlus} from '@mdi/js'

const props = defineProps<{
  sourcePrefill?: string
}>()

const emits = defineEmits<{
  (event: 'update:sourcePrefill', sourcePrefill?: string): void
}>()

const WorkitemProjectMappingStorageKey = "workitem-project-mapping-storage"

const projectMappings = ref<WorkitemProjectMapping[]|null>(null)

const projectSource = ref("")
const projectTarget = ref("")

function add() {
  if (!projectMappings.value || !projectSource.value || !projectTarget.value) {
    return
  }

  projectMappings.value = [...projectMappings.value, {projectSource: projectSource.value, projectTarget: projectTarget.value}]

  projectSource.value = ""
  projectTarget.value = ""
}

function del(index: number) {
  if (!projectMappings.value) {
    return
  }
  console.log(projectMappings.value)
  const clone = [...projectMappings.value]
  console.log(clone,projectMappings.value)
  clone.splice(index, 1)
  console.log(clone)
  projectMappings.value = clone
}

onMounted(async () => {
  projectMappings.value = (await chrome.storage.sync.get(WorkitemProjectMappingStorageKey))[WorkitemProjectMappingStorageKey]?.array || []

  if (props.sourcePrefill) {
    projectSource.value = props.sourcePrefill
    emits("update:sourcePrefill", "")
  }
})

watch(projectMappings, async (val, oldVal) => {
  if (oldVal===null) {
    return
  }
  await chrome.storage.sync.set({[WorkitemProjectMappingStorageKey]: {array: [...(val??[])]}})
})
</script>