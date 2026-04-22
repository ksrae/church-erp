import { useLocale } from "../../i18n/LocaleContext";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  warningMessage?: string;
}

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  warningMessage,
}: DeleteConfirmModalProps) {
  const { t } = useLocale();
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content confirm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title ?? t("common.deleteConfirmTitle")}</h3>
          <button className="modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-body">
          <div className="confirm-icon">
            <span className="material-symbols-outlined">warning</span>
          </div>
          <p>{message}</p>
          <p className="warning">{warningMessage ?? t("common.deleteWarning")}</p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button className="btn-danger" onClick={onConfirm}>
            {t("common.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;
