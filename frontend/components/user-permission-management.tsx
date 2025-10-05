"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface User {
  id: number;
  nycu_id: string;
  name: string;
  email: string;
  role: string;
  college_code?: string;
  dept_name?: string;
  scholarship_count: number;
  scholarships: Array<{
    id: number;
    code: string;
    name: string;
    category: string;
  }>;
}

interface Scholarship {
  id: number;
  code: string;
  name: string;
  category: string;
  status: string;
}

export function UserPermissionManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [allScholarships, setAllScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedScholarships, setSelectedScholarships] = useState<number[]>([]);
  const [editingCollege, setEditingCollege] = useState<number | null>(null);
  const [collegeValue, setCollegeValue] = useState("");

  // Fetch users with permissions
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = {
        include_permissions: true,
        ...(roleFilter !== "all" && { role: roleFilter }),
        ...(searchQuery && { search: searchQuery }),
      };

      const response = await apiClient.users.getAll(params);
      if (response.success && response.data) {
        setUsers(response.data.items);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all scholarships for permission assignment
  const fetchScholarships = async () => {
    try {
      const response = await apiClient.admin.getMyScholarships();
      if (response.success) {
        setAllScholarships(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch scholarships:", error);
    }
  };

  useEffect(() => {
    if (user?.role === "super_admin") {
      fetchUsers();
      fetchScholarships();
    }
  }, [user, roleFilter, searchQuery]);

  // Update college code
  const handleUpdateCollege = async (userId: number, collegeCode: string) => {
    try {
      const response = await fetch(
        `/api/v1/admin/users/${userId}/college?college_code=${collegeCode}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }
      );

      if (response.ok) {
        await fetchUsers();
        setEditingCollege(null);
      }
    } catch (error) {
      console.error("Failed to update college:", error);
    }
  };

  // Open permission modal
  const handleOpenPermissionModal = (user: User) => {
    setSelectedUser(user);
    setSelectedScholarships(user.scholarships.map((s) => s.id));
    setShowPermissionModal(true);
  };

  // Update scholarships using bulk API
  const handleUpdateScholarships = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(
        `/api/v1/admin/users/${selectedUser.id}/scholarships/bulk`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
          body: JSON.stringify({
            scholarship_ids: selectedScholarships,
            operation: "set",
          }),
        }
      );

      if (response.ok) {
        await fetchUsers();
        setShowPermissionModal(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error("Failed to update scholarships:", error);
    }
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      student: "學生",
      professor: "教授",
      college: "學院",
      admin: "管理員",
      super_admin: "超級管理員",
    };
    return roleMap[role] || role;
  };

  if (user?.role !== "super_admin") {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-500">僅超級管理員可存取此功能</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">使用者權限管理</h3>
      </div>

      {/* Search and Filter */}
      <Card className="border-nycu-blue-200">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>搜尋使用者</Label>
              <Input
                placeholder="姓名、信箱或 NYCU ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-nycu-blue-200"
              />
            </div>
            <div>
              <Label>角色篩選</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="border-nycu-blue-200">
                  <SelectValue placeholder="篩選角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有角色</SelectItem>
                  <SelectItem value="student">學生</SelectItem>
                  <SelectItem value="college">學院</SelectItem>
                  <SelectItem value="admin">管理員</SelectItem>
                  <SelectItem value="super_admin">超級管理員</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={fetchUsers}
                className="w-full nycu-gradient text-white"
              >
                搜尋
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Table */}
      <Card className="border-nycu-blue-200">
        <CardHeader>
          <CardTitle>使用者權限列表</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-nycu-blue-600 border-t-transparent"></div>
                <span className="text-nycu-navy-600">載入使用者中...</span>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold px-5 py-3">NYCU ID</TableHead>
                  <TableHead className="font-bold px-5 py-3">姓名</TableHead>
                  <TableHead className="font-bold px-5 py-3">Email</TableHead>
                  <TableHead className="font-bold px-5 py-3">角色</TableHead>
                  <TableHead className="font-bold px-5 py-3">學院代碼</TableHead>
                  <TableHead className="font-bold px-5 py-3">系所</TableHead>
                  <TableHead className="font-bold px-5 py-3">
                    獎學金數量
                  </TableHead>
                  <TableHead className="font-bold px-5 py-3">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="px-5 py-4">{user.nycu_id}</TableCell>
                    <TableCell className="px-5 py-4">{user.name}</TableCell>
                    <TableCell className="px-5 py-4">{user.email}</TableCell>
                    <TableCell className="px-5 py-4">
                      <Badge
                        variant={
                          user.role === "super_admin"
                            ? "destructive"
                            : user.role === "admin"
                              ? "default"
                              : user.role === "college"
                                ? "secondary"
                                : "outline"
                        }
                        className="text-xs px-3 py-1 rounded-full"
                      >
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      {editingCollege === user.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={collegeValue}
                            onChange={(e) => setCollegeValue(e.target.value)}
                            className="w-24"
                          />
                          <Button
                            size="sm"
                            onClick={() =>
                              handleUpdateCollege(user.id, collegeValue)
                            }
                          >
                            儲存
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingCollege(null)}
                          >
                            取消
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer hover:text-blue-600"
                          onClick={() => {
                            setEditingCollege(user.id);
                            setCollegeValue(user.college_code || "");
                          }}
                        >
                          {user.college_code || "-"}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      {user.dept_name || "-"}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <Badge variant="outline" className="text-xs">
                        {user.scholarship_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenPermissionModal(user)}
                        className="hover:bg-nycu-blue-50 hover:border-nycu-blue-300"
                      >
                        管理權限
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Permission Management Modal */}
      <Dialog open={showPermissionModal} onOpenChange={setShowPermissionModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>管理獎學金權限</DialogTitle>
            <DialogDescription>
              為 {selectedUser?.name} ({selectedUser?.nycu_id}) 指派獎學金權限
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
            {allScholarships.map((scholarship) => (
              <div
                key={scholarship.id}
                className="flex items-center gap-3 p-2 rounded hover:bg-gray-50"
              >
                <Checkbox
                  checked={selectedScholarships.includes(scholarship.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedScholarships([
                        ...selectedScholarships,
                        scholarship.id,
                      ]);
                    } else {
                      setSelectedScholarships(
                        selectedScholarships.filter(
                          (id) => id !== scholarship.id
                        )
                      );
                    }
                  }}
                />
                <div>
                  <div className="font-medium">{scholarship.name}</div>
                  <div className="text-sm text-gray-500">
                    {scholarship.code} - {scholarship.category}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPermissionModal(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleUpdateScholarships}
              className="nycu-gradient text-white"
            >
              儲存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
