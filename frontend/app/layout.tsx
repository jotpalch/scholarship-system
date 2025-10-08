import type React from "react";
import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import "./globals.css";
import { SWRConfig } from "swr";
import { AuthProvider } from "@/hooks/use-auth";
import { NotificationProvider } from "@/contexts/notification-context";
import { QueryProvider } from "@/components/providers/query-provider";
import { apiClient } from "@/lib/api";

// Lazy load DebugPanel only when enabled (tree-shaken in production)
const DebugPanel = dynamic(
  () => import("@/components/debug-panel").then((m) => ({ default: m.DebugPanel })),
  {
    ssr: false,
    loading: () => null,
  }
);

const defaultFetcher = async (endpoint: string) => {
  const response = await apiClient.request(endpoint);
  if (!response.success) {
    throw new Error(response.message || "Request failed");
  }
  return response.data ?? null;
};

export const metadata: Metadata = {
  title: "獎學金申請與簽核系統 | 國立陽明交通大學教務處",
  description:
    "國立陽明交通大學獎學金申請與簽核系統，提供學生獎學金申請、教師推薦、行政審核等完整流程管理",
  keywords: "獎學金, 申請, 審核, 陽明交通大學, NYCU, 教務處",
  authors: [{ name: "國立陽明交通大學教務處" }],
  robots: "noindex, nofollow", // 系統內部使用
  generator: "v0.dev",
  themeColor: "#1e40af",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/nycu-favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/nycu-favicon.svg", type: "image/svg+xml" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" className="scroll-smooth">
      <body className="antialiased">
        <QueryProvider>
          <SWRConfig
            value={{
              fetcher: defaultFetcher,
              revalidateOnFocus: true,
              shouldRetryOnError: false,
            }}
          >
            <AuthProvider>
              <NotificationProvider>
                {children}
                {process.env.NEXT_PUBLIC_ENABLE_DEBUG_PANEL === "true" && <DebugPanel />}
              </NotificationProvider>
            </AuthProvider>
          </SWRConfig>
        </QueryProvider>
      </body>
    </html>
  );
}
