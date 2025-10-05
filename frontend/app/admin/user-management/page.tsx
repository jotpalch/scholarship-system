"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiClient } from "@/lib/api";
import { useRouter } from "next/navigation";
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

export default function UserManagementPage() {
  const { user } = useAuth();
  const router = useRouter();
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

  // Check super admin access
  useEffect(() => {
    if (user && user.role !== "super_admin") {
      router.push("/");
    }
  }, [user, router]);

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        include_permissions: "true",
        ...(roleFilter !== "all" && { role: roleFilter }),
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/v1/admin/users?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setUsers(data.data.items);
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
      const response = await fetch(`/api/v1/admin/users/${userId}/college?college_code=${collegeCode}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

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
    setSelectedScholarships(user.scholarships.map(s => s.id));
    setShowPermissionModal(true);
  };

  // Update scholarships
  const handleUpdateScholarships = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/v1/admin/users/${selectedUser.id}/scholarships/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          scholarship_ids: selectedScholarships,
          operation: "set",
        }),
      });

      if (response.ok) {
        await fetchUsers();
        setShowPermissionModal(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error("Failed to update scholarships:", error);
    }
  };

  if (user?.role !== "super_admin") {
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">使用者權限管理</h1>

        <div className="flex gap-4 mb-4">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
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

          <Input
            placeholder="搜尋姓名、Email或NYCU ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">載入中...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>NYCU ID</TableHead>
              <TableHead>姓名</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>角色</TableHead>
              <TableHead>學院代碼</TableHead>
              <TableHead>系所</TableHead>
              <TableHead>獎學金數量</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.nycu_id}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "super_admin" ? "destructive" : "secondary"}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {editingCollege === user.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={collegeValue}
                        onChange={(e) => setCollegeValue(e.target.value)}
                        className="w-24"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdateCollege(user.id, collegeValue)}
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
                <TableCell>{user.dept_name || "-"}</TableCell>
                <TableCell>{user.scholarship_count}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenPermissionModal(user)}
                  >
                    管理權限
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

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
              <div key={scholarship.id} className="flex items-center gap-2">
                <Checkbox
                  checked={selectedScholarships.includes(scholarship.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedScholarships([...selectedScholarships, scholarship.id]);
                    } else {
                      setSelectedScholarships(
                        selectedScholarships.filter((id) => id !== scholarship.id)
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
            <Button variant="outline" onClick={() => setShowPermissionModal(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateScholarships}>儲存</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
