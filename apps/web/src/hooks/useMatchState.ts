import { useCallback, useEffect, useRef, useState } from "react";
import type { GameState } from "@gbg/types";

interface WsMsg {
  type: string;
  payload: any;
}

/**
 * React hook managing websocket connection and game state updates for a match.
 *
 * @param matchId - id of the match to connect to
 * @param opts.autoConnect - whether to automatically connect when matchId changes
 * @param opts.initialState - optional initial state before websocket messages arrive
 */
export default function useMatchState(
  matchId?: string,
  opts: { autoConnect?: boolean; initialState?: GameState | null } = {}
) {
  const { autoConnect = true, initialState = null } = opts;
  const [state, setState] = useState<GameState | null>(initialState);
  // Reset internal state whenever a new initial state is provided
  useEffect(() => {
    setState(initialState);
  }, [initialState]);
  const wsRef = useRef<WebSocket | null>(null);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const connect = useCallback(
    (id?: string) => {
      const targetId = id ?? matchId;
      if (!targetId) return;
      // Close any existing connection
      wsRef.current?.close();
      const ws = new WebSocket(`ws://localhost:8787/?matchId=${targetId}`);
      ws.onmessage = (e) => {
        try {
          const msg: WsMsg = JSON.parse(e.data);
          if (msg.type === "state:update") {
            setState(msg.payload as GameState);
          }
        } catch {
          // ignore malformed messages
        }
      };
      wsRef.current = ws;
    },
    [matchId]
  );

  // Automatically connect/disconnect when matchId changes
  useEffect(() => {
    if (autoConnect) {
      connect(matchId);
    }
    return () => {
      disconnect();
    };
  }, [matchId, autoConnect, connect, disconnect]);

  return { state, setState, connect, disconnect };
}

