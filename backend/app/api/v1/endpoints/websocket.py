"""
WebSocket endpoints for real-time notifications
"""

import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from typing import Optional
import jwt
from datetime import datetime

from app.core.config import settings
from app.core.deps import get_db
from app.services.websocket_manager import websocket_manager
from app.models.user import User
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)
router = APIRouter()


async def get_user_from_token(token: str, db: AsyncSession) -> Optional[User]:
    """Authenticate user from JWT token"""
    try:
        payload = jwt.decode(
            token, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        user_id: int = payload.get("sub")
        if user_id is None:
            return None
        
        # Get user from database
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        
        return user
    except jwt.PyJWTError:
        return None
    except Exception as e:
        logger.error(f"Error getting user from token: {e}")
        return None


@router.websocket("/notifications")
async def websocket_notifications_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    WebSocket endpoint for real-time notifications
    
    Client should connect with authentication token as query parameter:
    ws://localhost:8000/api/v1/ws/notifications?token=<jwt_token>
    
    Message types from server:
    - connection: Connection status
    - notification: New notification
    - system_announcement: System-wide announcement
    - notification_update: Notification state changed (read, dismissed)
    - unread_count_update: Updated unread count
    - error: Error message
    - pong: Response to ping
    
    Message types from client:
    - ping: Keep-alive message
    - get_status: Request connection status
    """
    
    # Authenticate user
    if not token:
        await websocket.close(code=4001, reason="Authentication token required")
        return
    
    user = await get_user_from_token(token, db)
    if not user:
        await websocket.close(code=4001, reason="Invalid authentication token")
        return
    
    if not user.is_active:
        await websocket.close(code=4003, reason="User account is inactive")
        return
    
    # Connect user
    connection_metadata = {
        "connected_at": datetime.now().isoformat(),
        "user_agent": websocket.headers.get("user-agent", "Unknown"),
        "ip_address": websocket.client.host if websocket.client else "Unknown"
    }
    
    await websocket_manager.connect(websocket, user.id, connection_metadata)
    
    try:
        while True:
            # Wait for messages from client
            data = await websocket.receive_text()
            await websocket_manager.handle_client_message(websocket, data)
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user.id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {user.id}: {e}")
    finally:
        websocket_manager.disconnect(websocket)


@router.get("/connections/status")
async def get_websocket_status():
    """Get WebSocket connection status (admin only)"""
    connected_users = websocket_manager.get_connected_users()
    total_connections = websocket_manager.get_connection_count()
    
    return {
        "success": True,
        "data": {
            "connected_users": len(connected_users),
            "total_connections": total_connections,
            "user_ids": list(connected_users)
        }
    }


@router.post("/test-broadcast")
async def test_broadcast_message(
    message: str = "Test broadcast message",
    user_id: Optional[int] = None
):
    """Test endpoint to send messages via WebSocket (admin only)"""
    test_data = {
        "type": "test",
        "message": message,
        "timestamp": datetime.now().isoformat()
    }
    
    if user_id:
        await websocket_manager.send_to_user(user_id, test_data)
        return {"success": True, "message": f"Test message sent to user {user_id}"}
    else:
        await websocket_manager.send_to_all(test_data)
        return {"success": True, "message": "Test message broadcasted to all users"}