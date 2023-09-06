export type WorkitemIdTitleSelector = { originRegExp: RegExp; idSel: string[]; titleSel: string[]; projectSel: string[] }
export type Workitem = { id: string; title: string; project: string }
export type WorkitemWithOrigin = Workitem & { origin: string }

export type WorkitemProjectMapping = {projectSource: string, projectTarget: string}