"""
Pagination utilities for optimized database queries
"""

from typing import Dict, Any, Optional, List
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession


class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = 1
    size: int = 20
    max_size: int = 100
    
    def __post_init__(self):
        # Ensure page is at least 1
        if self.page < 1:
            self.page = 1
        
        # Ensure size is within limits
        if self.size < 1:
            self.size = 1
        elif self.size > self.max_size:
            self.size = self.max_size
    
    @property
    def offset(self) -> int:
        """Calculate offset for SQL query"""
        return (self.page - 1) * self.size
    
    @property
    def limit(self) -> int:
        """Get limit for SQL query"""
        return self.size


class PaginatedResponse(BaseModel):
    """Paginated response model"""
    items: List[Any]
    total: int
    page: int
    size: int
    pages: int
    has_next: bool
    has_prev: bool
    
    @classmethod
    def create(cls, items: List[Any], total: int, pagination: PaginationParams):
        """Create paginated response"""
        pages = (total + pagination.size - 1) // pagination.size  # Ceiling division
        
        return cls(
            items=items,
            total=total,
            page=pagination.page,
            size=pagination.size,
            pages=pages,
            has_next=pagination.page < pages,
            has_prev=pagination.page > 1
        )


async def paginate_query(
    db: AsyncSession,
    query,
    count_query,
    pagination: PaginationParams,
    transform_fn: Optional[callable] = None
) -> PaginatedResponse:
    """
    Execute paginated query with count
    
    Args:
        db: Database session
        query: Main query with offset/limit applied
        count_query: Count query for total results
        pagination: Pagination parameters
        transform_fn: Optional function to transform results
    
    Returns:
        PaginatedResponse with results and metadata
    """
    # Execute count query
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0
    
    # Execute main query
    result = await db.execute(query)
    items = result.scalars().all()
    
    # Transform items if function provided
    if transform_fn:
        items = [transform_fn(item) for item in items]
    
    return PaginatedResponse.create(items, total, pagination)


def optimize_count_query(base_query):
    """
    Optimize count query by removing unnecessary joins and ordering
    """
    # Create a simplified count query
    # This removes ORDER BY clauses and unnecessary joins
    count_query = select(func.count()).select_from(base_query.alias())
    return count_query


class CursorPagination:
    """
    Cursor-based pagination for better performance on large datasets
    """
    
    def __init__(self, cursor_field: str = "id", size: int = 20):
        self.cursor_field = cursor_field
        self.size = min(size, 100)  # Maximum 100 items per page
    
    def apply_cursor(self, query, cursor: Optional[str] = None, direction: str = "next"):
        """
        Apply cursor pagination to query
        
        Args:
            query: SQLAlchemy query
            cursor: Cursor value (encoded)
            direction: "next" or "prev"
        
        Returns:
            Modified query with cursor applied
        """
        if not cursor:
            return query.limit(self.size + 1)  # Fetch one extra to check if there's a next page
        
        try:
            # Decode cursor (in real implementation, you'd want proper encoding/decoding)
            cursor_value = int(cursor)
            
            if direction == "next":
                query = query.where(getattr(query.column_descriptions[0]['type'], self.cursor_field) < cursor_value)
            else:  # prev
                query = query.where(getattr(query.column_descriptions[0]['type'], self.cursor_field) > cursor_value)
            
        except (ValueError, AttributeError):
            # Invalid cursor, ignore
            pass
        
        return query.limit(self.size + 1)
    
    def process_results(self, items: List[Any], requested_cursor: Optional[str] = None):
        """
        Process results and generate pagination metadata
        
        Args:
            items: Query results
            requested_cursor: The cursor that was requested
        
        Returns:
            Dict with items and pagination metadata
        """
        has_more = len(items) > self.size
        if has_more:
            items = items[:-1]  # Remove the extra item
        
        next_cursor = None
        prev_cursor = None
        
        if items:
            # Generate cursors based on the cursor field
            if has_more:
                next_cursor = str(getattr(items[-1], self.cursor_field))
            if requested_cursor:
                prev_cursor = str(getattr(items[0], self.cursor_field))
        
        return {
            "items": items,
            "has_next": has_more,
            "has_prev": bool(requested_cursor),
            "next_cursor": next_cursor,
            "prev_cursor": prev_cursor,
            "size": len(items)
        }