/**
 * Real-Time Service — connects to SSE endpoint for live notifications.
 */

const TOKEN_KEY = 'govproposal_token';

class RealtimeService {
  constructor() {
    this._eventSource = null;
    this._listeners = {};
    this._reconnectDelay = 2000;
    this._maxReconnectDelay = 30000;
    this._currentDelay = this._reconnectDelay;
  }

  /**
   * Connect to the SSE stream.
   * @param {Function} onEvent - Callback for each event: (eventType, data) => void
   */
  connect(onEvent) {
    if (this._eventSource) {
      this.disconnect();
    }

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      console.warn('[Realtime] No auth token — skipping SSE connection');
      return;
    }

    const baseUrl = import.meta.env.VITE_API_URL || '';
    const url = `${baseUrl}/api/realtime/events`;

    try {
      // EventSource doesn't support custom headers, so we use fetch-based SSE
      this._startFetchSSE(url, token, onEvent);
    } catch (err) {
      console.error('[Realtime] Connection failed:', err);
      this._scheduleReconnect(onEvent);
    }
  }

  async _startFetchSSE(url, token, onEvent) {
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
      });

      if (!response.ok) {
        console.error('[Realtime] SSE response not ok:', response.status);
        this._scheduleReconnect(onEvent);
        return;
      }

      this._currentDelay = this._reconnectDelay;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const eventStr of events) {
          if (!eventStr.trim() || eventStr.startsWith(':')) continue;

          const lines = eventStr.split('\n');
          let eventType = 'message';
          let data = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7);
            } else if (line.startsWith('data: ')) {
              data = line.slice(6);
            }
          }

          if (data) {
            try {
              const parsed = JSON.parse(data);
              if (onEvent) onEvent(eventType, parsed);
            } catch {
              if (onEvent) onEvent(eventType, { raw: data });
            }
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[Realtime] Stream error:', err);
        this._scheduleReconnect(onEvent);
      }
    }
  }

  _scheduleReconnect(onEvent) {
    console.log(`[Realtime] Reconnecting in ${this._currentDelay / 1000}s...`);
    setTimeout(() => {
      this._currentDelay = Math.min(this._currentDelay * 1.5, this._maxReconnectDelay);
      this.connect(onEvent);
    }, this._currentDelay);
  }

  disconnect() {
    if (this._eventSource) {
      this._eventSource.close();
      this._eventSource = null;
    }
  }

  /**
   * Get connection stats from the server.
   */
  async getStatus() {
    const token = localStorage.getItem(TOKEN_KEY);
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const resp = await fetch(`${baseUrl}/api/realtime/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return resp.json();
  }
}

export const realtimeService = new RealtimeService();
export default realtimeService;
