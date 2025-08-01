"""
Notification service for creating and managing user notifications
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.notification import Notification, NotificationRead, NotificationType, NotificationPriority
from app.models.notification_template import NotificationTemplate, NotificationTemplateType
from app.models.user import User
from app.services.notification_template_service import NotificationTemplateService
from app.services.notification_template_variable_service import NotificationTemplateVariableService


class NotificationService:
    """Service for managing notifications"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.template_service = NotificationTemplateService(db)
        self.variable_service = NotificationTemplateVariableService(db)
    
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
        
        # 添加排序和分頁
        query = base_query.order_by(
            desc(case((Notification.priority == 'urgent', 4), 
                     (Notification.priority == 'high', 3),
                     (Notification.priority == 'normal', 2),
                     else_=1)),
            desc(Notification.created_at)
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
        
        return result_list
    
    async def getUnreadNotificationCount(self, user_id: int) -> int:
        """
        獲取用戶未讀通知數量
        
        Args:
            user_id: 用戶ID
        
        Returns:
            int: 未讀通知數量
        """
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
        
        return personal_count + system_count
    
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
        return personal_updated + system_updated
    
    # === Template-based notification methods === #
    
    async def createNotificationFromTemplate(
        self,
        user_id: int,
        template_type: str,
        scholarship_type_id: Optional[int] = None,
        context_data: Optional[Dict[str, Any]] = None,
        language: str = "zh",
        expires_at: Optional[datetime] = None,
        send_email: bool = False,
        related_resource_type: Optional[str] = None,
        related_resource_id: Optional[int] = None,
        action_url: Optional[str] = None
    ) -> Optional[Notification]:
        """
        Create a notification using a template
        
        Args:
            user_id: Target user ID
            template_type: Type of template to use
            scholarship_type_id: Scholarship type ID (for template selection)
            context_data: Data to populate template variables
            language: Language for template selection
            expires_at: When notification expires
            send_email: Whether to send email notification
            related_resource_type: Type of related resource
            related_resource_id: ID of related resource
            action_url: Action URL for notification
            
        Returns:
            Created notification or None if template not found
        """
        # Get the appropriate template
        template = await self.template_service.get_default_template(
            scholarship_type_id, 
            template_type
        )
        
        if not template:
            # Fallback to basic notification if no template found
            return await self.createUserNotification(
                user_id=user_id,
                title=f"Notification: {template_type}",
                message="A notification has been generated for you.",
                notification_type=NotificationType.INFO.value,
                expires_at=expires_at,
                related_resource_type=related_resource_type,
                related_resource_id=related_resource_id,
                action_url=action_url
            )
        
        # Render the template
        context = context_data or {}
        subject, body, missing_vars, invalid_vars = await self.variable_service.render_template(
            template, context, language
        )
        
        # Determine notification type based on template type
        notification_type = self._get_notification_type_for_template(template_type)
        priority = self._get_priority_for_template(template_type)
        
        # Create the notification
        return await self.createUserNotification(
            user_id=user_id,
            title=subject,
            message=body,
            title_en=subject if language == "en" else None,
            message_en=body if language == "en" else None,
            notification_type=notification_type,
            priority=priority,
            related_resource_type=related_resource_type,
            related_resource_id=related_resource_id,
            action_url=action_url,
            expires_at=expires_at,
            send_email=send_email,
            metadata={
                "template_id": template.id,
                "template_type": template_type,
                "missing_variables": missing_vars,
                "invalid_variables": invalid_vars,
                "context_data": context_data
            }
        )

    async def notifyApplicationStatusChangeWithTemplate(
        self,
        user_id: int,
        application_id: int,
        new_status: str,
        scholarship_type_id: int,
        language: str = "zh"
    ) -> Optional[Notification]:
        """
        Notify application status change using template
        """
        # Build context data for the application
        context = await self.variable_service.build_context_for_application(
            application_id,
            NotificationTemplateType.APPLICATION.value,
            {"application_status": new_status}
        )
        
        return await self.createNotificationFromTemplate(
            user_id=user_id,
            template_type=NotificationTemplateType.APPLICATION.value,
            scholarship_type_id=scholarship_type_id,
            context_data=context,
            language=language,
            related_resource_type="application",
            related_resource_id=application_id,
            action_url=f"/applications/{application_id}",
            send_email=True
        )

    async def notifyWhitelistWithTemplate(
        self,
        user_id: int,
        scholarship_type_id: int,
        student_name: str,
        student_id: str,
        language: str = "zh"
    ) -> Optional[Notification]:
        """
        Notify whitelist eligibility using template
        """
        # Build context data
        context = await self.variable_service.build_context_for_scholarship(
            scholarship_type_id,
            NotificationTemplateType.WHITELIST.value,
            {
                "student_name": student_name,
                "student_id": student_id
            }
        )
        
        return await self.createNotificationFromTemplate(
            user_id=user_id,
            template_type=NotificationTemplateType.WHITELIST.value,
            scholarship_type_id=scholarship_type_id,
            context_data=context,
            language=language,
            related_resource_type="scholarship",
            related_resource_id=scholarship_type_id,
            send_email=True
        )

    async def notifyRecommendationNeededWithTemplate(
        self,
        professor_user_id: int,
        application_id: int,
        scholarship_type_id: int,
        student_name: str,
        student_id: str,
        professor_name: str,
        language: str = "zh"
    ) -> Optional[Notification]:
        """
        Notify professor that recommendation is needed using template
        """
        # Build context data
        context = await self.variable_service.build_context_for_application(
            application_id,
            NotificationTemplateType.RECOMMENDATION.value,
            {
                "professor_name": professor_name,
                "student_name": student_name,
                "student_id": student_id
            }
        )
        
        return await self.createNotificationFromTemplate(
            user_id=professor_user_id,
            template_type=NotificationTemplateType.RECOMMENDATION.value,
            scholarship_type_id=scholarship_type_id,
            context_data=context,
            language=language,
            related_resource_type="application",
            related_resource_id=application_id,
            action_url=f"/applications/{application_id}/recommend",
            send_email=True
        )

    async def notifyReviewNeededWithTemplate(
        self,
        reviewer_user_id: int,
        application_id: int,
        scholarship_type_id: int,
        reviewer_name: str,
        review_stage: str = "Initial Review",
        language: str = "zh"
    ) -> Optional[Notification]:
        """
        Notify reviewer that review is needed using template
        """
        # Build context data
        context = await self.variable_service.build_context_for_application(
            application_id,
            NotificationTemplateType.REVIEW.value,
            {
                "reviewer_name": reviewer_name,
                "review_stage": review_stage
            }
        )
        
        return await self.createNotificationFromTemplate(
            user_id=reviewer_user_id,
            template_type=NotificationTemplateType.REVIEW.value,
            scholarship_type_id=scholarship_type_id,
            context_data=context,
            language=language,
            related_resource_type="application",
            related_resource_id=application_id,
            action_url=f"/applications/{application_id}/review",
            send_email=True
        )

    async def notifyDocumentRequiredWithTemplate(
        self,
        user_id: int,
        application_id: int,
        scholarship_type_id: int,
        required_documents: List[str],
        deadline: Optional[datetime] = None,
        language: str = "zh"
    ) -> Optional[Notification]:
        """
        Notify document requirement using template
        """
        # Build context data
        context = await self.variable_service.build_context_for_application(
            application_id,
            NotificationTemplateType.SUPPLEMENTARY_DOCUMENT.value,
            {
                "required_documents": "、".join(required_documents),
                "document_deadline": deadline.strftime('%Y/%m/%d') if deadline else ""
            }
        )
        
        return await self.createNotificationFromTemplate(
            user_id=user_id,
            template_type=NotificationTemplateType.SUPPLEMENTARY_DOCUMENT.value,
            scholarship_type_id=scholarship_type_id,
            context_data=context,
            language=language,
            expires_at=deadline,
            related_resource_type="application",
            related_resource_id=application_id,
            action_url=f"/applications/{application_id}/documents",
            send_email=True
        )

    async def notifyResultWithTemplate(
        self,
        user_id: int,
        application_id: int,
        scholarship_type_id: int,
        result: str,
        award_amount: Optional[float] = None,
        language: str = "zh"
    ) -> Optional[Notification]:
        """
        Notify application result using template
        """
        # Build context data
        context = await self.variable_service.build_context_for_application(
            application_id,
            NotificationTemplateType.RESULT.value,
            {
                "result": result,
                "award_amount": f"NT${award_amount:,.0f}" if award_amount else "N/A"
            }
        )
        
        notification_type = NotificationType.SUCCESS.value if result == "核准" else NotificationType.INFO.value
        
        return await self.createNotificationFromTemplate(
            user_id=user_id,
            template_type=NotificationTemplateType.RESULT.value,
            scholarship_type_id=scholarship_type_id,
            context_data=context,
            language=language,
            related_resource_type="application",
            related_resource_id=application_id,
            action_url=f"/applications/{application_id}",
            send_email=True
        )

    # Private helper methods for template-based notifications
    
    def _get_notification_type_for_template(self, template_type: str) -> str:
        """Get appropriate notification type for template type"""
        template_notification_map = {
            NotificationTemplateType.WHITELIST.value: NotificationType.INFO.value,
            NotificationTemplateType.APPLICATION.value: NotificationType.INFO.value,
            NotificationTemplateType.RECOMMENDATION.value: NotificationType.WARNING.value,
            NotificationTemplateType.REVIEW.value: NotificationType.WARNING.value,
            NotificationTemplateType.SUPPLEMENTARY_DOCUMENT.value: NotificationType.WARNING.value,
            NotificationTemplateType.RESULT.value: NotificationType.INFO.value,
            NotificationTemplateType.ROSTER_CREATION.value: NotificationType.SUCCESS.value,
        }
        
        return template_notification_map.get(template_type, NotificationType.INFO.value)

    def _get_priority_for_template(self, template_type: str) -> str:
        """Get appropriate priority for template type"""
        template_priority_map = {
            NotificationTemplateType.WHITELIST.value: NotificationPriority.HIGH.value,
            NotificationTemplateType.APPLICATION.value: NotificationPriority.NORMAL.value,
            NotificationTemplateType.RECOMMENDATION.value: NotificationPriority.HIGH.value,
            NotificationTemplateType.REVIEW.value: NotificationPriority.HIGH.value,
            NotificationTemplateType.SUPPLEMENTARY_DOCUMENT.value: NotificationPriority.HIGH.value,
            NotificationTemplateType.RESULT.value: NotificationPriority.HIGH.value,
            NotificationTemplateType.ROSTER_CREATION.value: NotificationPriority.NORMAL.value,
        }
        
        return template_priority_map.get(template_type, NotificationPriority.NORMAL.value) 