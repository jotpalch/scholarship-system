"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from './use-auth'

export interface WebSocketMessage {
  type: string
  data?: any
  timestamp?: string
  notification_id?: number
  action?: string
  count?: number
}

export interface WebSocketHookOptions {
  url?: string
  autoConnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
  onMessage?: (message: WebSocketMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
}

export interface WebSocketHookReturn {
  isConnected: boolean
  isConnecting: boolean
  connect: () => void
  disconnect: () => void
  sendMessage: (message: any) => void
  lastMessage: WebSocketMessage | null
  error: string | null
}

export function useWebSocket(options: WebSocketHookOptions = {}): WebSocketHookReturn {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || `ws://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8000/api/v1/ws/notifications`,
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    onMessage,
    onConnect,
    onDisconnect,
    onError
  } = options

  const { token } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (!token) {
      console.warn('WebSocket: No authentication token available')
      return
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING || wsRef.current?.readyState === WebSocket.OPEN) {
      console.warn('WebSocket: Already connected or connecting')
      return
    }

    try {
      setIsConnecting(true)
      setError(null)
      
      const wsUrl = `${url}?token=${encodeURIComponent(token)}`
      console.log('WebSocket: Connecting to', wsUrl.replace(/token=[^&]+/, 'token=***'))
      
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = (event) => {
        console.log('WebSocket: Connected successfully')
        setIsConnected(true)
        setIsConnecting(false)
        setError(null)
        reconnectAttemptsRef.current = 0
        
        // Start heartbeat
        startHeartbeat()
        
        onConnect?.()
      }

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          console.log('WebSocket: Received message:', message.type)
          
          setLastMessage(message)
          onMessage?.(message)
          
          // Handle pong messages for heartbeat
          if (message.type === 'pong') {
            resetHeartbeat()
          }
        } catch (err) {
          console.error('WebSocket: Failed to parse message:', err)
        }
      }

      wsRef.current.onclose = (event) => {
        console.log('WebSocket: Connection closed', event.code, event.reason)
        setIsConnected(false)
        setIsConnecting(false)
        
        stopHeartbeat()
        onDisconnect?.()

        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          scheduleReconnect()
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError(`Failed to reconnect after ${maxReconnectAttempts} attempts`)
        }
      }

      wsRef.current.onerror = (event) => {
        console.error('WebSocket: Connection error:', event)
        setError('WebSocket connection error')
        setIsConnecting(false)
        onError?.(event)
      }

    } catch (err) {
      console.error('WebSocket: Failed to create connection:', err)
      setError('Failed to create WebSocket connection')
      setIsConnecting(false)
    }
  }, [token, url, maxReconnectAttempts, onConnect, onDisconnect, onError, onMessage])

  const disconnect = useCallback(() => {
    console.log('WebSocket: Disconnecting...')
    
    stopHeartbeat()
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect')
      wsRef.current = null
    }

    setIsConnected(false)
    setIsConnecting(false)
    setError(null)
  }, [])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message))
        console.log('WebSocket: Sent message:', message.type || 'unknown')
      } catch (err) {
        console.error('WebSocket: Failed to send message:', err)
        setError('Failed to send message')
      }
    } else {
      console.warn('WebSocket: Cannot send message, connection not open')
    }
  }, [])

  const scheduleReconnect = useCallback(() => {
    reconnectAttemptsRef.current += 1
    console.log(`WebSocket: Scheduling reconnect attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`)
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect()
    }, reconnectInterval)
  }, [connect, reconnectInterval, maxReconnectAttempts])

  const startHeartbeat = useCallback(() => {
    const sendPing = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'ping' })
        
        // Set timeout for pong response
        heartbeatTimeoutRef.current = setTimeout(() => {
          console.warn('WebSocket: Heartbeat timeout, closing connection')
          wsRef.current?.close()
        }, 10000) // 10 seconds timeout
      }
    }
    
    // Send initial ping
    sendPing()
    
    // Schedule regular pings every 30 seconds
    const intervalId = setInterval(sendPing, 30000)
    
    return () => clearInterval(intervalId)
  }, [sendMessage])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current)
      heartbeatTimeoutRef.current = null
    }
  }, [])

  const resetHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current)
      heartbeatTimeoutRef.current = null
    }
  }, [])

  // Auto-connect when token is available
  useEffect(() => {
    if (autoConnect && token && !isConnected && !isConnecting) {
      connect()
    }
  }, [autoConnect, token, isConnected, isConnecting, connect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  // Handle visibility change to reconnect when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && token && !isConnected && !isConnecting) {
        console.log('WebSocket: Page became visible, attempting to reconnect')
        connect()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [token, isConnected, isConnecting, connect])

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendMessage,
    lastMessage,
    error
  }
}