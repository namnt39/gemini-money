"use client";

import { useMemo } from "react";

import ConfirmDialogBase from "@/components/ui/ConfirmDialog";
import { createTranslator } from "@/lib/i18n";

export type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const t = useMemo(() => createTranslator(), []);

  return (
    <ConfirmDialogBase
      open={open}
      title={title ?? t("common.confirm")}
      description={description}
      confirmLabel={confirmLabel ?? t("common.confirm")}
      cancelLabel={cancelLabel ?? t("common.cancel")}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
