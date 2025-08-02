"use client"

import { useEffect, useState, useCallback } from 'react'
import { useWebSocket, WebSocketMessage } from './use-websocket'
import { toast } from '@/components/ui/use-toast'

export interface NotificationData {
  id: number
  title: string
  title_en?: string
  message: string
  message_en?: string
  notification_type: string
  priority: string
  action_url?: string
  created_at: string
}

export interface NotificationWebSocketHookReturn {
  isConnected: boolean
  isConnecting: boolean
  unreadCount: number
  recentNotifications: NotificationData[]
  connect: () => void
  disconnect: () => void
  error: string | null
}

export function useNotificationWebSocket(): NotificationWebSocketHookReturn {
  const [unreadCount, setUnreadCount] = useState(0)
  const [recentNotifications, setRecentNotifications] = useState<NotificationData[]>([])

  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    console.log('Notification WebSocket message:', message.type)
    
    switch (message.type) {
      case 'connection':
        console.log('Notification WebSocket connected:', message.data?.message)
        break
        
      case 'notification':
        if (message.data) {
          const notification = message.data as NotificationData
          
          // Add to recent notifications
          setRecentNotifications(prev => [notification, ...prev.slice(0, 9)]) // Keep last 10
          
          // Show toast notification
          showNotificationToast(notification)
        }
        break
        
      case 'system_announcement':
        if (message.data) {
          const announcement = message.data as NotificationData
          
          // Add to recent notifications
          setRecentNotifications(prev => [announcement, ...prev.slice(0, 9)])
          
          // Show toast notification with special styling for system announcements
          showSystemAnnouncementToast(announcement)
        }
        break
        
      case 'notification_update':
        if (message.action === 'read' && message.notification_id) {
          console.log(`Notification ${message.notification_id} marked as read`)
          // Could update local state here if needed
        }
        break
        
      case 'unread_count_update':
        if (typeof message.count === 'number') {
          setUnreadCount(message.count)
          console.log('Unread count updated:', message.count)
        }
        break
        
      case 'error':
        console.error('Notification WebSocket error:', message.data?.message)
        break
        
      case 'pong':
        // Heartbeat response, nothing to do
        break
        
      default:
        console.log('Unknown notification WebSocket message type:', message.type)
    }
  }, [])

  const showNotificationToast = useCallback((notification: NotificationData) => {
    const title = notification.title_en || notification.title
    const description = notification.message_en || notification.message
    
    // Determine toast variant based on notification type and priority
    let variant: "default" | "destructive" = "default"
    if (notification.notification_type === 'error' || notification.priority === 'urgent') {
      variant = "destructive"
    }
    
    toast({
      title: title,
      description: description.length > 100 ? description.substring(0, 100) + '...' : description,
      variant,
      duration: getPriorityDuration(notification.priority),
      action: notification.action_url ? {
        altText: "View",
        children: "View",
        onClick: () => {
          if (notification.action_url) {
            if (notification.action_url.startsWith('http')) {
              window.open(notification.action_url, '_blank')
            } else {
              window.location.href = notification.action_url
            }
          }
        }
      } : undefined
    })
  }, [])

  const showSystemAnnouncementToast = useCallback((announcement: NotificationData) => {
    const title = `📢 ${announcement.title_en || announcement.title}`
    const description = announcement.message_en || announcement.message
    
    toast({
      title: title,
      description: description.length > 120 ? description.substring(0, 120) + '...' : description,
      variant: announcement.priority === 'urgent' ? "destructive" : "default",
      duration: getPriorityDuration(announcement.priority) + 2000, // System announcements stay longer
      action: announcement.action_url ? {
        altText: "View",
        children: "View",
        onClick: () => {
          if (announcement.action_url) {
            if (announcement.action_url.startsWith('http')) {
              window.open(announcement.action_url, '_blank')
            } else {
              window.location.href = announcement.action_url
            }
          }
        }
      } : undefined
    })
  }, [])

  const getPriorityDuration = (priority: string): number => {
    switch (priority) {
      case 'urgent':
        return 10000 // 10 seconds
      case 'high':
        return 7000  // 7 seconds
      case 'normal':
        return 5000  // 5 seconds
      case 'low':
        return 3000  // 3 seconds
      default:
        return 5000
    }
  }

  const {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    sendMessage,
    error
  } = useWebSocket({
    autoConnect: true,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
    onMessage: handleWebSocketMessage,
    onConnect: () => {
      console.log('Notification WebSocket connected')
      // Request initial status
      setTimeout(() => {
        sendMessage({ type: 'get_status' })
      }, 1000)
    },
    onDisconnect: () => {
      console.log('Notification WebSocket disconnected')
    }
  })

  // Cleanup recent notifications periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      setRecentNotifications(prev => {
        const cutoff = Date.now() - (5 * 60 * 1000) // 5 minutes
        return prev.filter(notification => {
          const created = new Date(notification.created_at).getTime()
          return created > cutoff
        })
      })
    }, 60000) // Check every minute

    return () => clearInterval(cleanup)
  }, [])

  return {
    isConnected,
    isConnecting,
    unreadCount,
    recentNotifications,
    connect,
    disconnect,
    error
  }
}