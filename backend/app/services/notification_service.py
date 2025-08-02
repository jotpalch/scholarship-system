"""
Notification service for creating and managing user notifications
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
import logging

from app.models.notification import Notification, NotificationRead, NotificationType, NotificationPriority
from app.models.user import User

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing notifications"""
    
    def __init__(self, db: AsyncSession, websocket_manager=None, cache_service=None):
        self.db = db
        self.websocket_manager = websocket_manager
        self.cache_service = cache_service
    
    async def createUserNotification(
        self,
        user_id: int,
        title: str,
        message: str,
        title_en: Optional[str] = None,
        message_en: Optional[str] = None,
        notification_type: str = NotificationType.INFO.value,
        priority: str = NotificationPriority.NORMAL.value,
        related_resource_type: Optional[str] = None,
        related_resource_id: Optional[int] = None,
        action_url: Optional[str] = None,
        expires_at: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Notification:
        """
        創建個人通知
        
        Args:
            user_id: 用戶ID
            title: 通知標題
            message: 通知內容
            title_en: 英文標題（可選）
            message_en: 英文內容（可選）
            notification_type: 通知類型
            priority: 優先級
            related_resource_type: 相關資源類型
            related_resource_id: 相關資源ID
            action_url: 行動連結
            expires_at: 過期時間
            metadata: 額外資料
        
        Returns:
            Notification: 創建的通知對象
        """
        notification = Notification(
            user_id=user_id,
            title=title,
            title_en=title_en,
            message=message,
            message_en=message_en,
            notification_type=notification_type,
            priority=priority,
            related_resource_type=related_resource_type,
            related_resource_id=related_resource_id,
            action_url=action_url,
            expires_at=expires_at,
            meta_data=metadata
        )
        
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)
        
        # Send real-time notification via WebSocket
        if self.websocket_manager:
            try:
                notification_data = {
                    "id": notification.id,
                    "title": notification.title,
                    "title_en": notification.title_en,
                    "message": notification.message,
                    "message_en": notification.message_en,
                    "notification_type": notification.notification_type,
                    "priority": notification.priority,
                    "action_url": notification.action_url,
                    "created_at": notification.created_at.isoformat()
                }
                await self.websocket_manager.send_notification(user_id, notification_data)
                
                # Update unread count
                unread_count = await self.getUnreadNotificationCount(user_id)
                await self.websocket_manager.send_unread_count_update(user_id, unread_count)
            except Exception as e:
                logger.error(f"Failed to send WebSocket notification: {e}")
        
        # Invalidate user cache
        if self.cache_service:
            await self.cache_service.invalidate_user_cache(user_id)
        
        return notification
    
    async def createSystemAnnouncement(
        self,
        title: str,
        message: str,
        title_en: Optional[str] = None,
        message_en: Optional[str] = None,
        notification_type: str = NotificationType.INFO.value,
        priority: str = NotificationPriority.NORMAL.value,
        action_url: Optional[str] = None,
        expires_at: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Notification:
        """
        創建系統公告（所有用戶可見）
        
        Args:
            title: 公告標題
            message: 公告內容
            title_en: 英文標題（可選）
            message_en: 英文內容（可選）
            notification_type: 通知類型
            priority: 優先級
            action_url: 行動連結
            expires_at: 過期時間
            metadata: 額外資料
        
        Returns:
            Notification: 創建的通知對象
        """
        notification = Notification(
            user_id=None,  # 系統公告設置為 None
            title=title,
            title_en=title_en,
            message=message,
            message_en=message_en,
            notification_type=notification_type,
            priority=priority,
            related_resource_type="system",
            action_url=action_url,
            expires_at=expires_at,
            meta_data=metadata
        )
        
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)
        
        # Send system announcement to all connected users via WebSocket
        if self.websocket_manager:
            try:
                announcement_data = {
                    "id": notification.id,
                    "title": notification.title,
                    "title_en": notification.title_en,
                    "message": notification.message,
                    "message_en": notification.message_en,
                    "notification_type": notification.notification_type,
                    "priority": notification.priority,
                    "action_url": notification.action_url,
                    "created_at": notification.created_at.isoformat()
                }
                await self.websocket_manager.send_system_announcement(announcement_data)
            except Exception as e:
                logger.error(f"Failed to send WebSocket system announcement: {e}")
        
        # Invalidate all user caches for system announcements
        if self.cache_service:
            await self.cache_service.invalidate_all_user_caches()
        
        return notification
    
    async def notifyApplicationStatusChange(
        self,
        user_id: int,
        application_id: int,
        new_status: str,
        application_title: str = "獎學金申請"
    ) -> Notification:
        """
        通知申請狀態變更
        
        Args:
            user_id: 申請人ID
            application_id: 申請ID
            new_status: 新狀態
            application_title: 申請標題
        
        Returns:
            Notification: 創建的通知對象
        """
        status_messages = {
            "under_review": {
                "zh": f"您的{application_title}正在審核中",
                "en": f"Your {application_title} is under review"
            },
            "approved": {
                "zh": f"恭喜！您的{application_title}已獲得核准",
                "en": f"Congratulations! Your {application_title} has been approved"
            },
            "rejected": {
                "zh": f"很抱歉，您的{application_title}未獲得核准",
                "en": f"We regret to inform you that your {application_title} was not approved"
            }
        }
        
        message_data = status_messages.get(new_status, {
            "zh": f"您的{application_title}狀態已更新",
            "en": f"Your {application_title} status has been updated"
        })
        
        notification_type = NotificationType.SUCCESS.value if new_status == "approved" else NotificationType.INFO.value
        priority = NotificationPriority.HIGH.value if new_status in ["approved", "rejected"] else NotificationPriority.NORMAL.value
        
        return await self.createUserNotification(
            user_id=user_id,
            title=f"{application_title}狀態更新",
            title_en=f"{application_title} Status Update",
            message=message_data["zh"],
            message_en=message_data["en"],
            notification_type=notification_type,
            priority=priority,
            related_resource_type="application",
            related_resource_id=application_id,
            action_url=f"/applications/{application_id}",
            metadata={"application_id": application_id, "status": new_status}
        )
    
    async def notifyDocumentRequired(
        self,
        user_id: int,
        application_id: int,
        required_documents: List[str],
        deadline: Optional[datetime] = None
    ) -> Notification:
        """
        通知需要補充文件
        
        Args:
            user_id: 申請人ID
            application_id: 申請ID
            required_documents: 需要的文件列表
            deadline: 截止時間
        
        Returns:
            Notification: 創建的通知對象
        """
        doc_list = "、".join(required_documents)
        deadline_text = f"，請於 {deadline.strftime('%Y/%m/%d')} 前上傳" if deadline else ""
        
        message = f"您的獎學金申請需要補充以下文件：{doc_list}{deadline_text}"
        message_en = f"Your scholarship application requires the following documents: {', '.join(required_documents)}"
        
        if deadline:
            message_en += f". Please upload by {deadline.strftime('%Y/%m/%d')}"
        
        return await self.createUserNotification(
            user_id=user_id,
            title="申請文件補充通知",
            title_en="Document Requirement Notification",
            message=message,
            message_en=message_en,
            notification_type=NotificationType.WARNING.value,
            priority=NotificationPriority.HIGH.value,
            related_resource_type="application",
            related_resource_id=application_id,
            action_url=f"/applications/{application_id}/documents",
            expires_at=deadline,
            metadata={
                "application_id": application_id,
                "required_documents": required_documents,
                "deadline": deadline.isoformat() if deadline else None
            }
        )
    
    async def notifyDeadlineReminder(
        self,
        user_id: int,
        title: str,
        title_en: Optional[str] = None,
        deadline: datetime = None,
        action_url: Optional[str] = None
    ) -> Notification:
        """
        發送截止日期提醒
        
        Args:
            user_id: 用戶ID
            title: 提醒標題
            title_en: 英文標題
            deadline: 截止時間
            action_url: 行動連結
        
        Returns:
            Notification: 創建的通知對象
        """
        days_left = (deadline - datetime.now()).days if deadline else 0
        
        if days_left > 1:
            message = f"{title}的截止日期將在 {days_left} 天後到期"
            message_en = f"The deadline for {title_en or title} is in {days_left} days"
        elif days_left == 1:
            message = f"{title}的截止日期將在明天到期"
            message_en = f"The deadline for {title_en or title} is tomorrow"
        else:
            message = f"{title}的截止日期已到期"
            message_en = f"The deadline for {title_en or title} has passed"
        
        priority = NotificationPriority.URGENT.value if days_left <= 1 else NotificationPriority.HIGH.value
        
        return await self.createUserNotification(
            user_id=user_id,
            title=f"截止日期提醒：{title}",
            title_en=f"Deadline Reminder: {title_en or title}",
            message=message,
            message_en=message_en,
            notification_type=NotificationType.REMINDER.value,
            priority=priority,
            action_url=action_url,
            expires_at=deadline + timedelta(days=7) if deadline else None,  # 過期後7天自動清理
            metadata={
                "reminder_type": "deadline",
                "deadline": deadline.isoformat() if deadline else None,
                "days_left": days_left
            }
        )
    
    async def bulkNotifyUsers(
        self,
        user_ids: List[int],
        title: str,
        message: str,
        title_en: Optional[str] = None,
        message_en: Optional[str] = None,
        notification_type: str = NotificationType.INFO.value,
        priority: str = NotificationPriority.NORMAL.value,
        action_url: Optional[str] = None,
        expires_at: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[Notification]:
        """
        批量發送通知給多個用戶
        
        Args:
            user_ids: 用戶ID列表
            title: 通知標題
            message: 通知內容
            其他參數與 createUserNotification 相同
        
        Returns:
            List[Notification]: 創建的通知對象列表
        """
        notifications = []
        
        for user_id in user_ids:
            notification = Notification(
                user_id=user_id,
                title=title,
                title_en=title_en,
                message=message,
                message_en=message_en,
                notification_type=notification_type,
                priority=priority,
                action_url=action_url,
                expires_at=expires_at,
                meta_data=metadata
            )
            notifications.append(notification)
        
        self.db.add_all(notifications)
        await self.db.commit()
        
        # 刷新所有對象
        for notification in notifications:
            await self.db.refresh(notification)
        
        return notifications
    
    # === 按用戶已讀狀態管理 === #
    
    async def getUserNotifications(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
        unread_only: bool = False,
        notification_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        獲取用戶的所有通知（個人通知 + 系統公告）及其已讀狀態
        
        Args:
            user_id: 用戶ID
            skip: 跳過數量
            limit: 限制數量
            unread_only: 只返回未讀通知
            notification_type: 通知類型過濾
        
        Returns:
            List[Dict]: 包含通知資料和已讀狀態的字典列表
        """
        
        # Try to get from cache first
        if self.cache_service:
            cached_notifications = await self.cache_service.get_user_notifications(
                user_id, skip, limit, unread_only, notification_type
            )
            if cached_notifications is not None:
                logger.debug(f"Retrieved notifications from cache for user {user_id}")
                return cached_notifications
        from sqlalchemy import and_, or_, desc, func, case
        from sqlalchemy.orm import joinedload, selectinload
        
        # 構建基礎查詢 - 獲取個人通知和系統公告
        base_query = select(Notification).where(
            or_(
                Notification.user_id == user_id,  # 個人通知
                Notification.user_id.is_(None)    # 系統公告
            )
        )
        
        # 添加類型過濾
        if notification_type:
            base_query = base_query.where(Notification.notification_type == notification_type)
        
        # 添加過期過濾
        base_query = base_query.where(
            or_(
                Notification.expires_at.is_(None),
                Notification.expires_at > datetime.now()
            )
        )
        
        # 如果只要未讀通知，需要複雜的查詢
        if unread_only:
            # 子查詢：獲取已讀的通知ID
            read_subquery = select(NotificationRead.notification_id).where(
                NotificationRead.user_id == user_id
            )
            
            base_query = base_query.where(
                and_(
                    # 個人通知未讀 OR 系統公告未讀
                    or_(
                        and_(
                            Notification.user_id == user_id,
                            Notification.is_read == False
                        ),
                        and_(
                            Notification.user_id.is_(None),
                            ~Notification.id.in_(read_subquery)
                        )
                    )
                )
            )
        
        # 添加排序和分頁 - 使用索引優化的排序
        query = base_query.order_by(
            desc(case((Notification.priority == 'urgent', 4), 
                     (Notification.priority == 'high', 3),
                     (Notification.priority == 'normal', 2),
                     else_=1)),
            desc(Notification.created_at),
            desc(Notification.id)  # Add ID for consistent ordering
        ).offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        notifications = result.scalars().all()
        
        # 獲取用戶的已讀記錄
        read_query = select(NotificationRead).where(
            and_(
                NotificationRead.user_id == user_id,
                NotificationRead.notification_id.in_([n.id for n in notifications])
            )
        )
        read_result = await self.db.execute(read_query)
        read_records = {r.notification_id: r for r in read_result.scalars().all()}
        
        # 組合結果
        result_list = []
        for notification in notifications:
            # 確定已讀狀態
            if notification.user_id == user_id:
                # 個人通知使用原有邏輯
                is_read = notification.is_read
                read_at = notification.read_at
            else:
                # 系統公告使用NotificationRead記錄
                read_record = read_records.get(notification.id)
                is_read = read_record is not None
                read_at = read_record.read_at if read_record else None
            
            result_list.append({
                "id": notification.id,
                "title": notification.title,
                "title_en": notification.title_en,
                "message": notification.message,
                "message_en": notification.message_en,
                "notification_type": notification.notification_type,
                "priority": notification.priority,
                "related_resource_type": notification.related_resource_type,
                "related_resource_id": notification.related_resource_id,
                "action_url": notification.action_url,
                "is_read": is_read,
                "is_dismissed": notification.is_dismissed,
                "scheduled_at": notification.scheduled_at,
                "expires_at": notification.expires_at,
                "read_at": read_at,
                "created_at": notification.created_at,
                "metadata": notification.meta_data
            })
        
        # Cache the results
        if self.cache_service:
            await self.cache_service.set_user_notifications(
                user_id, result_list, skip, limit, unread_only, notification_type
            )
        
        return result_list
    
    async def getUnreadNotificationCount(self, user_id: int) -> int:
        """
        獲取用戶未讀通知數量
        
        Args:
            user_id: 用戶ID
        
        Returns:
            int: 未讀通知數量
        """
        # Try to get from cache first
        if self.cache_service:
            cached_count = await self.cache_service.get_unread_count(user_id)
            if cached_count is not None:
                logger.debug(f"Retrieved unread count from cache for user {user_id}")
                return cached_count
        
        from sqlalchemy import and_, or_, func
        
        # 個人通知未讀數量
        personal_query = select(func.count(Notification.id)).where(
            and_(
                Notification.user_id == user_id,
                Notification.is_read == False,
                or_(
                    Notification.expires_at.is_(None),
                    Notification.expires_at > datetime.now()
                )
            )
        )
        
        # 系統公告未讀數量（未在NotificationRead中的）
        read_subquery = select(NotificationRead.notification_id).where(
            NotificationRead.user_id == user_id
        )
        
        system_query = select(func.count(Notification.id)).where(
            and_(
                Notification.user_id.is_(None),
                ~Notification.id.in_(read_subquery),
                or_(
                    Notification.expires_at.is_(None),
                    Notification.expires_at > datetime.now()
                )
            )
        )
        
        personal_result = await self.db.execute(personal_query)
        system_result = await self.db.execute(system_query)
        
        personal_count = personal_result.scalar() or 0
        system_count = system_result.scalar() or 0
        
        total_count = personal_count + system_count
        
        # Cache the result
        if self.cache_service:
            await self.cache_service.set_unread_count(user_id, total_count)
        
        return total_count
    
    async def markNotificationAsRead(self, notification_id: int, user_id: int) -> bool:
        """
        標記通知為已讀
        
        Args:
            notification_id: 通知ID
            user_id: 用戶ID
        
        Returns:
            bool: 操作是否成功
        """
        # 獲取通知
        query = select(Notification).where(Notification.id == notification_id)
        result = await self.db.execute(query)
        notification = result.scalar_one_or_none()
        
        if not notification:
            return False
        
        if notification.user_id == user_id:
            # 個人通知直接更新
            notification.mark_as_read()
            await self.db.commit()
        elif notification.user_id is None:
            # 系統公告創建或更新NotificationRead記錄
            read_query = select(NotificationRead).where(
                and_(
                    NotificationRead.notification_id == notification_id,
                    NotificationRead.user_id == user_id
                )
            )
            read_result = await self.db.execute(read_query)
            read_record = read_result.scalar_one_or_none()
            
            if not read_record:
                # 創建新的已讀記錄
                read_record = NotificationRead(
                    notification_id=notification_id,
                    user_id=user_id
                )
                self.db.add(read_record)
                await self.db.commit()
        
        # Send WebSocket notification update
        if self.websocket_manager:
            try:
                await self.websocket_manager.send_notification_update(
                    user_id, notification_id, "read"
                )
                
                # Update unread count
                unread_count = await self.getUnreadNotificationCount(user_id)
                await self.websocket_manager.send_unread_count_update(user_id, unread_count)
            except Exception as e:
                logger.error(f"Failed to send WebSocket notification update: {e}")
        
        # Invalidate user cache
        if self.cache_service:
            await self.cache_service.invalidate_user_cache(user_id)
        
        return True
    
    async def markAllNotificationsAsRead(self, user_id: int) -> int:
        """
        標記用戶的所有通知為已讀
        
        Args:
            user_id: 用戶ID
        
        Returns:
            int: 標記為已讀的通知數量
        """
        from sqlalchemy import and_, or_, update
        
        # 標記個人通知為已讀
        personal_update = update(Notification).where(
            and_(
                Notification.user_id == user_id,
                Notification.is_read == False
            )
        ).values(
            is_read=True,
            read_at=datetime.now()
        )
        
        personal_result = await self.db.execute(personal_update)
        personal_updated = personal_result.rowcount
        
        # 獲取用戶未讀的系統公告
        read_subquery = select(NotificationRead.notification_id).where(
            NotificationRead.user_id == user_id
        )
        
        system_query = select(Notification.id).where(
            and_(
                Notification.user_id.is_(None),
                ~Notification.id.in_(read_subquery),
                or_(
                    Notification.expires_at.is_(None),
                    Notification.expires_at > datetime.now()
                )
            )
        )
        
        system_result = await self.db.execute(system_query)
        system_notification_ids = [row[0] for row in system_result.fetchall()]
        
        # 為系統公告創建已讀記錄
        system_updated = 0
        if system_notification_ids:
            read_records = [
                NotificationRead(notification_id=nid, user_id=user_id)
                for nid in system_notification_ids
            ]
            self.db.add_all(read_records)
            system_updated = len(read_records)
        
        await self.db.commit()
        
        # Invalidate user cache after bulk update
        if self.cache_service:
            await self.cache_service.invalidate_user_cache(user_id)
        
        return personal_updated + system_updated
    
    async def bulkCreateNotifications(
        self,
        notifications_data: List[Dict[str, Any]],
        batch_size: int = 100
    ) -> List[Notification]:
        """
        批量創建通知，提高性能
        
        Args:
            notifications_data: 通知數據列表
            batch_size: 批次大小
        
        Returns:
            List[Notification]: 創建的通知列表
        """
        created_notifications = []
        
        # Process in batches
        for i in range(0, len(notifications_data), batch_size):
            batch = notifications_data[i:i + batch_size]
            batch_notifications = []
            
            for data in batch:
                notification = Notification(**data)
                batch_notifications.append(notification)
            
            # Add batch to session
            self.db.add_all(batch_notifications)
            await self.db.commit()
            
            # Refresh all notifications in batch
            for notification in batch_notifications:
                await self.db.refresh(notification)
            
            created_notifications.extend(batch_notifications)
            
            # Send WebSocket notifications for each batch
            if self.websocket_manager:
                await self._send_bulk_websocket_notifications(batch_notifications)
        
        # Invalidate relevant caches
        if self.cache_service:
            # Determine which users to invalidate cache for
            user_ids = set()
            has_system_announcements = False
            
            for notification in created_notifications:
                if notification.user_id:
                    user_ids.add(notification.user_id)
                else:
                    has_system_announcements = True
            
            # Invalidate individual user caches
            for user_id in user_ids:
                await self.cache_service.invalidate_user_cache(user_id)
            
            # If there are system announcements, invalidate all user caches
            if has_system_announcements:
                await self.cache_service.invalidate_all_user_caches()
        
        return created_notifications
    
    async def _send_bulk_websocket_notifications(self, notifications: List[Notification]):
        """Send WebSocket notifications for a batch of notifications"""
        try:
            for notification in notifications:
                notification_data = {
                    "id": notification.id,
                    "title": notification.title,
                    "title_en": notification.title_en,
                    "message": notification.message,
                    "message_en": notification.message_en,
                    "notification_type": notification.notification_type,
                    "priority": notification.priority,
                    "action_url": notification.action_url,
                    "created_at": notification.created_at.isoformat()
                }
                
                if notification.user_id:
                    # Personal notification
                    await self.websocket_manager.send_notification(notification.user_id, notification_data)
                else:
                    # System announcement
                    await self.websocket_manager.send_system_announcement(notification_data)
        
        except Exception as e:
            logger.error(f"Failed to send bulk WebSocket notifications: {e}")
    
    async def cleanupExpiredNotifications(self, batch_size: int = 1000) -> int:
        """
        清理過期通知
        
        Args:
            batch_size: 批次大小
        
        Returns:
            int: 清理的通知數量
        """
        from sqlalchemy import and_
        
        # Find expired notifications
        expired_query = select(Notification.id).where(
            and_(
                Notification.expires_at.is_not(None),
                Notification.expires_at < datetime.now()
            )
        ).limit(batch_size)
        
        result = await self.db.execute(expired_query)
        expired_ids = [row[0] for row in result.fetchall()]
        
        if not expired_ids:
            return 0
        
        # Delete expired notifications
        delete_query = delete(Notification).where(Notification.id.in_(expired_ids))
        delete_result = await self.db.execute(delete_query)
        await self.db.commit()
        
        deleted_count = delete_result.rowcount
        
        # Invalidate all user caches after cleanup
        if self.cache_service and deleted_count > 0:
            await self.cache_service.invalidate_all_user_caches()
        
        logger.info(f"Cleaned up {deleted_count} expired notifications")
        return deleted_count
    
    async def getNotificationStats(self) -> Dict[str, Any]:
        """
        獲取通知統計資訊
        
        Returns:
            Dict: 統計資訊
        """
        from sqlalchemy import and_, or_
        
        # Total notifications
        total_query = select(func.count(Notification.id))
        total_result = await self.db.execute(total_query)
        total = total_result.scalar() or 0
        
        # Unread notifications
        unread_query = select(func.count(Notification.id)).where(
            Notification.is_read == False
        )
        unread_result = await self.db.execute(unread_query)
        unread = unread_result.scalar() or 0
        
        # System announcements
        system_query = select(func.count(Notification.id)).where(
            Notification.user_id.is_(None)
        )
        system_result = await self.db.execute(system_query)
        system = system_result.scalar() or 0
        
        # By priority
        priority_query = select(
            Notification.priority,
            func.count(Notification.id)
        ).group_by(Notification.priority)
        priority_result = await self.db.execute(priority_query)
        priority_stats = {row[0]: row[1] for row in priority_result.fetchall()}
        
        # By type
        type_query = select(
            Notification.notification_type,
            func.count(Notification.id)
        ).group_by(Notification.notification_type)
        type_result = await self.db.execute(type_query)
        type_stats = {row[0]: row[1] for row in type_result.fetchall()}
        
        return {
            "total_notifications": total,
            "unread_notifications": unread,
            "system_announcements": system,
            "personal_notifications": total - system,
            "by_priority": priority_stats,
            "by_type": type_stats,
            "read_percentage": round((total - unread) / total * 100, 2) if total > 0 else 0
        } 