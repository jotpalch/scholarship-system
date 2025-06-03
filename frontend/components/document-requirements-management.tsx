"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Settings } from "lucide-react"

interface DocumentRequirement {
  id: string
  name: string
  description: string
  fileTypes: string[]
  maxSize: number
  required: boolean
  scholarshipType: "phd_research" | "direct_phd"
  order: number
  active: boolean
}

export function DocumentRequirementsManagement() {
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([
    {
      id: "doc_001",
      name: "研究計畫書",
      description: "詳細的研究計畫內容，包含研究目標、方法、預期成果等",
      fileTypes: [".pdf", ".doc", ".docx"],
      maxSize: 10,
      required: true,
      scholarshipType: "phd_research",
      order: 1,
      active: true,
    },
    {
      id: "doc_002",
      name: "指導教授推薦信",
      description: "指導教授的推薦信函",
      fileTypes: [".pdf"],
      maxSize: 5,
      required: true,
      scholarshipType: "phd_research",
      order: 2,
      active: true,
    },
    {
      id: "doc_003",
      name: "完整研究計畫書",
      description: "逕博學生需提供完整的博士論文研究計畫",
      fileTypes: [".pdf"],
      maxSize: 15,
      required: true,
      scholarshipType: "direct_phd",
      order: 1,
      active: true,
    },
    {
      id: "doc_004",
      name: "預算規劃書",
      description: "詳細的研究經費使用規劃",
      fileTypes: [".pdf", ".xlsx"],
      maxSize: 5,
      required: true,
      scholarshipType: "direct_phd",
      order: 2,
      active: true,
    },
  ])

  const [newRequirement, setNewRequirement] = useState({
    name: "",
    description: "",
    fileTypes: "",
    maxSize: "10",
    required: true,
    scholarshipType: "phd_research" as "phd_research" | "direct_phd",
  })

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<"phd_research" | "direct_phd">("phd_research")

  const handleAddRequirement = () => {
    const requirement: DocumentRequirement = {
      id: `doc_${Date.now()}`,
      name: newRequirement.name,
      description: newRequirement.description,
      fileTypes: newRequirement.fileTypes.split(",").map((t) => t.trim()),
      maxSize: Number.parseInt(newRequirement.maxSize),
      required: newRequirement.required,
      scholarshipType: newRequirement.scholarshipType,
      order: requirements.filter((r) => r.scholarshipType === newRequirement.scholarshipType).length + 1,
      active: true,
    }

    setRequirements([...requirements, requirement])
    setNewRequirement({
      name: "",
      description: "",
      fileTypes: "",
      maxSize: "10",
      required: true,
      scholarshipType: "phd_research",
    })
    setIsAddDialogOpen(false)
  }

  const handleToggleActive = (id: string) => {
    setRequirements(requirements.map((req) => (req.id === id ? { ...req, active: !req.active } : req)))
  }

  const handleRemoveRequirement = (id: string) => {
    setRequirements(requirements.filter((req) => req.id !== id))
  }

  const filteredRequirements = requirements.filter((req) => req.scholarshipType === selectedType)

  const getScholarshipTypeName = (type: "phd_research" | "direct_phd") => {
    return type === "phd_research" ? "博士班研究獎學金" : "逕博獎學金"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          審查資料設定管理
        </CardTitle>
        <CardDescription>動態設定博士班與逕博獎學金所需的審查文件</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Label>獎學金類型:</Label>
            <Select
              value={selectedType}
              onValueChange={(value: "phd_research" | "direct_phd") => setSelectedType(value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phd_research">博士班研究獎學金</SelectItem>
                <SelectItem value="direct_phd">逕博獎學金</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                新增文件要求
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>新增審查文件要求</DialogTitle>
                <DialogDescription>為 {getScholarshipTypeName(selectedType)} 新增文件要求</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>文件名稱 *</Label>
                    <Input
                      value={newRequirement.name}
                      onChange={(e) => setNewRequirement({ ...newRequirement, name: e.target.value })}
                      placeholder="例: 研究計畫書"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>獎學金類型 *</Label>
                    <Select
                      value={newRequirement.scholarshipType}
                      onValueChange={(value: "phd_research" | "direct_phd") =>
                        setNewRequirement({ ...newRequirement, scholarshipType: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="phd_research">博士班研究獎學金</SelectItem>
                        <SelectItem value="direct_phd">逕博獎學金</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>文件說明 *</Label>
                  <Textarea
                    value={newRequirement.description}
                    onChange={(e) => setNewRequirement({ ...newRequirement, description: e.target.value })}
                    placeholder="請詳細說明此文件的要求與內容..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>支援檔案格式 *</Label>
                    <Input
                      value={newRequirement.fileTypes}
                      onChange={(e) => setNewRequirement({ ...newRequirement, fileTypes: e.target.value })}
                      placeholder="例: .pdf, .doc, .docx"
                    />
                    <p className="text-xs text-muted-foreground">請用逗號分隔多個格式</p>
                  </div>
                  <div className="space-y-2">
                    <Label>檔案大小限制 (MB) *</Label>
                    <Input
                      type="number"
                      value={newRequirement.maxSize}
                      onChange={(e) => setNewRequirement({ ...newRequirement, maxSize: e.target.value })}
                      placeholder="10"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={newRequirement.required}
                    onCheckedChange={(checked) => setNewRequirement({ ...newRequirement, required: checked })}
                  />
                  <Label>必要文件</Label>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleAddRequirement}
                    disabled={!newRequirement.name || !newRequirement.description || !newRequirement.fileTypes}
                  >
                    新增
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    取消
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{getScholarshipTypeName(selectedType)} - 文件要求</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>順序</TableHead>
                  <TableHead>文件名稱</TableHead>
                  <TableHead>說明</TableHead>
                  <TableHead>檔案格式</TableHead>
                  <TableHead>大小限制</TableHead>
                  <TableHead>必要性</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequirements.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>{req.order}</TableCell>
                    <TableCell className="font-medium">{req.name}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={req.description}>
                        {req.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {req.fileTypes.map((type, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>{req.maxSize} MB</TableCell>
                    <TableCell>
                      <Badge variant={req.required ? "default" : "secondary"}>{req.required ? "必要" : "選填"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch checked={req.active} onCheckedChange={() => handleToggleActive(req.id)} />
                        <span className="text-sm">{req.active ? "啟用" : "停用"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleRemoveRequirement(req.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="text-sm text-muted-foreground">
          {getScholarshipTypeName(selectedType)} 共有 {filteredRequirements.length} 項文件要求
        </div>
      </CardContent>
    </Card>
  )
}
