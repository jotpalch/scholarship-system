"use client"

import { CheckCircle, Clock, Circle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimelineStep {
  id: string
  title: string
  description?: string
  status: "completed" | "current" | "pending" | "rejected"
  date?: string
  estimatedDate?: string
}

interface ProgressTimelineProps {
  steps: TimelineStep[]
  className?: string
  orientation?: "vertical" | "horizontal"
}

export function ProgressTimeline({ steps, className, orientation = "vertical" }: ProgressTimelineProps) {
  const getStepIcon = (status: TimelineStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "current":
        return <Clock className="h-5 w-5 text-yellow-600" />
      case "rejected":
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStepColor = (status: TimelineStep["status"]) => {
    switch (status) {
      case "completed":
        return "border-green-600 bg-green-50"
      case "current":
        return "border-yellow-500 bg-yellow-50"
      case "rejected":
        return "border-red-600 bg-red-50"
      default:
        return "border-gray-300 bg-gray-50"
    }
  }

  const getLineColor = (currentStatus: TimelineStep["status"], nextStatus?: TimelineStep["status"]) => {
    if (currentStatus === "completed") {
      return "bg-green-600"
    }
    if (currentStatus === "current") {
      return "bg-yellow-500"
    }
    return "bg-gray-300"
  }

  // 水平顯示模式
  if (orientation === "horizontal") {
    return (
      <div className={cn("relative", className)}>
        {/* 圓圈和連接線容器 */}
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              {/* 節點圓圈 */}
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 z-10 bg-white",
                  getStepColor(step.status),
                )}
              >
                {getStepIcon(step.status)}
              </div>
              
              {/* 連接線 */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-4",
                    getLineColor(step.status, steps[index + 1]?.status),
                  )}
                />
              )}
            </div>
          ))}
        </div>
        
        {/* 標題和日期容器 */}
        <div className="flex justify-between">
          {steps.map((step) => (
            <div key={`text-${step.id}`} className="flex-1 text-center px-2">
              {/* 標題 */}
              <h4
                className={cn("text-xs font-medium leading-tight", {
                  "text-green-800": step.status === "completed",
                  "text-yellow-800": step.status === "current",
                  "text-red-800": step.status === "rejected",
                  "text-gray-600": step.status === "pending",
                })}
              >
                {step.title}
              </h4>
              
              {/* 日期 */}
              {step.date && (
                <div
                  className={cn("text-xs mt-1", {
                    "text-green-600": step.status === "completed",
                    "text-yellow-600": step.status === "current",
                    "text-red-600": step.status === "rejected",
                    "text-gray-500": step.status === "pending",
                  })}
                >
                  {step.date}
                </div>
              )}
              {!step.date && step.estimatedDate && step.status === "pending" && (
                <div className="text-xs text-gray-500 mt-1">預計 {step.estimatedDate}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 垂直顯示模式（原有邏輯）
  return (
    <div className={cn("space-y-0", className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="relative">
          <div className="flex items-start">
            {/* 節點圓圈 */}
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border-2",
                getStepColor(step.status),
              )}
            >
              {getStepIcon(step.status)}
            </div>

            {/* 內容區域 */}
            <div className="ml-4 flex-1 pb-8">
              <div className="flex items-center justify-between">
                <h4
                  className={cn("text-sm font-medium", {
                    "text-green-800": step.status === "completed",
                    "text-yellow-800": step.status === "current",
                    "text-red-800": step.status === "rejected",
                    "text-gray-600": step.status === "pending",
                  })}
                >
                  {step.title}
                </h4>
                <div className="text-xs text-muted-foreground">
                  {step.date && (
                    <span
                      className={cn({
                        "text-green-600": step.status === "completed",
                        "text-yellow-600": step.status === "current",
                        "text-red-600": step.status === "rejected",
                      })}
                    >
                      {step.date}
                    </span>
                  )}
                  {!step.date && step.estimatedDate && step.status === "pending" && (
                    <span className="text-gray-500">預計 {step.estimatedDate}</span>
                  )}
                </div>
              </div>
              {step.description && <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>}
            </div>
          </div>

          {/* 連接線 */}
          {index < steps.length - 1 && (
            <div
              className={cn(
                "absolute left-5 top-10 h-8 w-0.5 -translate-x-0.5",
                getLineColor(step.status, steps[index + 1]?.status),
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}
