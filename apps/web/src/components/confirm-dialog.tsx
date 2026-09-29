"use client";
import { useEffect, useRef, type ReactNode } from "react";
export default function ConfirmDialog({
  titleId,
  onClose,
  children,
}: {
  titleId: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal native-dialog"
      aria-labelledby={titleId}
      onCancel={onClose}
    >
      {children}
    </dialog>
  );
}
