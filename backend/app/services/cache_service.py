"""
Cache service for notification system
"""

import json
import logging
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timedelta
import redis.asyncio as redis
from app.core.config import settings

logger = logging.getLogger(__name__)


class CacheService:
    """Redis-based cache service for notifications"""
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.enabled = bool(settings.redis_url)
    
    async def connect(self):
        """Initialize Redis connection"""
        if not self.enabled:
            logger.warning("Redis URL not configured, caching disabled")
            return
        
        try:
            self.redis_client = redis.from_url(
                settings.redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            # Test connection
            await self.redis_client.ping()
            logger.info("Redis cache service connected successfully")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.enabled = False
            self.redis_client = None
    
    async def disconnect(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()
    
    def _get_notification_cache_key(self, user_id: int, params: str = "") -> str:
        """Generate cache key for user notifications"""
        return f"notifications:user:{user_id}:{params}"
    
    def _get_unread_count_cache_key(self, user_id: int) -> str:
        """Generate cache key for unread count"""
        return f"notifications:unread_count:{user_id}"
    
    def _get_system_announcements_cache_key(self, params: str = "") -> str:
        """Generate cache key for system announcements"""
        return f"notifications:system_announcements:{params}"
    
    async def get_user_notifications(
        self, 
        user_id: int, 
        skip: int = 0, 
        limit: int = 20,
        unread_only: bool = False,
        notification_type: Optional[str] = None
    ) -> Optional[List[Dict[str, Any]]]:
        """Get cached user notifications"""
        if not self.enabled or not self.redis_client:
            return None
        
        try:
            params = f"skip:{skip}:limit:{limit}:unread:{unread_only}:type:{notification_type or 'all'}"
            cache_key = self._get_notification_cache_key(user_id, params)
            
            cached_data = await self.redis_client.get(cache_key)
            if cached_data:
                return json.loads(cached_data)
            
        except Exception as e:
            logger.error(f"Error getting cached notifications: {e}")
        
        return None
    
    async def set_user_notifications(
        self,
        user_id: int,
        notifications: List[Dict[str, Any]],
        skip: int = 0,
        limit: int = 20,
        unread_only: bool = False,
        notification_type: Optional[str] = None,
        ttl: int = 300  # 5 minutes
    ):
        """Cache user notifications"""
        if not self.enabled or not self.redis_client:
            return
        
        try:
            params = f"skip:{skip}:limit:{limit}:unread:{unread_only}:type:{notification_type or 'all'}"
            cache_key = self._get_notification_cache_key(user_id, params)
            
            await self.redis_client.setex(
                cache_key,
                ttl,
                json.dumps(notifications, default=str)
            )
            
        except Exception as e:
            logger.error(f"Error caching notifications: {e}")
    
    async def get_unread_count(self, user_id: int) -> Optional[int]:
        """Get cached unread count"""
        if not self.enabled or not self.redis_client:
            return None
        
        try:
            cache_key = self._get_unread_count_cache_key(user_id)
            cached_count = await self.redis_client.get(cache_key)
            
            if cached_count is not None:
                return int(cached_count)
                
        except Exception as e:
            logger.error(f"Error getting cached unread count: {e}")
        
        return None
    
    async def set_unread_count(self, user_id: int, count: int, ttl: int = 60):
        """Cache unread count"""
        if not self.enabled or not self.redis_client:
            return
        
        try:
            cache_key = self._get_unread_count_cache_key(user_id)
            await self.redis_client.setex(cache_key, ttl, count)
            
        except Exception as e:
            logger.error(f"Error caching unread count: {e}")
    
    async def invalidate_user_cache(self, user_id: int):
        """Invalidate all cached data for a user"""
        if not self.enabled or not self.redis_client:
            return
        
        try:
            # Get all keys for this user
            notification_pattern = f"notifications:user:{user_id}:*"
            unread_count_key = self._get_unread_count_cache_key(user_id)
            
            # Delete notification caches
            keys = await self.redis_client.keys(notification_pattern)
            if keys:
                await self.redis_client.delete(*keys)
            
            # Delete unread count cache
            await self.redis_client.delete(unread_count_key)
            
            logger.debug(f"Invalidated cache for user {user_id}")
            
        except Exception as e:
            logger.error(f"Error invalidating user cache: {e}")
    
    async def invalidate_system_announcements_cache(self):
        """Invalidate system announcements cache"""
        if not self.enabled or not self.redis_client:
            return
        
        try:
            pattern = "notifications:system_announcements:*"
            keys = await self.redis_client.keys(pattern)
            
            if keys:
                await self.redis_client.delete(*keys)
            
            logger.debug("Invalidated system announcements cache")
            
        except Exception as e:
            logger.error(f"Error invalidating system announcements cache: {e}")
    
    async def invalidate_all_user_caches(self):
        """Invalidate all user notification caches (for system announcements)"""
        if not self.enabled or not self.redis_client:
            return
        
        try:
            # Get all user notification keys
            pattern = "notifications:user:*"
            keys = await self.redis_client.keys(pattern)
            
            if keys:
                await self.redis_client.delete(*keys)
            
            # Also invalidate unread count caches
            unread_pattern = "notifications:unread_count:*"
            unread_keys = await self.redis_client.keys(unread_pattern)
            
            if unread_keys:
                await self.redis_client.delete(*unread_keys)
            
            logger.debug("Invalidated all user notification caches")
            
        except Exception as e:
            logger.error(f"Error invalidating all user caches: {e}")
    
    async def get_user_preferences(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get cached user notification preferences"""
        if not self.enabled or not self.redis_client:
            return None
        
        try:
            cache_key = f"notification_preferences:user:{user_id}"
            cached_data = await self.redis_client.get(cache_key)
            
            if cached_data:
                return json.loads(cached_data)
                
        except Exception as e:
            logger.error(f"Error getting cached preferences: {e}")
        
        return None
    
    async def set_user_preferences(
        self, 
        user_id: int, 
        preferences: Dict[str, Any], 
        ttl: int = 3600  # 1 hour
    ):
        """Cache user notification preferences"""
        if not self.enabled or not self.redis_client:
            return
        
        try:
            cache_key = f"notification_preferences:user:{user_id}"
            await self.redis_client.setex(
                cache_key,
                ttl,
                json.dumps(preferences, default=str)
            )
            
        except Exception as e:
            logger.error(f"Error caching preferences: {e}")
    
    async def invalidate_user_preferences(self, user_id: int):
        """Invalidate cached user preferences"""
        if not self.enabled or not self.redis_client:
            return
        
        try:
            cache_key = f"notification_preferences:user:{user_id}"
            await self.redis_client.delete(cache_key)
            
        except Exception as e:
            logger.error(f"Error invalidating preferences cache: {e}")
    
    async def health_check(self) -> Dict[str, Any]:
        """Check cache service health"""
        if not self.enabled:
            return {
                "status": "disabled",
                "redis_configured": False,
                "connection": None
            }
        
        try:
            if self.redis_client:
                await self.redis_client.ping()
                info = await self.redis_client.info()
                return {
                    "status": "healthy",
                    "redis_configured": True,
                    "connection": "active",
                    "redis_version": info.get("redis_version"),
                    "used_memory": info.get("used_memory_human"),
                    "connected_clients": info.get("connected_clients")
                }
            else:
                return {
                    "status": "disconnected",
                    "redis_configured": True,
                    "connection": "inactive"
                }
        except Exception as e:
            return {
                "status": "error",
                "redis_configured": True,
                "connection": "error",
                "error": str(e)
            }


# Global cache service instance
cache_service = CacheService()