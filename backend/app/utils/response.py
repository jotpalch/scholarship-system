from typing import Any, List, Optional

from app.schemas.response import ApiResponse


def api_response(
    *,
    data: Optional[Any] = None,
    message: str = "Success",
    success: bool = True,
    errors: Optional[List[str]] = None,
    trace_id: Optional[str] = None,
):
    """Helper to create standardized API responses.

    Args:
        data: The payload data.
        message: A human-readable message.
        success: Whether the request is successful.
        errors: Optional list of error strings.
        trace_id: Optional trace identifier for request tracking.

    Returns:
        ApiResponse object ready to be returned by FastAPI endpoints.
    """
    return ApiResponse(
        success=success,
        message=message,
        data=data,
        errors=errors,
        trace_id=trace_id,
    )