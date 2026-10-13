"use client";

import { ConfigProvider, type ThemeConfig } from "antd";
import type { ReactNode } from "react";

const theme: ThemeConfig = {
  components: {
    Segmented: {
      itemSelectedBg: "#FFF7ED",
      itemSelectedColor: "#9A3412",
      trackBg: "#FFFFFF",
    },
  },
  token: {
    borderRadius: 8,
    colorBgBase: "#FFFFFF",
    colorBgContainer: "#FFFFFF",
    colorBorder: "#E5E7EB",
    colorInfo: "#F97316",
    colorPrimary: "#F97316",
    colorText: "#111827",
    colorTextSecondary: "#6B7280",
    controlHeight: 32,
    controlHeightSM: 24,
    fontFamily: "var(--font-sans), sans-serif",
  },
};

export default function AntdProvider({ children }: { children: ReactNode }) {
  return <ConfigProvider theme={theme}>{children}</ConfigProvider>;
}
