import { MessageWithWorkitem } from "@/shared-types/messages"
import { WorkitemIdTitleSelector, Workitem } from "@/shared-types/workitems"

const workitemTicketTitleSelectors: WorkitemIdTitleSelector[] = [
  // Azure Devops
  {
    originRegExp: /https:\/\/.+\.visualstudio\.com*./,
    idSel: [ ".work-item-form-headerContent:first-child [aria-label='ID Field']" ],
    titleSel: [ ".work-item-form-headerContent:first-child [aria-label='Title Field']" ],
    projectSel: [ ".work-item-header-group .work-item-header-control-container [aria-label='Area Path']" ],
  },

  // Github
  {
    originRegExp: /https:\/\/github\.com*./,
    idSel: [ "#show_issue .gh-header-show  h1 > span" ],
    titleSel: [ "#show_issue .gh-header-show  h1 > bdi" ],
    projectSel: [ "header div.AppHeader-globalBar-start a.AppHeader-context-item > span.AppHeader-context-item-label" ],
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
  const idNode = getNodeAtFrontBySelector(workitemTicketTitleSelector.idSel)
  const titleNode = getNodeAtFrontBySelector(workitemTicketTitleSelector.titleSel)
  const projectNode = getNodeAtFrontBySelector(workitemTicketTitleSelector.projectSel)

  const id = trimHashtagOnStart(getInnerTextOrValueOfElement(idNode))
  const title = getInnerTextOrValueOfElement(titleNode)
  const project = getInnerTextOrValueOfElement(projectNode)

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

function getNodeAtFrontBySelector(selectorWithFallbacks: string[]): Element | null {
  
  const firstSelOrFirstFallback = selectorWithFallbacks.reduce<NodeListOf<Element>|null>((acc, sel) => {
    if (acc !== null) {
      return acc
    }
    const r = document.querySelectorAll(sel)
    if (!r || r.length===0) {
      return null
    } else {
      return r
    }
  }, null)

  if (!firstSelOrFirstFallback) {
    return null
  }

  return [...firstSelOrFirstFallback].reduce<null | Element>(
    (acc, curr) => ((acc?.getBoundingClientRect().bottom ?? -100000) > curr.getBoundingClientRect().bottom ? acc : curr),
    null
  )
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
