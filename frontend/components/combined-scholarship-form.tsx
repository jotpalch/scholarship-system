'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Info } from 'lucide-react'
import { apiClient } from '@/lib/api'
import type { ScholarshipType } from '@/types/scholarship'

interface CombinedScholarshipFormProps {
  scholarship: ScholarshipType
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
}

const formSchema = z.object({
  subScholarshipId: z.string().min(1, '請選擇申請的獎學金類型'),
  personalStatement: z.string().min(100, '個人陳述至少需要100個字'),
  researchProposal: z.string().min(200, '研究計畫至少需要200個字'),
})

export function CombinedScholarshipForm({
  scholarship,
  onSubmit,
  onCancel
}: CombinedScholarshipFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedSubScholarship, setSelectedSubScholarship] = useState<ScholarshipType | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subScholarshipId: '',
      personalStatement: '',
      researchProposal: '',
    },
  })

  // 當選擇子獎學金時更新
  const handleSubScholarshipChange = (subScholarshipId: string) => {
    const subScholarship = scholarship.subScholarships?.find(
      sub => sub.id.toString() === subScholarshipId
    )
    setSelectedSubScholarship(subScholarship || null)
  }

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true)
    try {
      await onSubmit({
        scholarship_type_id: scholarship.id,
        sub_scholarship_type_id: parseInt(values.subScholarshipId),
        personal_statement: values.personalStatement,
        research_proposal: values.researchProposal,
      })
    } catch (error) {
      console.error('Failed to submit application:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          {scholarship.name} 申請表
        </CardTitle>
        <CardDescription>
          請選擇您要申請的獎學金類型並填寫相關資料
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            此為合併獎學金申請，您需要選擇申請國科會或教育部其中一項獎學金。
            兩者的申請條件和金額可能有所不同，請仔細查看各項要求。
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="subScholarshipId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>選擇獎學金類型 *</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value)
                      handleSubScholarshipChange(value)
                    }} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="請選擇要申請的獎學金類型" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {scholarship.subScholarships?.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id.toString()}>
                          {sub.name} - NT${sub.amount.toLocaleString()}/月
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    請根據您的資格選擇適合的獎學金類型
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedSubScholarship && (
              <Card className="p-4 bg-gray-50">
                <h4 className="font-semibold mb-2">{selectedSubScholarship.name} 申請條件</h4>
                <ul className="space-y-1 text-sm">
                  <li>• 金額：NT${selectedSubScholarship.amount.toLocaleString()}/月</li>
                  <li>• 最低 GPA 要求：{selectedSubScholarship.minGpa || '無'}</li>
                  <li>• 最高名次百分比：{selectedSubScholarship.maxRankingPercent || '無'}%</li>
                  <li>• 所需文件：{selectedSubScholarship.requiredDocuments?.join('、') || '無'}</li>
                </ul>
                {selectedSubScholarship.description && (
                  <p className="mt-2 text-sm text-gray-600">{selectedSubScholarship.description}</p>
                )}
              </Card>
            )}

            <FormField
              control={form.control}
              name="personalStatement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>個人陳述 *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="請說明您申請此獎學金的動機、學術背景、未來規劃等..."
                      className="min-h-[150px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    請詳細說明您的申請動機（至少100字）
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="researchProposal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>研究計畫 *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="請說明您的研究主題、研究方法、預期成果等..."
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    請詳細說明您的博士研究計畫（至少200字）
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                提交申請
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}