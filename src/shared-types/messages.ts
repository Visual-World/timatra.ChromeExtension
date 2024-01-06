import { Workitem, WorkitemWithOrigin } from "./workitems"

export type MessageTopic =
  | "new-workitem"
  | "new-workitem-with-origin"
  | "new-workitems"
  | "workitem-request"
  | "workitems-request"
  | "create-booking-from-workitem"
  | "fill-booking-from-workitem"
  | "fill booking-from-workitem-direct"
export type MessageWithTopic = { topic: MessageTopic }
export type MessageWithTopicOrUndefinded = { topic: MessageTopic | undefined }
export type MessageWithWorkitem = MessageWithTopic & { workitem: Workitem }
export type MessageWithWorkitemAndOrigin = MessageWithTopic & { workitem: WorkitemWithOrigin }
export type MessageWithWorkitems = MessageWithTopic & { workitems: WorkitemWithOrigin[] }
