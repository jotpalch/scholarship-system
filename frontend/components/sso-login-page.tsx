"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, ExternalLink, Loader2 } from "lucide-react";

export function SSOLoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSSOLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/sso/login`
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "無法取得 SSO 登入網址");
      }
      window.location.href = data.data.authorization_url;
    } catch (err: any) {
      setError(err.message || "無法取得 SSO 登入網址");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-nycu-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="nycu-gradient h-16 w-16 rounded-xl flex items-center justify-center nycu-shadow mx-auto mb-4">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl text-nycu-navy-800">登入系統</CardTitle>
          <CardDescription>獎學金申請與簽核作業管理系統</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={handleSSOLogin}
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              使用 SSO 登入
            </Button>
            {error && (
              <div className="text-red-600 text-center text-sm py-2">{error}</div>
            )}
            <p className="text-center text-sm text-gray-600">
              請使用您的校園帳號登入系統
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 