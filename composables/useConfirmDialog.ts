import { ref } from "vue";

interface ConfirmDialogState {
  show: boolean;
  title: string;
  message: string;
  onConfirm: (() => void) | null;
  confirmText?: string;
  cancelText?: string;
}

export function useConfirmDialog() {
  const confirmDialog = ref<ConfirmDialogState>({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
    // No words here: ConfirmDialog says Confirm and Cancel in the current
    // language when it is given none.
    confirmText: undefined,
    cancelText: undefined,
  });

  function showConfirmDialog(
    title: string,
    message: string,
    onConfirm: () => void,
    options?: { confirmText?: string; cancelText?: string },
  ) {
    confirmDialog.value = {
      show: true,
      title,
      message,
      onConfirm,
      confirmText: options?.confirmText,
      cancelText: options?.cancelText,
    };
  }

  function confirmDialogConfirm() {
    if (confirmDialog.value.onConfirm) {
      confirmDialog.value.onConfirm();
    }
    confirmDialog.value.show = false;
  }

  function confirmDialogCancel() {
    confirmDialog.value.show = false;
  }

  return {
    confirmDialog,
    showConfirmDialog,
    confirmDialogConfirm,
    confirmDialogCancel,
  };
}
