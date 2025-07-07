"use client"

import { useState, useEffect } from "react"
import { Label } from "@/components/ui/label"
import { Locale } from "@/lib/validators"
import { formatFieldName, formatFieldValue } from "@/lib/utils/application-helpers"

// 獲取欄位標籤（優先使用動態標籤，後備使用靜態標籤）
const getFieldLabel = (fieldName: string, locale: Locale, fieldLabels?: {[key: string]: { zh?: string, en?: string }}) => {
  if (fieldLabels && fieldLabels[fieldName]) {
    return locale === "zh" ? fieldLabels[fieldName].zh : (fieldLabels[fieldName].en || fieldLabels[fieldName].zh || fieldName)
  }
  return formatFieldName(fieldName, locale)
}

interface ApplicationFormDataDisplayProps {
  formData: Record<string, any>
  locale: Locale
  fieldLabels?: {[key: string]: { zh?: string, en?: string }}
}

export function ApplicationFormDataDisplay({ formData, locale, fieldLabels }: ApplicationFormDataDisplayProps) {
  const [formattedData, setFormattedData] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const formatData = async () => {
      setIsLoading(true)
      const formatted: Record<string, any> = {}
      
      for (const [key, value] of Object.entries(formData)) {
        if (!value || value === '' || key === 'files' || key === 'agree_terms') {
          continue
        }
        
        if (key === 'scholarship_type') {
          try {
            formatted[key] = await formatFieldValue(key, value, locale)
          } catch (error) {
            console.warn(`Failed to format scholarship type: ${value}`, error)
            formatted[key] = value
          }
        } else {
          formatted[key] = value
        }
      }
      
      setFormattedData(formatted)
      setIsLoading(false)
    }

    formatData()
  }, [formData, locale])

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Object.entries(formData).map(([key, value]) => {
          if (!value || value === '' || key === 'files' || key === 'agree_terms') {
            return null
          }
          
          return (
            <div key={key} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <Label className="text-sm font-medium text-gray-700">{getFieldLabel(key, locale, fieldLabels)}</Label>
                <p className="text-sm text-gray-600 mt-1">
                  {key === 'scholarship_type' ? '載入中...' : (
                    typeof value === 'string' && value.length > 100 
                      ? `${value.substring(0, 100)}...` 
                      : String(value)
                  )}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {Object.entries(formattedData).map(([key, value]) => {
        return (
          <div key={key} className="flex items-start justify-between p-3 bg-slate-50 rounded-lg">
            <div className="flex-1">
              <Label className="text-sm font-medium text-gray-700">{getFieldLabel(key, locale, fieldLabels)}</Label>
              <p className="text-sm text-gray-600 mt-1">
                {typeof value === 'string' && value.length > 100 
                  ? `${value.substring(0, 100)}...` 
                  : String(value)
                }
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
} 