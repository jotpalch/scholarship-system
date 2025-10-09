"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { FileUpload } from "@/components/file-upload";
import type { Application } from "@/lib/api";

interface BatchApplicationFileUploadProps {
  applicationIds: number[];
  onUploadComplete?: () => void;
  locale?: "zh" | "en";
}

interface ApplicationUploadState {
  application: Application | null;
  loading: boolean;
  selectedDocumentType: string;
  files: File[];
  uploading: boolean;
  uploadStatus: "idle" | "success" | "error";
  uploadMessage: string;
}

const DOCUMENT_TYPES = [
  { value: "transcript", label_zh: "成績單", label_en: "Transcript" },
  { value: "id_card", label_zh: "身分證", label_en: "ID Card" },
  { value: "bank_book", label_zh: "存摺封面", label_en: "Bank Book" },
  { value: "recommendation", label_zh: "推薦信", label_en: "Recommendation Letter" },
  { value: "research_plan", label_zh: "研究計畫", label_en: "Research Plan" },
  { value: "other", label_zh: "其他", label_en: "Other" },
];

interface DocumentType {
  value: string;
  label_zh: string;
  label_en: string;
}

export function BatchApplicationFileUpload({
  applicationIds,
  onUploadComplete,
  locale = "zh",
}: BatchApplicationFileUploadProps) {
  const [uploadStates, setUploadStates] = useState<Map<number, ApplicationUploadState>>(
    new Map()
  );
  const [error, setError] = useState<string | null>(null);
  const [scholarshipDocuments, setScholarshipDocuments] = useState<DocumentType[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  // Fetch application details on mount
  useEffect(() => {
    const fetchApplications = async () => {
      const newStates = new Map<number, ApplicationUploadState>();

      for (const appId of applicationIds) {
        newStates.set(appId, {
          application: null,
          loading: true,
          selectedDocumentType: "",
          files: [],
          uploading: false,
          uploadStatus: "idle",
          uploadMessage: "",
        });
      }
      setUploadStates(newStates);

      // Fetch each application
      for (const appId of applicationIds) {
        try {
          const response = await apiClient.applications.getApplicationById(appId);
          if (response.success && response.data) {
            setUploadStates((prev) => {
              const updated = new Map(prev);
              const state = updated.get(appId);
              if (state) {
                updated.set(appId, {
                  ...state,
                  application: response.data || null,
                  loading: false,
                });
              }
              return updated;
            });
          }
        } catch (err) {
          console.error(`Failed to fetch application ${appId}:`, err);
          setUploadStates((prev) => {
            const updated = new Map(prev);
            const state = updated.get(appId);
            if (state) {
              updated.set(appId, {
                ...state,
                loading: false,
              });
            }
            return updated;
          });
        }
      }
    };

    if (applicationIds.length > 0) {
      fetchApplications();
    }
  }, [applicationIds]);

  // Fetch scholarship-specific document types
  useEffect(() => {
    const fetchScholarshipDocuments = async () => {
      // Get scholarship type from the first application
      const firstState = Array.from(uploadStates.values()).find(
        (state) => state.application && !state.loading
      );

      if (!firstState || !firstState.application) {
        // No application loaded yet, use fallback
        setScholarshipDocuments(DOCUMENT_TYPES);
        return;
      }

      const scholarshipType = firstState.application.scholarship_type;
      if (!scholarshipType) {
        setScholarshipDocuments(DOCUMENT_TYPES);
        return;
      }

      setDocumentsLoading(true);
      try {
        const response = await apiClient.applicationFields.getDocuments(scholarshipType);
        if (response.success && response.data && response.data.length > 0) {
          // Transform API response to DocumentType format
          const transformedDocs: DocumentType[] = response.data.map((doc: any) => ({
            value: doc.document_name.toLowerCase().replace(/\s+/g, "_"),
            label_zh: doc.document_name,
            label_en: doc.document_name_en || doc.document_name,
          }));
          setScholarshipDocuments(transformedDocs);
        } else {
          // Fallback to default types if no documents found
          setScholarshipDocuments(DOCUMENT_TYPES);
        }
      } catch (err) {
        console.error("Failed to fetch scholarship documents:", err);
        // Fallback to default types on error
        setScholarshipDocuments(DOCUMENT_TYPES);
      } finally {
        setDocumentsLoading(false);
      }
    };

    fetchScholarshipDocuments();
  }, [uploadStates]);

  const handleDocumentTypeChange = (appId: number, documentType: string) => {
    setUploadStates((prev) => {
      const updated = new Map(prev);
      const state = updated.get(appId);
      if (state) {
        updated.set(appId, {
          ...state,
          selectedDocumentType: documentType,
        });
      }
      return updated;
    });
  };

  const handleFilesChange = (appId: number, files: File[]) => {
    setUploadStates((prev) => {
      const updated = new Map(prev);
      const state = updated.get(appId);
      if (state) {
        updated.set(appId, {
          ...state,
          files,
        });
      }
      return updated;
    });
  };

  const handleUpload = async (appId: number) => {
    const state = uploadStates.get(appId);
    if (!state || state.files.length === 0) {
      setError(locale === "zh" ? "請選擇檔案" : "Please select files");
      return;
    }

    if (!state.selectedDocumentType) {
      setError(locale === "zh" ? "請選擇文件類型" : "Please select document type");
      return;
    }

    setUploadStates((prev) => {
      const updated = new Map(prev);
      updated.set(appId, {
        ...state,
        uploading: true,
        uploadStatus: "idle",
        uploadMessage: "",
      });
      return updated;
    });

    setError(null);

    try {
      // Upload each file
      const uploadPromises = state.files.map((file) =>
        apiClient.applications.uploadDocument(appId, file, state.selectedDocumentType)
      );

      const results = await Promise.allSettled(uploadPromises);

      const allSuccess = results.every((result) => result.status === "fulfilled");

      setUploadStates((prev) => {
        const updated = new Map(prev);
        const currentState = updated.get(appId);
        if (currentState) {
          updated.set(appId, {
            ...currentState,
            uploading: false,
            uploadStatus: allSuccess ? "success" : "error",
            uploadMessage: allSuccess
              ? locale === "zh"
                ? `成功上傳 ${state.files.length} 個檔案`
                : `Successfully uploaded ${state.files.length} file(s)`
              : locale === "zh"
              ? "部分檔案上傳失敗"
              : "Some files failed to upload",
            files: allSuccess ? [] : currentState.files,
          });
        }
        return updated;
      });

      if (allSuccess && onUploadComplete) {
        onUploadComplete();
      }
    } catch (err: any) {
      setUploadStates((prev) => {
        const updated = new Map(prev);
        const currentState = updated.get(appId);
        if (currentState) {
          updated.set(appId, {
            ...currentState,
            uploading: false,
            uploadStatus: "error",
            uploadMessage:
              err.message ||
              (locale === "zh" ? "上傳失敗" : "Upload failed"),
          });
        }
        return updated;
      });
    }
  };

  const handleDelete = async (appId: number) => {
    if (
      !window.confirm(
        locale === "zh"
          ? "確定要刪除此申請嗎？此操作無法復原。"
          : "Are you sure you want to delete this application? This action cannot be undone."
      )
    ) {
      return;
    }

    setError(null);

    try {
      const response = await apiClient.applications.deleteApplication(appId);

      if (response.success) {
        // Remove from upload states
        setUploadStates((prev) => {
          const updated = new Map(prev);
          updated.delete(appId);
          return updated;
        });

        // Notify completion (optional - refresh parent data)
        if (onUploadComplete) {
          onUploadComplete();
        }
      } else {
        setError(
          response.message ||
            (locale === "zh" ? "刪除失敗" : "Failed to delete application")
        );
      }
    } catch (err: any) {
      setError(
        err.message ||
          (locale === "zh"
            ? "刪除時發生錯誤"
            : "Error occurred during deletion")
      );
    }
  };

  const getDocumentTypeLabel = (value: string) => {
    const docType = scholarshipDocuments.find((type) => type.value === value);
    return docType ? (locale === "zh" ? docType.label_zh : docType.label_en) : value;
  };

  if (applicationIds.length === 0) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {locale === "zh"
            ? "沒有可用的申請記錄"
            : "No applications available"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">
                {locale === "zh" ? "學號" : "Student ID"}
              </TableHead>
              <TableHead className="w-[100px]">
                {locale === "zh" ? "申請 ID" : "App ID"}
              </TableHead>
              <TableHead className="w-[180px]">
                {locale === "zh" ? "文件類型" : "Document Type"}
              </TableHead>
              <TableHead>
                {locale === "zh" ? "檔案" : "File"}
              </TableHead>
              <TableHead className="w-[200px] text-right">
                {locale === "zh" ? "操作" : "Actions"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from(uploadStates.entries()).map(([appId, state]) => (
              <TableRow key={appId} className={
                state.uploadStatus === "success" ? "bg-green-50" :
                state.uploadStatus === "error" ? "bg-red-50" : ""
              }>
                {/* Student ID */}
                <TableCell className="font-mono text-sm">
                  {state.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : state.application ? (
                    state.application.student_id
                  ) : (
                    <span className="text-red-500 text-xs">
                      {locale === "zh" ? "載入失敗" : "Error"}
                    </span>
                  )}
                </TableCell>

                {/* Application ID */}
                <TableCell className="text-sm text-gray-600">
                  {appId}
                </TableCell>

                {/* Document Type Selector */}
                <TableCell>
                  {!state.loading && state.application && (
                    <Select
                      value={state.selectedDocumentType}
                      onValueChange={(value) => handleDocumentTypeChange(appId, value)}
                      disabled={state.uploading || documentsLoading}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue
                          placeholder={
                            documentsLoading
                              ? locale === "zh"
                                ? "載入中..."
                                : "Loading..."
                              : locale === "zh"
                              ? "選擇類型"
                              : "Select type"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {scholarshipDocuments.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {locale === "zh" ? type.label_zh : type.label_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </TableCell>

                {/* File Upload */}
                <TableCell>
                  {!state.loading && state.application && state.selectedDocumentType && (
                    <div className="flex items-center gap-2">
                      <FileUpload
                        onFilesChange={(files) => handleFilesChange(appId, files)}
                        acceptedTypes={[".pdf", ".jpg", ".jpeg", ".png"]}
                        maxSize={10 * 1024 * 1024}
                        maxFiles={3}
                        fileType={state.selectedDocumentType}
                        locale={locale}
                        initialFiles={state.files}
                      />
                      {state.uploadMessage && (
                        <div className="flex items-center gap-1 text-xs ml-2">
                          {state.uploadStatus === "success" ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : state.uploadStatus === "error" ? (
                            <XCircle className="h-3 w-3 text-red-600" />
                          ) : null}
                          <span className={
                            state.uploadStatus === "success" ? "text-green-600" :
                            state.uploadStatus === "error" ? "text-red-600" : ""
                          }>
                            {state.uploadMessage}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  {!state.loading && state.application && (
                    <div className="flex items-center justify-end gap-2">
                      {state.selectedDocumentType && state.files.length > 0 && (
                        <Button
                          onClick={() => handleUpload(appId)}
                          disabled={state.uploading}
                          size="sm"
                          className="h-8"
                        >
                          {state.uploading ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                            </>
                          ) : (
                            <>
                              <Upload className="h-3 w-3 mr-1" />
                              {locale === "zh" ? "上傳" : "Upload"}
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(appId)}
                        className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        {locale === "zh" ? "刪除申請" : "Delete Application"}
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-gray-500">
        {locale === "zh"
          ? `總計 ${applicationIds.length} 個申請`
          : `Total ${applicationIds.length} applications`}
      </div>
    </div>
  );
}
