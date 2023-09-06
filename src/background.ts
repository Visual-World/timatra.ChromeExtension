import { timtaraUrl } from "./config"
import {
  MessageWithWorkitem,
  MessageWithTopicOrUndefinded,
  MessageWithWorkitemAndOrigin,
  MessageWithWorkitems,
} from "./shared-types/messages"
import { WorkitemProjectMapping, WorkitemWithOrigin } from "./shared-types/workitems"


let currentWorkitems: WorkitemWithOrigin[] = []

async function loadLastCurrentWorkitemsFromStorage() {
  const wi = await chrome.storage.session.get('currentWorkitems')
  currentWorkitems = wi['currentWorkitems']?.array ?? []
  setActionBadge(false)
  notifyWorkitems()
}
loadLastCurrentWorkitemsFromStorage()

function addWorkitem(workitem: WorkitemWithOrigin) {
  const wasAlreadyIncluded = currentWorkitems.some((x) => x.id === workitem.id)

  currentWorkitems = [workitem, ...currentWorkitems.filter((x) => x.id !== workitem.id).slice(0, 9-1)]

  chrome.storage.session.set({'currentWorkitems': {array: currentWorkitems}})

  console.log("updated currentWorkitems", currentWorkitems)

  notifyWorkitems()

  chrome.runtime.sendMessage<MessageWithWorkitemAndOrigin>({
    topic: "new-workitem-with-origin",
    workitem,
  })

  setActionBadge(!wasAlreadyIncluded)
}

async function notifyWorkitems() {
  await chrome.runtime.sendMessage<MessageWithWorkitems>({
    topic: "new-workitems",
    workitems: currentWorkitems,
  })
}

function setActionBadge(flash: boolean) {
  if (currentWorkitems.length <= 0) {
    chrome.action.setBadgeText({text:""})
    return  
  }

  chrome.action.setBadgeText({ text: `${currentWorkitems.length}` })
  
  if (!flash) {
    chrome.action.setBadgeBackgroundColor({ color: "#135ca4" })
  } else {
    chrome.action.setBadgeBackgroundColor({ color: "#19d2a7" })
    setTimeout(() => chrome.action.setBadgeBackgroundColor({ color: "#135ca4" }), 150)
  }
}

async function passWorkitemInformationToTimatra(workitem: WorkitemWithOrigin, createOrFill: "create" | "fill") {
  console.log("passWorkitemInformationToTimatra", workitem, createOrFill)

  const tabAndWindow = await findTimatraTab()
  console.log("found timatra tab", tabAndWindow)

  if (!tabAndWindow) {
    return
  }
  const { tab, windowOfTab } = tabAndWindow

  if (!tab?.id || !windowOfTab?.id) {
    return
  }

  if (!windowOfTab.focused) {
    await chrome.windows.update(windowOfTab.id, { focused: true })
  }
  if (!tab.active || !tab.highlighted) {
    await chrome.tabs.update(tab.id, { active: true, highlighted: true })
  }

  const workitemWithSubstitutedProject = {...workitem, project: await substituteProjectByMapping(workitem.project) }

  await chrome.scripting.executeScript({
    args: [{ ...workitemWithSubstitutedProject, action: createOrFill }],
    target: { tabId: tab.id },
    func: (workitemAndAction) => {
      document.dispatchEvent(new CustomEvent("worktime-booking-create-or-fill", { detail: workitemAndAction }))
    },
  })
}

const WorkitemProjectMappingStorageKey = "workitem-project-mapping-storage"

async function substituteProjectByMapping(projectSrc: string) {
    const projectMapping:WorkitemProjectMapping[] = (await chrome.storage.sync.get(WorkitemProjectMappingStorageKey))[WorkitemProjectMappingStorageKey]?.array || []

    return projectMapping.find(pm => pm.projectSource.toLowerCase() === projectSrc.toLowerCase())?.projectTarget ?? projectSrc
}

async function findTimatraTab(): Promise<{ tab: chrome.tabs.Tab; windowOfTab?: chrome.windows.Window } | undefined> {
  const url = [`${timtaraUrl}/*`]

  const windows = await chrome.windows.getAll()
  if (!windows) {
    return undefined
  }

  const getTabAndWindow = (tab: chrome.tabs.Tab) => ({ tab, windowOfTab: windows.find((w) => w.id === tab.windowId) })

  const currentTab = await chrome.tabs.query({ url, currentWindow: true, highlighted: true, active: true })
  if (currentTab && currentTab.length === 1) {
    return getTabAndWindow(currentTab[0])
  }

  const tabs = await chrome.tabs.query({ url })

  if (!tabs) {
    return undefined
  }

  if (tabs.length === 0) {
    const newTab = await chrome.tabs.create({ url: `${timtaraUrl}/mitarbeiter-bereich/`, active: true, pinned: true })
    
    await new Promise((resolve)=> {
        const updateListener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
            if (tabId === newTab.id && changeInfo.status == 'complete') {
                chrome.tabs.onUpdated.removeListener(updateListener)
                resolve(undefined)               
            }
        }
        chrome.tabs.onUpdated.addListener(updateListener)
    })

    return getTabAndWindow(newTab)
  }

  let tab: chrome.tabs.Tab | undefined
  tab = tabs.find((t) => windows.some((w) => w.id === t.windowId && w.type === "app"))
  if (tab) {
    return getTabAndWindow(tab)
  }
  tab = tabs.find((t) => t.pinned)
  if (tab) {
    return getTabAndWindow(tab)
  }
  tab = tabs.find((t) => t.active)
  if (tab) {
    return getTabAndWindow(tab)
  }
  return getTabAndWindow(tabs[0])
}

chrome.runtime.onMessage.addListener((message: MessageWithTopicOrUndefinded, sender, sendResponse) => {
  console.log("receive msg in background", message, sender)

  switch (message.topic) {
    case "new-workitem":
      addWorkitem({ ...(message as MessageWithWorkitem).workitem, origin: sender.origin ?? "" })
      break
    case "workitem-request":
      sendResponse(currentWorkitems[0] || null)
      break
    case "workitems-request":
      sendResponse(currentWorkitems)
      break
    case "fill-booking-from-workitem":
      passWorkitemInformationToTimatra((message as MessageWithWorkitemAndOrigin).workitem, "fill")
      break
    case "create-booking-from-workitem":
      passWorkitemInformationToTimatra((message as MessageWithWorkitemAndOrigin).workitem, "create")
      break
    default:
      break
  }
})
