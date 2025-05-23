import { useEffect, useRef, useState, useCallback } from 'react';
import { ServerMessage, parseMessage, ClientMessage, createMessage } from '../types/network'; // Импортируем типы network

const WEBSOCKET_URL = 'ws://10.21.14.209:8080';

export interface WebSocketHookOptions {
  onMessage?: (message: ServerMessage) => void; // Обработчик для типизированных сообщений от сервера
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
}

export interface WebSocketHook {
  isConnected: boolean;
  lastRawMessage: any | null; // Оставляем для отладки, если нужно
  sendMessage: (type: ClientMessage['type'], payload?: any) => void; // Теперь отправляет типизированные сообщения
  socketRef: React.MutableRefObject<WebSocket | null>;
}

export const useWebSocket = (options?: WebSocketHookOptions): WebSocketHook => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastRawMessage, setLastRawMessage] = useState<any | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(options?.onMessage);
  const onOpenRef = useRef(options?.onOpen);
  const onCloseRef = useRef(options?.onClose);
  const onErrorRef = useRef(options?.onError);

  // Обновляем refs если пропсы изменились
  useEffect(() => {
    onMessageRef.current = options?.onMessage;
    onOpenRef.current = options?.onOpen;
    onCloseRef.current = options?.onClose;
    onErrorRef.current = options?.onError;
  }, [options?.onMessage, options?.onOpen, options?.onClose, options?.onError]);

  const sendMessage = useCallback((type: ClientMessage['type'], payload?: any) => {
    console.log('sendMessage called. socketRef.current:', socketRef.current, 'readyState:', socketRef.current?.readyState);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const messageString = createMessage(type, payload);
      socketRef.current.send(messageString);
      console.log('Sent WS message:', { type, payload });
    } else {
      console.error('WebSocket is not connected or not open. Cannot send message.');
    }
  }, []);

  useEffect(() => {
    console.log('Attempting to connect to WebSocket...');
    const wsInstance = new WebSocket(WEBSOCKET_URL);
    socketRef.current = wsInstance; // Assign to ref immediately for sendMessage

    wsInstance.onopen = (event) => {
      // Check if this is still the current socket instance before setting state
      if (socketRef.current === wsInstance) {
        console.log('WebSocket connected. Current ws.readyState:', wsInstance.readyState);
        setIsConnected(true);
        if (onOpenRef.current) {
          onOpenRef.current(event);
        }
      } else {
        console.log('WebSocket onopen called for an old instance, ignoring.');
        // If this isn't the current socket, it might have been closed by a quick StrictMode cycle
        // We might need to close this specific instance if it managed to open
        if (wsInstance.readyState === WebSocket.OPEN) {
          wsInstance.close();
        }
      }
    };

    wsInstance.onmessage = (event) => {
      // Check if this is still the current socket instance
      if (socketRef.current === wsInstance) {
        const rawData = event.data;
        console.log('Received raw WS message:', rawData);
        setLastRawMessage(rawData);

        const parsed = parseMessage<ServerMessage>(rawData as string);
        if (parsed && onMessageRef.current) {
          onMessageRef.current(parsed);
        } else if (!parsed) {
          console.error('Failed to parse server message or no handler for:', rawData);
        }
      } else {
        console.log('WebSocket onmessage received for an old instance, ignoring.');
      }
    };

    wsInstance.onclose = (event) => {
      // Only update state if this is the current or a relevant closing event
      // If socketRef.current is null, it means a cleanup has already decided to close.
      // If socketRef.current is different, it means a new socket is being established.
      if (socketRef.current === wsInstance || socketRef.current === null) {
        console.log('WebSocket disconnected:', event.reason, event.code);
        setIsConnected(false);
        // Avoid setting socketRef.current to null if a new one is already in place by another effect run
        if (socketRef.current === wsInstance) {
            socketRef.current = null;
        }
        if (onCloseRef.current) {
          onCloseRef.current(event);
        }
      } else {
         console.log('WebSocket onclose called for an old instance, ignoring state updates.');
      }
    };

    wsInstance.onerror = (event) => {
      if (socketRef.current === wsInstance || socketRef.current === null) {
        console.error('WebSocket error event:', event);
        setIsConnected(false);
        if (socketRef.current === wsInstance) {
            socketRef.current = null;
        }
        if (onErrorRef.current) {
          onErrorRef.current(event);
        }
      } else {
        console.log('WebSocket onerror called for an old instance, ignoring state updates.');
      }
    };

    return () => {
      console.log('Cleaning up WebSocket effect. Current wsInstance readyState:', wsInstance.readyState);
      // Only close the specific WebSocket instance this effect was responsible for
      // And only if it's still in a state that needs closing.
      if (wsInstance.readyState === WebSocket.OPEN || wsInstance.readyState === WebSocket.CONNECTING) {
        console.log('Closing WebSocket connection for this specific instance...');
        wsInstance.close(1000, 'Component unmounting or effect re-running');
      }
      // If this instance is the one currently in socketRef, then nullify it.
      // This prevents a newer instance in socketRef from being nulled by an older cleanup.
      if (socketRef.current === wsInstance) {
        socketRef.current = null;
        setIsConnected(false); // Ensure connected state is false if this was the active socket
      }
    };
  }, []); // Пустой массив зависимостей для однократного выполнения

  return { isConnected, lastRawMessage, sendMessage, socketRef };
}; 