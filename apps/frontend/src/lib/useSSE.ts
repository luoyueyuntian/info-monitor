import { onMounted, onUnmounted, ref } from "vue";

import type { SSEMessage } from "@info-monitor/shared-contracts";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export function useSSE(onEvent: (event: SSEMessage) => void) {
  const connected = ref(false);
  let source: EventSource | null = null;

  function connect() {
    if (source) {
      source.close();
    }

    source = new EventSource(`${API_BASE_URL}/events/stream`);

    source.onopen = () => {
      connected.value = true;
    };

    source.onmessage = (e: MessageEvent) => {
      try {
        const message = JSON.parse(e.data) as SSEMessage;
        onEvent(message);
      } catch {
        // Ignore parse errors (e.g., heartbeat comments)
      }
    };

    source.onerror = () => {
      connected.value = false;
      // EventSource auto-reconnects with the retry interval (5s)
    };
  }

  function disconnect() {
    if (source) {
      source.close();
      source = null;
      connected.value = false;
    }
  }

  onMounted(connect);
  onUnmounted(disconnect);

  return { connected, disconnect, reconnect: connect };
}
