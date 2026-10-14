"use client";

import { Modal } from "antd";
import type { ReactNode } from "react";

interface DialogProps {
  children: ReactNode;
  compact?: boolean;
  description?: ReactNode;
  loading?: boolean;
  onClose: () => void;
  title: ReactNode;
  width?: number;
}

export function Dialog({ children, compact = false, description, loading = false, onClose, title, width = 768 }: DialogProps) {
  const bodyHeight = compact ? "max-h-[calc(90dvh-180px)]" : "max-h-[calc(100dvh-200px)]";

  return (
    <Modal
      centered
      classNames={{ body: `${bodyHeight} overflow-y-auto px-[18px] pt-6 pb-5 sm:px-[22px]` }}
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
      {description && <p className="mb-4 text-sm text-muted-foreground">{description}</p>}
      {children}
    </Modal>
  );
}
