<template>
  <div v-if="currentWorkItems.length===0" class="text-body-1">
    Bisher wurden keine Tickets gefunden
  </div>
  <v-list v-else density="comfortable" lines="two" class="mx-n4 py-0" base-color="secondary">
    <template v-for="(item, index) in currentWorkItems" :key="item.title">
      <v-divider v-if="index > 0" />
      <v-list-item
        @click="fillOrCreateWorktimeBooking(item, 'fill-booking-from-workitem')"
      >
        <template #title>
          <v-chip class="font-weight-light px-2 mr-1" color="primary" density="compact" rounded>
            #{{ item.id }}
          </v-chip>
          <span :title="item.title">{{ item.title }}</span>
        </template>
        <template #subtitle>
          {{ item.project }}<br>
          <small>{{ item.origin }}</small>
        </template>
        <template #append>
          <v-btn
            title="Ausfüllen einer neuen Kostenträgerbuchung"
            color="secondary"
            :icon="mdiFileSign"
            variant="text"
            density="comfortable"
            @click.prevent.stop="fillOrCreateWorktimeBooking(item, 'fill-booking-from-workitem')"
          />
          <v-btn
            title="Erstellen einer Neuen Kostenträgerbuchung"
            color="secondary"
            :icon="mdiRocketLaunchOutline"
            variant="text"
            density="comfortable"
            @click.prevent.stop="fillOrCreateWorktimeBooking(item, 'create-booking-from-workitem')"
          />
          
          <v-menu>
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                color="secondary"
                :icon="mdiDotsHorizontal"
                variant="text"
                density="comfortable"
                @click.prevent.stop
              />
            </template>

            <v-list density="comfortable">
              <v-list-item :prepend-icon="mdiSourceCommit" title="Als Vorlage für Commit-Text kopieren" @click="workitemAsCommitTextToClipboardHandler(item)" />
              <v-list-item :prepend-icon="mdiSourceBranch" title="Als Vorlage für Branch-Namen kopieren" @click="workitemAsBranchNameToClipboardHandler(item)" />
              <v-divider />
              <v-list-item :prepend-icon="mdiConnection" title="Mapping für dieses Projekt erstellen" @click="$emit('create-project-mapping-with-source', item.project)" />
            </v-list>
          </v-menu>
        </template>
      </v-list-item>
    </template>
    <v-snackbar v-model="wasCopied" :timeout="2000">
      Wurde erfolgreich kopiert
    </v-snackbar>
  </v-list>
</template>

<style scoped>
</style>


<script setup lang="ts">
import { MessageWithTopic, MessageWithWorkitemAndOrigin, MessageWithWorkitems } from "@/shared-types/messages"
import { WorkitemWithOrigin } from "@/shared-types/workitems"
import { onMounted, ref } from "vue"
import {mdiFileSign, mdiRocketLaunchOutline, mdiDotsHorizontal, mdiConnection, mdiSourceCommit, mdiSourceBranch} from '@mdi/js'

defineEmits<{
  (event: 'create-project-mapping-with-source', projectSourceName: string): void
}>()

const wasCopied = ref(false)

const currentWorkItems = ref<WorkitemWithOrigin[]>([])

function fillOrCreateWorktimeBooking(workitem: WorkitemWithOrigin,action: "create-booking-from-workitem" | "fill-booking-from-workitem") {
  if (currentWorkItems.value.length > 0) {
    chrome.runtime.sendMessage<MessageWithWorkitemAndOrigin>({ topic: action, workitem })
    window.close()
  }
}

async function workitemAsCommitTextToClipboardHandler(workitem: WorkitemWithOrigin) {  
  navigator.clipboard.writeText(await chrome.runtime.sendMessage<MessageWithWorkitemAndOrigin>({ topic: "copy-commit-name", workitem }))
  wasCopied.value = true
}
async function workitemAsBranchNameToClipboardHandler(workitem: WorkitemWithOrigin) {
  navigator.clipboard.writeText(await chrome.runtime.sendMessage<MessageWithWorkitemAndOrigin>({ topic: "copy-branch-name", workitem }))
  wasCopied.value = true
}

chrome.runtime.onMessage.addListener((message: MessageWithTopic, sender) => {
  console.log(message, sender)

  if (message.topic === "new-workitems") {
    const r = (message as MessageWithWorkitems).workitems
    if (r) {
      currentWorkItems.value = r
    }
  }
})

onMounted(() => {
  chrome.runtime.sendMessage<MessageWithTopic, WorkitemWithOrigin[]>(
    { topic: "workitems-request" },
    (response) => (currentWorkItems.value = response)
  )
})
</script>