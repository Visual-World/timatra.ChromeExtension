import { Workitem } from "@/shared-types/workitems"

const quotesRegex = /[\"\'\´\`\$]/g
const whitespaceRegex = /[\s]/g
const specialCharsRegex = /[^a-zA-Z0-9\-]/g
const bracesRegex = /\(\)[\{\}\[\]]/g
const doubleUnderscoreRegex = /__+/g
const doubleMinusRegex = /\-\-+/g

export function getWorkitemAsCommitText(workitem: Workitem) {
  return `#${workitem.id} - ${workitem.title.replace(quotesRegex,"")}`
}

export function getWorkitemAsBranchName(workitem: Workitem) {
  const normalizedTitle = workitem.title
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(bracesRegex, "_")
    .replace(whitespaceRegex, "-")
    .replace(specialCharsRegex, "")
    .replace(doubleUnderscoreRegex, "_")
    .replace(doubleMinusRegex, "-")
    .toLowerCase()

  return `${workitem.id}_${normalizedTitle}`
}