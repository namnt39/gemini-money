export type Locale = "en" | "vi";

export const DEFAULT_LOCALE: Locale = "en";

const resources = {
  en: {
    common: {
      appName: "Gemini Money",
      addNew: "Add New",
      add: "Add",
      cancel: "Cancel",
      save: "Save",
      back: "Back",
      loading: "Saving...",
      notes: "Notes",
      amount: "Amount",
      date: "Date",
      searchPlaceholder: "Search...",
      noData: "No data available.",
      actions: "Actions",
      requiredIndicator: "*",
    },
    sidebar: {
      dashboard: "Dashboard",
      transactions: "Transactions",
      categories: "Categories",
      reports: "Reports",
    },
    dashboard: {
      title: "Dashboard",
      accountsHeading: "Accounts",
      incomeThisMonth: "Income This Month",
      expenseThisMonth: "Expenses This Month",
      currentBalance: "Current Balance",
    },
    accounts: {
      name: "Account Name",
      type: "Type",
      creditLimit: "Credit Limit",
      notAvailable: "N/A",
    },
    transactions: {
      title: "Transaction History",
      addButton: "+ Add New",
      tableHeaders: {
        select: "Select",
        date: "Date",
        category: "Category",
        account: "Account",
        accountSource: "Source Account",
        accountTarget: "Target Account",
        notes: "Notes",
        amount: "Amount",
        borrower: "Borrower",
        finalPrice: "Final Price",
        totalBack: "Total Back",
      },
      tabs: {
        all: "All",
        income: "Income",
        expense: "Expenses",
        transfer: "Transfers",
      },
      filters: {
        year: "Year",
        month: "Month",
        quarter: "Quarter",
        account: "Account",
        apply: "Apply Filters",
        reset: "Reset",
        showOnlySelected: "Show selected only",
        selectAll: "Select All",
        allAccounts: "All accounts",
        pageSize: "Rows per page",
        resetConfirm: "Reset all filters?",
        collapse: "Hide Filter",
        expand: "Show Filter",
      },
      emptyState: "No transactions found.",
      loadingMessage: "Loading transactions...",
      pagination: {
        previous: "Previous",
        next: "Next",
        pageLabel: "Page",
        of: "of",
      },
      actions: {
        editTooltip: "Edit transaction",
        editPlaceholder: "Editing will be available soon!",
        deleteTooltip: "Delete transaction",
        deleteSelected: "Delete selected",
        deleteSelectedConfirm: "Are you sure you want to delete the selected transactions?",
        deleteSelectedSuccess: "Selected transactions deleted successfully.",
        deselect: "Deselect",
        deselectConfirm: "Clear all selected rows?",
        addTooltip: "Add a new transaction",
      },
      summary: {
        selectedTotals: "Selected totals",
      },
      table: {
        customize: "Customize columns",
        doneCustomizing: "Done customizing",
        resetLayout: "Reset layout",
        customizeHint:
          "Drag headers to reorder columns or use the handle to resize. Use Reset to restore the default layout.",
        resetConfirm: "Restore the default column layout?",
      },
    },
    transactionForm: {
      title: "Add New Transaction",
      tabs: {
        expense: "Expenses",
        income: "Income",
        transfer: "Transfers",
        debt: "Debt",
      },
      labels: {
        fromAccount: "From Account",
        toAccount: "To Account",
        expenseCategory: "Expense Category",
        incomeCategory: "Income Category",
        transferCategory: "Transfer Category",
        whoOwes: "Who owes?",
        withdrawFromAccount: "Withdraw From Account",
        cashbackInfo: "Cashback Information",
      },
      actions: {
        submit: "Save Transaction",
        submitting: "Saving...",
      },
      addAccount: "Add Account",
      addAccountPlaceholder: "Account creation is coming soon.",
      addCategory: {
        expense: "Add Expense Category",
        income: "Add Income Category",
        transfer: "Add Transfer Category",
        debt: "Add Debt Category",
      },
      confirmLeave: "Are you sure you want to go back? Unsaved changes will be lost.",
      hints: {
        transferSameAccount: "Avoid choosing the same account for both sides of a transfer.",
      },
      errors: {
        sameTransferAccount: "You cannot transfer between the same account.",
      },
    },
    amountInput: {
      openCalculator: "Open mini calculator",
      openCalculatorAria: "Open mini calculator",
      clear: "Clear",
      clearAria: "Clear amount",
    },
    categories: {
      title: "Categories",
      addButton: "+ Add New",
      tableHeaders: {
        icon: "Icon",
        name: "Category Name",
        type: "Transaction Type",
      },
      emptyState: "No categories available.",
      nature: {
        EX: "Expenses",
        IN: "Income",
        TR: "Transfers",
        DE: "Debt",
        unknown: "Unknown",
      },
    },
    categoryForm: {
      title: "Add New Category",
      nameLabel: "Category Name",
      namePlaceholder: "Example: Transportation",
      typeLabel: "Transaction Type",
      imageLabel: "Image (URL)",
      imageHelp: "Provide an image URL for the category icon (optional).",
      back: "Back",
      save: "Save Category",
      confirmLeave: "Are you sure you want to go back? Unsaved changes will be lost.",
      saving: "Saving...",
    },
    delete: {
      confirm: "Are you sure you want to delete this transaction?",
      success: "Transaction deleted successfully!",
      error: "Error",
      button: "Delete",
    },
  },
  vi: {
    common: {
      appName: "Gemini Money",
      addNew: "Thêm mới",
      add: "Thêm",
      cancel: "Hủy",
      save: "Lưu",
      back: "Quay lại",
      loading: "Đang lưu...",
      notes: "Ghi chú",
      amount: "Số tiền",
      date: "Ngày",
      searchPlaceholder: "Tìm kiếm...",
      noData: "Chưa có dữ liệu.",
      actions: "Thao tác",
      requiredIndicator: "*",
    },
    sidebar: {
      dashboard: "Dashboard",
      transactions: "Giao dịch",
      categories: "Danh mục",
      reports: "Báo cáo",
    },
    dashboard: {
      title: "Dashboard",
      accountsHeading: "Tài khoản",
      incomeThisMonth: "Thu nhập Tháng này",
      expenseThisMonth: "Chi tiêu Tháng này",
      currentBalance: "Số dư Hiện tại",
    },
    accounts: {
      name: "Tên Tài khoản",
      type: "Loại",
      creditLimit: "Hạn mức tín dụng",
      notAvailable: "Không có",
    },
    transactions: {
      title: "Lịch sử Giao dịch",
      addButton: "+ Thêm mới",
      tableHeaders: {
        select: "Chọn",
        date: "Ngày",
        category: "Danh mục",
        account: "Tài khoản",
        accountSource: "Tài khoản nguồn",
        accountTarget: "Tài khoản đích",
        notes: "Ghi chú",
        amount: "Số tiền",
        borrower: "Người mượn nợ",
        finalPrice: "Giá cuối",
        totalBack: "Tổng hoàn",
      },
      tabs: {
        all: "Tất cả",
        income: "Thu nhập",
        expense: "Chi tiêu",
        transfer: "Chuyển khoản",
      },
      filters: {
        year: "Năm",
        month: "Tháng",
        quarter: "Quý",
        account: "Tài khoản",
        apply: "Áp dụng bộ lọc",
        reset: "Đặt lại",
        showOnlySelected: "Chỉ hiển thị mục đã chọn",
        selectAll: "Chọn tất cả",
        allAccounts: "Tất cả tài khoản",
        pageSize: "Số dòng mỗi trang",
        resetConfirm: "Bạn có chắc muốn đặt lại toàn bộ bộ lọc không?",
        collapse: "Ẩn bộ lọc",
        expand: "Hiển thị bộ lọc",
      },
      emptyState: "Chưa có giao dịch nào.",
      loadingMessage: "Đang tải giao dịch...",
      pagination: {
        previous: "Trước",
        next: "Tiếp",
        pageLabel: "Trang",
        of: "trên",
      },
      actions: {
        editTooltip: "Chỉnh sửa giao dịch",
        editPlaceholder: "Tính năng chỉnh sửa sẽ sớm có mặt!",
        deleteTooltip: "Xóa giao dịch",
        deleteSelected: "Xóa đã chọn",
        deleteSelectedConfirm: "Bạn có chắc muốn xóa các giao dịch đã chọn không?",
        deleteSelectedSuccess: "Đã xóa các giao dịch đã chọn.",
        deselect: "Bỏ chọn",
        deselectConfirm: "Bạn có muốn bỏ chọn tất cả các dòng không?",
        addTooltip: "Thêm giao dịch mới",
      },
      summary: {
        selectedTotals: "Tổng các mục đã chọn",
      },
      table: {
        customize: "Tùy chỉnh cột",
        doneCustomizing: "Hoàn tất tùy chỉnh",
        resetLayout: "Đặt lại bố cục",
        customizeHint:
          "Kéo tiêu đề để sắp xếp lại hoặc kéo chốt để đổi độ rộng. Dùng Đặt lại để trở về mặc định.",
        resetConfirm: "Khôi phục bố cục cột mặc định?",
      },
    },
    transactionForm: {
      title: "Thêm Giao dịch mới",
      tabs: {
        expense: "Chi tiêu",
        income: "Thu nhập",
        transfer: "Chuyển khoản",
        debt: "Công nợ",
      },
      labels: {
        fromAccount: "Từ Tài khoản",
        toAccount: "Đến Tài khoản",
        expenseCategory: "Danh mục Chi tiêu",
        incomeCategory: "Danh mục Thu nhập",
        transferCategory: "Danh mục Chuyển khoản",
        whoOwes: "Ai nợ?",
        withdrawFromAccount: "Rút tiền từ Tài khoản",
        cashbackInfo: "Thông tin Cashback",
      },
      actions: {
        submit: "Lưu Giao dịch",
        submitting: "Đang lưu...",
      },
      addAccount: "Thêm tài khoản",
      addAccountPlaceholder: "Tính năng thêm tài khoản sẽ sớm có mặt.",
      addCategory: {
        expense: "Thêm danh mục Chi tiêu",
        income: "Thêm danh mục Thu nhập",
        transfer: "Thêm danh mục Chuyển khoản",
        debt: "Thêm danh mục Công nợ",
      },
      confirmLeave: "Bạn có chắc muốn quay lại? Thông tin chưa lưu sẽ bị mất.",
      hints: {
        transferSameAccount: "Hãy tránh chọn cùng một tài khoản cho hai chiều chuyển khoản.",
      },
      errors: {
        sameTransferAccount: "Không thể chuyển khoản trong cùng một tài khoản.",
      },
    },
    amountInput: {
      openCalculator: "Mở máy tính mini",
      openCalculatorAria: "Mở máy tính mini",
      clear: "Xóa",
      clearAria: "Xóa số tiền",
    },
    categories: {
      title: "Danh mục",
      addButton: "+ Thêm mới",
      tableHeaders: {
        icon: "Biểu tượng",
        name: "Tên danh mục",
        type: "Loại giao dịch",
      },
      emptyState: "Chưa có danh mục nào.",
      nature: {
        EX: "Chi tiêu",
        IN: "Thu nhập",
        TR: "Chuyển khoản",
        DE: "Công nợ",
        unknown: "Không xác định",
      },
    },
    categoryForm: {
      title: "Thêm danh mục mới",
      nameLabel: "Tên danh mục",
      namePlaceholder: "Ví dụ: Di chuyển",
      typeLabel: "Loại giao dịch",
      imageLabel: "Hình ảnh (URL)",
      imageHelp: "Nhập đường dẫn ảnh biểu tượng cho danh mục (nếu có).",
      back: "Quay lại",
      save: "Lưu danh mục",
      confirmLeave: "Bạn có chắc muốn quay lại? Thông tin chưa được lưu sẽ bị mất.",
      saving: "Đang lưu...",
    },
    delete: {
      confirm: "Bạn có chắc chắn muốn xóa giao dịch này không?",
      success: "Xóa giao dịch thành công!",
      error: "Lỗi",
      button: "Xóa",
    },
  },
} as const;

type Resource = typeof resources;
type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : Key;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<Resource[Locale]>;

function resolvePath(locale: Locale, path: string) {
  const segments = path.split(".");
  let current: unknown = resources[locale];
  for (const segment of segments) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function translate(path: TranslationKey, locale: Locale = DEFAULT_LOCALE): string {
  const value = resolvePath(locale, path);
  if (typeof value === "string") {
    return value;
  }
  const fallback = resolvePath(DEFAULT_LOCALE, path);
  if (typeof fallback === "string") {
    return fallback;
  }
  return path;
}

export function createTranslator(locale: Locale = DEFAULT_LOCALE) {
  return (path: TranslationKey) => translate(path, locale);
}

export function getResources(locale: Locale = DEFAULT_LOCALE) {
  return resources[locale] ?? resources[DEFAULT_LOCALE];
}
