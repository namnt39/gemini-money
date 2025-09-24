"use client";

// SỬA Ở ĐÂY: Dùng đường dẫn tuyệt đối
import { deleteTransaction } from "@/app/transactions/actions";

type DeleteButtonProps = {
  transactionId: string;
};

export default function DeleteButton({ transactionId }: DeleteButtonProps) {
  const handleDelete = async () => {
    if (confirm("Bạn có chắc chắn muốn xóa giao dịch này không?")) {
      const result = await deleteTransaction(transactionId);
      if (result.success) {
        alert("Xóa thành công!");
      } else {
        alert(`Lỗi: ${result.message}`);
      }
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="text-red-600 hover:text-red-800 font-medium"
    >
      Xóa
    </button>
  );
}