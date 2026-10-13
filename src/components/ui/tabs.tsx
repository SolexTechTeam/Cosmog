"use client";

import { Tabs as AntTabs } from "antd";
import type { ReactNode } from "react";

interface TabItem<T extends string> {
  key: T;
  label: ReactNode;
}

interface TabsProps<T extends string> {
  activeKey: T;
  extra?: ReactNode;
  items: TabItem<T>[];
  onChange: (key: T) => void;
}

export function Tabs<T extends string>({ activeKey, extra, items, onChange }: TabsProps<T>) {
  return (
    <AntTabs
      activeKey={activeKey}
      animated={false}
      items={items}
      onChange={(key) => onChange(key as T)}
      tabBarExtraContent={extra}
    />
  );
}
