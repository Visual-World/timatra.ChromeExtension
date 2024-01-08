import { iconSvgBranch, iconSvgCommit } from "./assets/icons"
import { MessageWithWorkitem } from "@/shared-types/messages"
import { WorkitemIdTitleSelector, Workitem } from "@/shared-types/workitems"

const actionBtnFillId = "wt-booking-tracking-action-fill"
const actionBtnCopyBranchNameId = "wt-booking-tracking-action-copy-branch-name"
const actionBtnCopyCommitNameId = "wt-booking-tracking-action-copy-commit-name"

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
  const existingActionsBtn = document.getElementById(actionBtnFillId)
  const existingCopyBranchNameBtn = document.getElementById(actionBtnCopyBranchNameId)
  const existingCopyCommitNameBtn = document.getElementById(actionBtnCopyCommitNameId)

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
      existingCopyBranchNameBtn?.remove()
      existingCopyCommitNameBtn?.remove()
    }
  }

  console.log("inject wt-booking-tracking-action button")

  const fillBooking = createActionButton(
    actionBtnFillId, 
    {
      text: "ACTION", //TODO:!
      onclick: () => {
        if (!lastParsed) {
          return
        }
        chrome.runtime.sendMessage<MessageWithWorkitem>({ topic: "fill-booking-from-workitem-direct", workitem: lastParsed })
      },
    }
  ) 

  const copyCommitName = createActionButton(
    actionBtnCopyCommitNameId,
    {
      html: iconSvgCommit,
      title: "Als Vorlage für Commit-Text kopieren",
      onclick:  async () => {
        if (!lastParsed) {
          return
        }
        navigator.clipboard.writeText(await chrome.runtime.sendMessage<MessageWithWorkitem>({ topic: "copy-commit-name", workitem: lastParsed }))
      },
    }
  ) 

  const copyBranchName = createActionButton(
    actionBtnCopyBranchNameId,
    {
      html: iconSvgBranch,
      title: "Als Vorlage für Branch-Namen kopieren",
      onclick: async () => {
        if (!lastParsed) {
          return
        } 
        navigator.clipboard.writeText(await chrome.runtime.sendMessage<MessageWithWorkitem>({ topic: "copy-branch-name", workitem: lastParsed }))
      },
    }
  ) 

  if (position==="append") {
    actionsContainer.append(fillBooking, copyCommitName, copyBranchName)
  } else {
    actionsContainer.prepend(fillBooking, copyCommitName, copyBranchName)
  }
}

function createActionButton(id: string, options?: {text?: string, html?: string, title?: string, onclick?: () => void}) {
  const btn = document.createElement("button")
  btn.id = id
  if (options?.text) {
    btn.textContent = options.text
  }
  if (options?.html) {
    btn.innerHTML = options.html
  }
  if (options?.title) {
    btn.title = options.title
  }
  btn.style.background = "transparent"
  btn.style.border = "none"
  btn.style.cursor = "pointer"
  btn.style.alignSelf = "stretch"
  btn.style.minHeight = "24px"
  btn.style.minWidth = "24px"

  if (options?.onclick) {
    btn.onclick = options.onclick
  }

  return btn
}