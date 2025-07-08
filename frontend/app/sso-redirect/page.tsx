"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SSORedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("No authorization code found in URL.");
      setLoading(false);
      return;
    }
    const doSSOLogin = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/sso/callback?code=${encodeURIComponent(code)}`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "SSO login failed");
        }
        // Store token and user info
        localStorage.setItem("token", data.data.access_token);
        localStorage.setItem("user", JSON.stringify(data.data.user));
        // Redirect to dashboard
        router.replace("/");
      } catch (err: any) {
        setError(err.message || "SSO login failed");
        setLoading(false);
      }
    };
    doSSOLogin();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-nycu-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>NYCU SSO 登入</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="animate-spin h-8 w-8 text-nycu-navy-700" />
              <span className="text-gray-700">正在驗證您的身分，請稍候…</span>
            </div>
          )}
          {error && (
            <div className="text-red-600 text-center py-4">
              <div className="font-semibold mb-2">登入失敗</div>
              <div>{error}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 