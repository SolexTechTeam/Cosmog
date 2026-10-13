"use client";

import { Modal } from "antd";
import type { ReactNode } from "react";

interface DialogProps {
  children: ReactNode;
  description?: ReactNode;
  loading?: boolean;
  onClose: () => void;
  title: ReactNode;
  width?: number;
}

export function Dialog({ children, description, loading = false, onClose, title, width = 768 }: DialogProps) {
  return (
    <Modal
      centered
      classNames={{ body: "max-h-[calc(100vh-180px)] overflow-y-auto" }}
      closable={!loading}
      destroyOnHidden
      footer={null}
      keyboard={!loading}
      mask={{ closable: !loading }}
      onCancel={onClose}
      open
      title={title}
      width={width}
    >
      {description && <p className="-mt-2 mb-5 text-sm text-muted-foreground">{description}</p>}
      {children}
    </Modal>
  );
}
