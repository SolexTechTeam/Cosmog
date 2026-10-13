"use client";

import { Modal } from "antd";

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      cancelText={cancelLabel}
      cancelButtonProps={{ disabled: loading }}
      centered
      closable={false}
      confirmLoading={loading}
      destroyOnHidden
      keyboard={!loading}
      mask={{ closable: !loading }}
      okButtonProps={{ danger: variant === "destructive" }}
      okText={confirmLabel}
      onCancel={onCancel}
      onOk={onConfirm}
      open
      title={title}
      width={384}
    >
      <p className="text-sm text-muted-foreground">{description}</p>
    </Modal>
  );
}
