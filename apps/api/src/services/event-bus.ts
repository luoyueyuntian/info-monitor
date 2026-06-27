import { EventEmitter } from "events";

import type { SSEEventType, SSEMessage } from "@info-monitor/shared-contracts";

export type { SSEEventType, SSEMessage };

export const eventBus = new EventEmitter();
eventBus.setMaxListeners(100);

export function emitSSE(type: SSEEventType, payload: Record<string, unknown>): void {
  const message: SSEMessage = {
    type,
    payload,
    timestamp: new Date().toISOString(),
  };
  eventBus.emit("sse", message);
}
