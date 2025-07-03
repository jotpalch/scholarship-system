"use client"

import React from 'react'
import { Edit, Save, X } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Modal } from './ui/modal'
import { UserListResponse, UserCreate } from '@/lib/api'

interface UserEditModalProps {
  isOpen: boolean
  onClose: () => void
  editingUser: UserListResponse | null
  userForm: UserCreate & { is_active: boolean }
  onUserFormChange: (field: keyof UserCreate, value: any) => void
  onSubmit: () => void
  isLoading?: boolean
}

export function UserEditModal({
  isOpen,
  onClose,
  editingUser,
  userForm,
  onUserFormChange,
  onSubmit,
  isLoading = false
}: UserEditModalProps) {
  const isEditing = !!editingUser

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? '編輯使用者' : '新增使用者'}
      size="lg"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>電子信箱 *</Label>
            <Input
              value={userForm.email}
              onChange={(e) => onUserFormChange('email', e.target.value)}
              placeholder="user@example.com"
              className="border-nycu-blue-200"
              disabled={isEditing} // 編輯時不允許修改信箱
            />
          </div>
          <div className="space-y-2">
            <Label>使用者名稱 *</Label>
            <Input
              value={userForm.username}
              onChange={(e) => onUserFormChange('username', e.target.value)}
              placeholder="username"
              className="border-nycu-blue-200"
              disabled={isEditing} // 編輯時不允許修改使用者名稱
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>中文姓名</Label>
            <Input
              value={userForm.chinese_name || ''}
              onChange={(e) => onUserFormChange('chinese_name', e.target.value)}
              placeholder="中文姓名"
              className="border-nycu-blue-200"
            />
          </div>
          <div className="space-y-2">
            <Label>英文姓名</Label>
            <Input
              value={userForm.english_name || ''}
              onChange={(e) => onUserFormChange('english_name', e.target.value)}
              placeholder="English Name"
              className="border-nycu-blue-200"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>完整姓名 *</Label>
          <Input
            value={userForm.full_name}
            onChange={(e) => onUserFormChange('full_name', e.target.value)}
            placeholder="完整姓名"
            className="border-nycu-blue-200"
          />
        </div>

        <div className="space-y-2">
          <Label>學號 (僅限學生)</Label>
          <Input
            value={userForm.student_no || ''}
            onChange={(e) => onUserFormChange('student_no', e.target.value)}
            placeholder="學號"
            className="border-nycu-blue-200"
            disabled={userForm.role !== 'student'}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>角色 *</Label>
            <select
              value={userForm.role}
              onChange={(e) => onUserFormChange('role', e.target.value)}
              className="w-full px-3 py-2 border border-nycu-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-nycu-blue-500 focus:border-transparent"
            >
              <option value="student">學生</option>
              <option value="professor">教授</option>
              <option value="college">學院</option>
              <option value="admin">管理員</option>
              <option value="super_admin">超級管理員</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>狀態</Label>
            <select
              value={userForm.is_active ? 'true' : 'false'}
              onChange={(e) => onUserFormChange('is_active', e.target.value === 'true')}
              className="w-full px-3 py-2 border border-nycu-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-nycu-blue-500 focus:border-transparent"
            >
              <option value="true">啟用</option>
              <option value="false">停用</option>
            </select>
          </div>
        </div>

        {!isEditing && (
          <div className="space-y-2">
            <Label>密碼 *</Label>
            <Input
              type="password"
              value={userForm.password}
              onChange={(e) => onUserFormChange('password', e.target.value)}
              placeholder="密碼 (至少8位)"
              className="border-nycu-blue-200"
            />
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button
            onClick={onSubmit}
            disabled={isLoading || !userForm.email || !userForm.username || !userForm.full_name || (!isEditing && !userForm.password)}
            className="nycu-gradient text-white"
          >
            <Save className="h-4 w-4 mr-1" />
            {isLoading ? '處理中...' : (isEditing ? '更新使用者' : '建立使用者')}
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-1" />
            取消
          </Button>
        </div>
      </div>
    </Modal>
  )
} 