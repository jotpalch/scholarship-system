"use client";

import React, { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
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

export function BatchApplicationFileUpload({
  applicationIds,
  onUploadComplete,
  locale = "zh",
}: BatchApplicationFileUploadProps) {
  const [uploadStates, setUploadStates] = useState<Map<number, ApplicationUploadState>>(
    new Map()
  );
  const [error, setError] = useState<string | null>(null);

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

  const getDocumentTypeLabel = (value: string) => {
    const docType = DOCUMENT_TYPES.find((type) => type.value === value);
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {locale === "zh" ? "個別上傳申請文件" : "Upload Application Documents Individually"}
        </CardTitle>
        <CardDescription>
          {locale === "zh"
            ? `為 ${applicationIds.length} 個申請分別上傳文件`
            : `Upload documents for ${applicationIds.length} applications individually`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {Array.from(uploadStates.entries()).map(([appId, state]) => (
          <Card key={appId} className="border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {state.loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {locale === "zh" ? "載入中..." : "Loading..."}
                    </div>
                  ) : state.application ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {locale === "zh" ? "學號" : "Student ID"}:{" "}
                          {state.application.student_id}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {locale === "zh" ? "申請 ID" : "Application ID"}: {appId}
                      </div>
                    </div>
                  ) : (
                    <span className="text-red-500">
                      {locale === "zh"
                        ? `無法載入申請 ${appId}`
                        : `Failed to load application ${appId}`}
                    </span>
                  )}
                </CardTitle>

                {state.uploadStatus === "success" && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      {locale === "zh" ? "已完成" : "Completed"}
                    </span>
                  </div>
                )}

                {state.uploadStatus === "error" && (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      {locale === "zh" ? "失敗" : "Failed"}
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {!state.loading && state.application && (
                <>
                  {/* Document Type Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {locale === "zh" ? "文件類型" : "Document Type"}
                    </label>
                    <Select
                      value={state.selectedDocumentType}
                      onValueChange={(value) => handleDocumentTypeChange(appId, value)}
                      disabled={state.uploading}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            locale === "zh" ? "選擇文件類型" : "Select document type"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {locale === "zh" ? type.label_zh : type.label_en}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* File Upload */}
                  {state.selectedDocumentType && (
                    <>
                      <FileUpload
                        onFilesChange={(files) => handleFilesChange(appId, files)}
                        acceptedTypes={[".pdf", ".jpg", ".jpeg", ".png"]}
                        maxSize={10 * 1024 * 1024}
                        maxFiles={3}
                        fileType={state.selectedDocumentType}
                        locale={locale}
                        initialFiles={state.files}
                      />

                      {/* Upload Button */}
                      {state.files.length > 0 && (
                        <Button
                          onClick={() => handleUpload(appId)}
                          disabled={state.uploading}
                          className="w-full"
                        >
                          {state.uploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {locale === "zh" ? "上傳中..." : "Uploading..."}
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              {locale === "zh"
                                ? `上傳 ${getDocumentTypeLabel(state.selectedDocumentType)}`
                                : `Upload ${getDocumentTypeLabel(state.selectedDocumentType)}`}
                            </>
                          )}
                        </Button>
                      )}

                      {/* Upload Status Message */}
                      {state.uploadMessage && (
                        <Alert
                          variant={
                            state.uploadStatus === "success" ? "default" : "destructive"
                          }
                        >
                          {state.uploadStatus === "success" ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                          <AlertDescription>{state.uploadMessage}</AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
