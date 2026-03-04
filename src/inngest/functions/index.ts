import type { InngestFunction } from "inngest";
import { postSessionPipeline, aiRetryHandler } from "./post-session";
import {
  preSessionNudgeRefresh,
  nudgeRefreshHandler,
} from "./pre-session-nudges";

export const functions: InngestFunction.Any[] = [
  postSessionPipeline,
  aiRetryHandler,
  preSessionNudgeRefresh,
  nudgeRefreshHandler,
];
