"use client";

import { deleteTransaction } from "@/app/transactions/actions";
import { createTranslator } from "@/lib/i18n";

type DeleteButtonProps = {
  transactionId: string;
};

export default function DeleteButton({ transactionId }: DeleteButtonProps) {
  const t = createTranslator();

  const handleDelete = async () => {
    if (confirm(t("delete.confirm"))) {
      const result = await deleteTransaction(transactionId);
      if (result.success) {
        alert(t("delete.success"));
      } else {
        alert(`${t("delete.error")}: ${result.message}`);
      }
    }
  };

  return (
    <button
      onClick={handleDelete}
      className="text-red-600 hover:text-red-800 font-medium"
    >
      {t("delete.button")}
    </button>
  );
}