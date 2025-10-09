/**
 * Compatibility layer between openapi-fetch and ApiResponse format
 *
 * Converts openapi-fetch responses to the standard ApiResponse format
 * used throughout the application, maintaining backward compatibility.
 */

import type { ApiResponse } from '../api.legacy';

/**
 * openapi-fetch response type
 */
export interface FetchResponse<T> {
  data?: T;
  error?: {
    detail?: string;
    message?: string;
    [key: string]: any;
  };
  response: Response;
}

/**
 * Convert openapi-fetch response to ApiResponse format
 *
 * Handles:
 * - Success responses (data present)
 * - Error responses (error present)
 * - HTTP status codes
 * - Error message extraction
 *
 * @param response - openapi-fetch response object
 * @returns ApiResponse<T> in standard format
 */
export function toApiResponse<T>(
  response: FetchResponse<T>
): ApiResponse<T> {
  // Handle error responses
  if (response.error) {
    const errorMessage =
      response.error.detail ||
      response.error.message ||
      `Request failed with status ${response.response.status}`;

    return {
      success: false,
      message: errorMessage,
      data: undefined,
    };
  }

  // Handle success responses
  // Backend already returns ApiResponse format {success, message, data}
  if (response.data && typeof response.data === 'object') {
    const data = response.data as any;

    // If backend returns ApiResponse format, use it directly
    if ('success' in data && 'data' in data) {
      return {
        success: data.success,
        message: data.message || 'Request completed successfully',
        data: data.data as T,
      };
    }
  }

  // Fallback: wrap raw data in ApiResponse format
  return {
    success: true,
    message: 'Request completed successfully',
    data: response.data as T,
  };
}

/**
 * Extract error message from openapi-fetch response
 *
 * @param response - openapi-fetch response object
 * @returns Error message string
 */
export function extractErrorMessage(response: FetchResponse<any>): string {
  if (response.error) {
    return (
      response.error.detail ||
      response.error.message ||
      `Request failed with status ${response.response.status}`
    );
  }

  if (!response.response.ok) {
    return `Request failed with status ${response.response.status}`;
  }

  return 'Unknown error occurred';
}

/**
 * Check if response is successful
 *
 * @param response - openapi-fetch response object
 * @returns true if response is successful
 */
export function isSuccessResponse<T>(
  response: FetchResponse<T>
): response is FetchResponse<T> & { data: T } {
  return !response.error && response.response.ok && response.data !== undefined;
}

/**
 * Type guard for error responses
 *
 * @param response - openapi-fetch response object
 * @returns true if response is an error
 */
export function isErrorResponse<T>(
  response: FetchResponse<T>
): response is FetchResponse<T> & { error: NonNullable<FetchResponse<T>['error']> } {
  return !!response.error || !response.response.ok;
}
