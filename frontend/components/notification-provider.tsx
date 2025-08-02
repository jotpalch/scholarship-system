"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useNotificationWebSocket } from '@/hooks/use-notification-websocket'
import { apiClient } from '@/lib/api'

interface NotificationData {
  id: number
  title: string
  title_en?: string
  message: string
  message_en?: string
  notification_type: "info" | "warning" | "error" | "success" | "reminder"
  priority: "low" | "normal" | "high" | "urgent"
  related_resource_type?: string
  related_resource_id?: number
  action_url?: string
  is_read: boolean
  is_dismissed: boolean
  scheduled_at?: string
  expires_at?: string
  read_at?: string
  created_at: string
  metadata?: any
}

interface NotificationCache {
  data: NotificationData[]
  timestamp: number
  params: string
}

interface NotificationContextType {
  // Data
  notifications: NotificationData[]
  unreadCount: number
  recentNotifications: NotificationData[]
  
  // Loading states
  isLoading: boolean
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  
  // Actions
  fetchNotifications: (options?: {
    skip?: number
    limit?: number
    unreadOnly?: boolean
    notificationType?: string
    forceRefresh?: boolean
  }) => Promise<void>
  markAsRead: (notificationId: number) => Promise<void>
  markAllAsRead: () => Promise<void>
  refreshUnreadCount: () => Promise<void>
  
  // Cache management
  clearCache: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: React.ReactNode
  cacheTimeout?: number // Cache timeout in milliseconds
}

export function NotificationProvider({ 
  children, 
  cacheTimeout = 5 * 60 * 1000 // 5 minutes default
}: NotificationProviderProps) {
  // Local state
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Cache management
  const [cache, setCache] = useState<Map<string, NotificationCache>>(new Map())
  
  // WebSocket connection
  const {
    isConnected,
    isConnecting,
    unreadCount: wsUnreadCount,
    recentNotifications,
    error: wsError
  } = useNotificationWebSocket()
  
  // Combine errors
  const combinedError = error || wsError
  
  // Generate cache key for request parameters
  const getCacheKey = useCallback((params: {
    skip?: number
    limit?: number
    unreadOnly?: boolean
    notificationType?: string
  }) => {
    return `notifications_${params.skip || 0}_${params.limit || 20}_${params.unreadOnly || false}_${params.notificationType || 'all'}`
  }, [])
  
  // Check if cache is valid
  const isCacheValid = useCallback((cacheEntry: NotificationCache) => {
    return Date.now() - cacheEntry.timestamp < cacheTimeout
  }, [cacheTimeout])
  
  // Get notifications from cache or API
  const fetchNotifications = useCallback(async (options: {
    skip?: number
    limit?: number
    unreadOnly?: boolean
    notificationType?: string
    forceRefresh?: boolean
  } = {}) => {
    const { skip = 0, limit = 20, unreadOnly = false, notificationType, forceRefresh = false } = options
    const cacheKey = getCacheKey({ skip, limit, unreadOnly, notificationType })
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = cache.get(cacheKey)
      if (cached && isCacheValid(cached)) {
        console.log('Using cached notifications')
        setNotifications(cached.data)
        return
      }
    }
    
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await apiClient.notifications.getNotifications(
        skip,
        limit,
        unreadOnly,
        notificationType
      )
      
      if (response.success && response.data) {
        const notificationData = response.data.map(n => ({
          ...n,
          notification_type: n.notification_type as "info" | "warning" | "error" | "success" | "reminder",
          priority: n.priority as "low" | "normal" | "high" | "urgent"
        }))
        
        setNotifications(notificationData)
        
        // Update cache
        setCache(prev => new Map(prev).set(cacheKey, {
          data: notificationData,
          timestamp: Date.now(),
          params: cacheKey
        }))
        
        console.log(`Fetched ${notificationData.length} notifications`)
      } else {
        throw new Error(response.message || 'Failed to fetch notifications')
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications')
    } finally {
      setIsLoading(false)
    }
  }, [cache, getCacheKey, isCacheValid])
  
  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      const response = await apiClient.notifications.markAsRead(notificationId)
      
      if (response.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          )
        )
        
        // Clear cache to ensure fresh data on next fetch
        clearCache()
        
        console.log(`Marked notification ${notificationId} as read`)
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
      setError('Failed to mark notification as read')
    }
  }, [])
  
  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await apiClient.notifications.markAllAsRead()
      
      if (response.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
        )
        
        // Clear cache to ensure fresh data on next fetch
        clearCache()
        
        console.log('Marked all notifications as read')
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
      setError('Failed to mark all notifications as read')
    }
  }, [])
  
  // Refresh unread count
  const refreshUnreadCount = useCallback(async () => {
    try {
      await apiClient.notifications.getUnreadCount()
      // The actual count is managed by WebSocket, this just triggers a refresh
    } catch (err) {
      console.error('Failed to refresh unread count:', err)
    }
  }, [])
  
  // Clear cache
  const clearCache = useCallback(() => {
    setCache(new Map())
    console.log('Notification cache cleared')
  }, [])
  
  // Load initial notifications
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])
  
  // Handle WebSocket real-time updates
  useEffect(() => {
    if (recentNotifications.length > 0) {
      // When new notifications arrive via WebSocket, clear cache and refresh
      clearCache()
      
      // Optionally, add new notifications to the current list if they match current filter
      const latestNotification = recentNotifications[0]
      setNotifications(prev => {
        // Check if notification already exists
        const exists = prev.some(n => n.id === latestNotification.id)
        if (!exists) {
          return [latestNotification as NotificationData, ...prev.slice(0, 19)] // Keep list manageable
        }
        return prev
      })
    }
  }, [recentNotifications, clearCache])
  
  // Auto-refresh notifications periodically when connected
  useEffect(() => {
    if (!isConnected) return
    
    const interval = setInterval(() => {
      // Only refresh if we have cached data that's getting stale
      const hasStaleCache = Array.from(cache.values()).some(entry => !isCacheValid(entry))
      if (hasStaleCache) {
        fetchNotifications({ forceRefresh: true })
      }
    }, 60000) // Check every minute
    
    return () => clearInterval(interval)
  }, [isConnected, cache, isCacheValid, fetchNotifications])
  
  // Clean up expired cache entries
  useEffect(() => {
    const cleanup = setInterval(() => {
      setCache(prev => {
        const newCache = new Map()
        for (const [key, entry] of prev.entries()) {
          if (isCacheValid(entry)) {
            newCache.set(key, entry)
          }
        }
        if (newCache.size !== prev.size) {
          console.log(`Cleaned up ${prev.size - newCache.size} expired cache entries`)
        }
        return newCache
      })
    }, 5 * 60 * 1000) // Clean every 5 minutes
    
    return () => clearInterval(cleanup)
  }, [isCacheValid])
  
  const contextValue: NotificationContextType = {
    // Data
    notifications,
    unreadCount: wsUnreadCount,
    recentNotifications,
    
    // Loading states
    isLoading,
    isConnected,
    isConnecting,
    error: combinedError,
    
    // Actions
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    refreshUnreadCount,
    
    // Cache management
    clearCache
  }
  
  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}