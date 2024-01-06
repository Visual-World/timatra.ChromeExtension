import { MessageWithWorkitem } from "@/shared-types/messages"
import { WorkitemIdTitleSelector, Workitem } from "@/shared-types/workitems"

const actionBtnId = "wt-booking-tracking-action"

const workitemTicketTitleSelectors: WorkitemIdTitleSelector[] = [
  // Azure Devops
  {
    originRegExp: /https:\/\/.+\.visualstudio\.com*./,
    idSel: [ 
      ".work-item-form-headerContent:first-child [aria-label='ID Field']", 
      "div.work-item-form-header > div:nth-child(2)",
    ],
    titleSel: [ 
      ".work-item-form-headerContent:first-child [aria-label='Title Field']", 
      "div.work-item-form-header > div:nth-child(2) > div > div:first-child > div:first-child > input",
    ],
    projectSel: [ 
      ".work-item-header-group .work-item-header-control-container [aria-label='Area Path']",
      "#__bolt--Area-input"
    ],
    actionsSelectorAndPositioning: [
      {
        selector: ".work-item-form-toolbar-container",
        position: 'prepend',
      },
      {
        selector: ".work-item-header-command-bar",
        position: 'prepend',
      },
    ],
  },

  // Github
  {
    originRegExp: /https:\/\/github\.com*./,
    idSel: [ "#show_issue .gh-header-show  h1 > span" ],
    titleSel: [ "#show_issue .gh-header-show  h1 > bdi" ],
    projectSel: [ 
      "#repository-container-header > div > div",
      "header div.AppHeader-globalBar-start a.AppHeader-context-item > span.AppHeader-context-item-label",
    ],
  },

  // VisualWorld Support (Zammad)
  {
    originRegExp: /https:\/\/support\.visual-world\.de*./,
    idSel: [ ".ticketZoom-header .ticket-number" ],
    titleSel: [ ".ticketZoom-header .ticket-title > div" ],
    projectSel: [
      ".tabsSidebar .sidebar[data-tab='organization'] div.sidebar-content h3[title='Name']",
      ".tabsSidebar .sidebar[data-tab='customer'] div.sidebar-content h3[title='Name']",
    ],
  },
]

let origin = ""
let workitemTicketTitleSelector: WorkitemIdTitleSelector | null = null
let isDirty = true
let lastParsed: Workitem | null = null

export function registerContentObserver() {
  window.onload = () => {
    const body = document.querySelector("body")
    if (!body) {
      return
    }
    const observer = new MutationObserver(() => {
      isDirty = true
      if (origin !== document.location.origin) {
        origin = document.location.origin
        workitemTicketTitleSelector = workitemTicketTitleSelectors.find((x) => x.originRegExp.test(origin)) ?? null
      }
      
      if (workitemTicketTitleSelector?.actionsSelectorAndPositioning) {
        injectActions(workitemTicketTitleSelector?.actionsSelectorAndPositioning)
      }
    })
    observer.observe(body, { childList: true, subtree: true })
  }

  setInterval(() => {
    if (document.hidden) {
      return
    }
    if (!isDirty) {
      return
    }

    parseAndPublishWorkitem()

    isDirty = false
  }, 1000 * 2)

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      lastParsed = null
      parseAndPublishWorkitem()
    }
  })
}

export function parseAndPublishWorkitem() {
  if (!workitemTicketTitleSelector) {
    return
  }
  const {elem: idNode} = getNodeAtFrontBySelector(workitemTicketTitleSelector.idSel)
  const {elem: titleNode} = getNodeAtFrontBySelector(workitemTicketTitleSelector.titleSel)
  const {elem: projectNode} = getNodeAtFrontBySelector(workitemTicketTitleSelector.projectSel)

  const id = trimHashtagOnStart(getInnerTextOrValueOfElement(idNode??null))
  const title = getInnerTextOrValueOfElement(titleNode??null)
  const project = getInnerTextOrValueOfElement(projectNode??null)

  if (!id || !title || !project) {
    return
  }

  if (id === lastParsed?.id && title === lastParsed?.title && project === lastParsed?.project) {
    return
  }

  lastParsed = { id, title, project }

  chrome.runtime.sendMessage<MessageWithWorkitem>({ topic: "new-workitem", workitem: lastParsed })
  console.log("parsed workitem", lastParsed)
}

function getNodeAtFrontBySelector(selectorWithFallbacks: string[]): {elem?: Element, selector?:string} {
  
  const firstSelOrFirstFallback = selectorWithFallbacks.reduce<{elems: NodeListOf<Element>, selector:string}|null>((acc, sel) => {
    if (acc !== null) {
      return acc
    }
    const r = document.querySelectorAll(sel)
    if (!r || r.length===0) {
      return null
    } else {
      return { elems: r, selector: sel}
    }
  }, null)

  if (!firstSelOrFirstFallback) {
    return {}
  }

  const elem = [...firstSelOrFirstFallback.elems].reduce<null | Element>(
    (acc, curr) => ((acc?.getBoundingClientRect().bottom ?? -100000) > curr.getBoundingClientRect().bottom ? acc : curr),
    null
  )
  
  if (!elem) {
    return {}
  }

  return { elem, selector: firstSelOrFirstFallback.selector }
}

function getInnerTextOrValueOfElement(elem: Element | null): string | null {
  const castedElem = elem as unknown as { innerText: string; value: string }
  return castedElem?.innerText || castedElem?.value || null
}

function trimHashtagOnStart(str: string | null): string | null {
  if (!str) {
    return str
  }

  if (str.startsWith("#")) {
    return str.substring(1)
  }

  return str
}

function injectActions(selectorAndPositionWithFallbacks: {selector: string, position: 'append'|'prepend'}[]) {
  const parsed = lastParsed
  if (!parsed) {
    return
  }

  const existingActionsBtn = document.getElementById(actionBtnId)

  const {elem: actionsContainer, selector} = getNodeAtFrontBySelector(selectorAndPositionWithFallbacks.map(s=>s.selector))

  const position = selectorAndPositionWithFallbacks.find(s=>s.selector === selector)?.position ?? 'append'

  if (!actionsContainer) {
    console.log("no actions container found to inject wt-booking-tracking-action button")
    return
  }

  if (existingActionsBtn) {
    if (actionsContainer.contains(existingActionsBtn)) {
      return
    } else {
      existingActionsBtn.remove()
    }
  }

  console.log("inject wt-booking-tracking-action button")

  const btn = document.createElement("button")
  btn.id = "wt-booking-tracking-action"
  btn.title = "timatra Projektbuchung vorausfüllen"
  btn.innerHTML = "<img src='https://app.timatra.de/timatra-logo.svg' style='min-height: 24px;'>"
  btn.style.background = "transparent"
  btn.style.border = "none"
  btn.style.cursor = "pointer"
  btn.style.alignSelf = "stretch"
  btn.onclick = () => chrome.runtime.sendMessage<MessageWithWorkitem>({ topic: "fill booking-from-workitem-direct", workitem: parsed })

  if (position === "append") {
    actionsContainer.append(btn)
  } else {
    actionsContainer.prepend(btn)
  }
}