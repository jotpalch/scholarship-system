"""
WebSocket manager for real-time notifications
"""

import json
import logging
from typing import Dict, List, Set, Optional
from fastapi import WebSocket, WebSocketDisconnect
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)


class NotificationWebSocketManager:
    """Manages WebSocket connections for real-time notifications"""
    
    def __init__(self):
        # Active connections: user_id -> List[WebSocket]
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # WebSocket to user mapping: WebSocket -> user_id
        self.connection_users: Dict[WebSocket, int] = {}
        # Connection metadata: WebSocket -> dict
        self.connection_metadata: Dict[WebSocket, dict] = {}
        
    async def connect(self, websocket: WebSocket, user_id: int, metadata: Optional[dict] = None):
        """Accept a new WebSocket connection for a user"""
        await websocket.accept()
        
        # Initialize user's connection list if needed
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        
        # Add connection
        self.active_connections[user_id].append(websocket)
        self.connection_users[websocket] = user_id
        self.connection_metadata[websocket] = metadata or {}
        
        logger.info(f"WebSocket connected for user {user_id}. Total connections: {len(self.active_connections[user_id])}")
        
        # Send connection confirmation
        await self.send_to_connection(websocket, {
            "type": "connection",
            "status": "connected",
            "message": "Real-time notifications enabled",
            "timestamp": datetime.now().isoformat()
        })
    
    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection"""
        user_id = self.connection_users.get(websocket)
        
        if user_id and websocket in self.active_connections.get(user_id, []):
            self.active_connections[user_id].remove(websocket)
            
            # Clean up empty user connection lists
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        # Clean up connection tracking
        self.connection_users.pop(websocket, None)
        self.connection_metadata.pop(websocket, None)
        
        logger.info(f"WebSocket disconnected for user {user_id}")
    
    async def send_to_connection(self, websocket: WebSocket, data: dict):
        """Send data to a specific WebSocket connection"""
        try:
            await websocket.send_text(json.dumps(data))
        except Exception as e:
            logger.error(f"Failed to send data to WebSocket: {e}")
            # Connection might be dead, remove it
            self.disconnect(websocket)
    
    async def send_to_user(self, user_id: int, data: dict):
        """Send data to all connections of a specific user"""
        if user_id not in self.active_connections:
            logger.debug(f"No active connections for user {user_id}")
            return
        
        # Send to all user's connections
        connections = self.active_connections[user_id].copy()  # Copy to avoid modification during iteration
        for websocket in connections:
            await self.send_to_connection(websocket, data)
    
    async def send_to_all(self, data: dict):
        """Send data to all connected users"""
        for user_id in list(self.active_connections.keys()):
            await self.send_to_user(user_id, data)
    
    async def send_notification(self, user_id: int, notification_data: dict):
        """Send a notification to a specific user"""
        message = {
            "type": "notification",
            "data": notification_data,
            "timestamp": datetime.now().isoformat()
        }
        await self.send_to_user(user_id, message)
    
    async def send_system_announcement(self, announcement_data: dict):
        """Send a system announcement to all connected users"""
        message = {
            "type": "system_announcement",
            "data": announcement_data,
            "timestamp": datetime.now().isoformat()
        }
        await self.send_to_all(message)
    
    async def send_notification_update(self, user_id: int, notification_id: int, action: str, data: Optional[dict] = None):
        """Send notification update (read, dismissed, etc.)"""
        message = {
            "type": "notification_update",
            "notification_id": notification_id,
            "action": action,  # 'read', 'dismissed', 'deleted'
            "data": data or {},
            "timestamp": datetime.now().isoformat()
        }
        await self.send_to_user(user_id, message)
    
    async def send_unread_count_update(self, user_id: int, count: int):
        """Send updated unread notification count to user"""
        message = {
            "type": "unread_count_update",
            "count": count,
            "timestamp": datetime.now().isoformat()
        }
        await self.send_to_user(user_id, message)
    
    def get_user_connections(self, user_id: int) -> List[WebSocket]:
        """Get all active connections for a user"""
        return self.active_connections.get(user_id, [])
    
    def get_connected_users(self) -> Set[int]:
        """Get set of all connected user IDs"""
        return set(self.active_connections.keys())
    
    def get_connection_count(self, user_id: Optional[int] = None) -> int:
        """Get connection count for a user or total"""
        if user_id is not None:
            return len(self.active_connections.get(user_id, []))
        return sum(len(connections) for connections in self.active_connections.values())
    
    async def handle_client_message(self, websocket: WebSocket, message: str):
        """Handle incoming messages from clients"""
        try:
            data = json.loads(message)
            message_type = data.get("type")
            user_id = self.connection_users.get(websocket)
            
            if not user_id:
                await self.send_to_connection(websocket, {
                    "type": "error",
                    "message": "User not authenticated"
                })
                return
            
            # Handle different message types
            if message_type == "ping":
                await self.send_to_connection(websocket, {
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                })
            
            elif message_type == "get_status":
                await self.send_to_connection(websocket, {
                    "type": "status",
                    "user_id": user_id,
                    "connection_count": len(self.active_connections.get(user_id, [])),
                    "timestamp": datetime.now().isoformat()
                })
            
            else:
                logger.warning(f"Unknown message type from user {user_id}: {message_type}")
                
        except json.JSONDecodeError:
            await self.send_to_connection(websocket, {
                "type": "error",
                "message": "Invalid JSON message"
            })
        except Exception as e:
            logger.error(f"Error handling client message: {e}")
            await self.send_to_connection(websocket, {
                "type": "error",
                "message": "Internal server error"
            })


# Global WebSocket manager instance
websocket_manager = NotificationWebSocketManager()