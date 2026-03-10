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
  title = "삭제 확인",
  message,
  warningMessage = "이 작업은 되돌릴 수 없습니다.",
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content confirm" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-body">
          <div className="confirm-icon">
            <span className="material-symbols-outlined">warning</span>
          </div>
          <p>{message}</p>
          <p className="warning">{warningMessage}</p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            취소
          </button>
          <button className="btn-danger" onClick={onConfirm}>
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmModal;
