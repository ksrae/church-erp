import { useState, useEffect, useMemo, useCallback } from "react";
import { saveData, loadData } from "../utils/fileStorage";
import { logActivity } from "../utils/auditLog";
import {
  formatCurrency as formatCurrencyUtil,
  formatLargeCurrency,
  getCurrencySymbol,
  getCurrentCurrencyCode,
  setupCurrencyListener,
  CurrencyCode,
} from "../utils/currency";
import { useLocale } from "../i18n/LocaleContext";

// ... (Types imports remain same)
import {
  Account,
  Transaction,
  FinanceData,
  TabType,
  DetailViewType,
  LedgerRow,
  AccountBreakdown,
  ReportData,
  initialFinanceData,
  defaultAccounts,
} from "../types/finance";

// ... (Components imports remain same)
import {
  FinanceSidebar,
  FinanceHeader,
  LedgerView,
  ReportView,
  TransactionManagementView,
  AccountForm,
  TransactionForm,
} from "../components/finance";
import { DeleteConfirmModal } from "../components/common";

interface Member {
  id: string;
  name: string;
  role?: string;
}

// ... (Main Component starts)
function Finance() {
  const { t, locale } = useLocale();
  const [financeData, setFinanceData] = useState<FinanceData>(initialFinanceData);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("ledger");
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "account" | "transaction"; id: string } | null>(null);

  // ... (Filter states remain same)
  const [dateFilter, setDateFilter] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [searchTerm, setSearchTerm] = useState("");

  // ... (Report/Currency/View states remain same)
  const [reportType, setReportType] = useState<"monthly" | "yearly">("monthly");
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);

  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(getCurrentCurrencyCode());
  const [currencySymbol, setCurrencySymbol] = useState(getCurrencySymbol());

  const [detailView, setDetailView] = useState<DetailViewType>("overview");

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showMonthSelector, setShowMonthSelector] = useState(false);

  // ... (Data Loading/Currency Listener/SaveData remain same)
  useEffect(() => {
    const loadFinanceData = async () => {
      setIsLoading(true);
      console.log("🔄 Loading finance data...");

      try {
        const data = await loadData<FinanceData>("finance", "finance.json");

        if (data && data.accounts && data.accounts.length > 0) {
          console.log("✅ Finance data loaded:", {
            accounts: data.accounts.length,
            transactions: data.transactions?.length || 0,
            lastUpdated: data.lastUpdated
          });
          setFinanceData(data);
        } else {
          console.log("📝 No existing data, creating initial data...");
          const initialData: FinanceData = {
            accounts: defaultAccounts,
            transactions: [],
            lastUpdated: new Date().toISOString(),
          };
          setFinanceData(initialData);
          await saveData("finance", initialData, "finance.json");
          await saveData("finance", initialData, "finance.json");
          console.log("✅ Initial data saved");
        }

        // Load members for income transaction form
        try {
          console.log("🔄 Loading members for finance form...");
          let loadedMembers = await loadData<Member[]>("members");

          // Fallback to LocalStorage if File System is empty/failed
          if (!loadedMembers || loadedMembers.length === 0) {
            console.log("⚠️ File system members empty, trying localStorage...");
            const savedMembers = localStorage.getItem("church_erp_members");
            if (savedMembers) {
              loadedMembers = JSON.parse(savedMembers);
            }
          }

          if (loadedMembers && loadedMembers.length > 0) {
            console.log(`✅ Loaded ${loadedMembers.length} members for finance form`);
            setMembers(loadedMembers);
          } else {
            console.warn("⚠️ No members found in both file system and localStorage");
          }
        } catch (error) {
          console.error("❌ Failed to load members for finance form", error);
        }

      } catch (error) {
        console.error("❌ Failed to load finance data:", error);
        setFinanceData({
          accounts: defaultAccounts,
          transactions: [],
          lastUpdated: new Date().toISOString(),
        });
      }

      setIsLoading(false);
    };

    loadFinanceData();
  }, []);

  useEffect(() => {
    const cleanup = setupCurrencyListener((newCode) => {
      setCurrencyCode(newCode);
      setCurrencySymbol(getCurrencySymbol());
    });
    return cleanup;
  }, []);

  const saveFinanceData = async (data: FinanceData) => {
    const updatedData = { ...data, lastUpdated: new Date().toISOString() };
    setFinanceData(updatedData);

    console.log("💾 Saving finance data...", {
      accounts: updatedData.accounts.length,
      transactions: updatedData.transactions.length
    });

    try {
      await saveData("finance", updatedData, "finance.json");
      console.log("✅ Finance data saved successfully!");
    } catch (error) {
      console.error("❌ Failed to save finance data:", error);
    }
  };

  // =============== Account CRUD ===============
  const handleSaveAccount = async (account: Account) => {
    let updatedAccounts: Account[];
    let action = "";

    if (editingAccount) {
      updatedAccounts = financeData.accounts.map((a) =>
        a.id === account.id ? account : a
      );
      action = t("finance.audit.accountEdit", { name: account.name });
      console.log("✏️ Editing existing account:", account.name);
    } else {
      updatedAccounts = [...financeData.accounts, { ...account, id: `acc-${Date.now()}` }];
      action = t("finance.audit.accountAdd", { name: account.name });
      console.log("➕ Adding new account:", account.name);
    }

    saveFinanceData({ ...financeData, accounts: updatedAccounts });

    const typeLabel = account.type === 'income'
      ? t("finance.audit.accountTypeIncome")
      : t("finance.audit.accountTypeExpense");
    await logActivity("FINANCE", action, t("finance.audit.accountBody", { name: account.name, type: typeLabel }));

    setShowAccountModal(false);
    setEditingAccount(null);
  };

  const handleDeleteAccount = async () => {
    if (!deleteTarget || deleteTarget.type !== "account") return;

    const accountToDelete = financeData.accounts.find(a => a.id === deleteTarget.id);
    const updatedAccounts = financeData.accounts.filter((a) => a.id !== deleteTarget.id);
    const updatedTransactions = financeData.transactions.filter(
      (t) => t.accountId !== deleteTarget.id
    );

    saveFinanceData({
      ...financeData,
      accounts: updatedAccounts,
      transactions: updatedTransactions,
    });

    if (accountToDelete) {
      await logActivity(
        "FINANCE",
        t("finance.audit.accountDelete"),
        t("finance.audit.accountDeleteBody", { name: accountToDelete.name })
      );
    }

    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  // =============== Transaction CRUD ===============
  const handleSaveTransaction = async (transaction: Transaction) => {
    console.log("📥 handleSaveTransaction called:", transaction);

    let updatedTransactions: Transaction[];
    const isEditing = editingTransaction && editingTransaction.id;
    let action = "";
    let description = "";

    const account = financeData.accounts.find(a => a.id === transaction.accountId);
    const accountName = account ? account.name : "Unknown Account";

    if (isEditing) {
      updatedTransactions = financeData.transactions.map((t) =>
        t.id === transaction.id ? transaction : t
      );
      action = t("finance.audit.txnEdit");
      description = `${transaction.date} - ${transaction.description} (${accountName}): ${formatCurrencyUtil(transaction.amount, true)}`;
      console.log("✏️ Editing existing transaction:", transaction.id);
    } else {
      const newTransaction = {
        ...transaction,
        id: `txn-${Date.now()}`
      };
      updatedTransactions = [...financeData.transactions, newTransaction];
      action = t("finance.audit.txnAdd");
      description = `${transaction.date} - ${transaction.description} (${accountName}): ${formatCurrencyUtil(transaction.amount, true)}`;
      console.log("➕ Adding new transaction:", newTransaction.id);
    }

    setShowTransactionModal(false);
    setEditingTransaction(null);
    saveFinanceData({ ...financeData, transactions: updatedTransactions });

    // Log activity
    await logActivity("FINANCE", action, description);

    console.log("✅ Transaction saved, total:", updatedTransactions.length);
  };

  const handleDeleteTransaction = async () => {
    if (!deleteTarget || deleteTarget.type !== "transaction") return;

    const transactionToDelete = financeData.transactions.find(t => t.id === deleteTarget.id);
    const updatedTransactions = financeData.transactions.filter(
      (t) => t.id !== deleteTarget.id
    );

    saveFinanceData({ ...financeData, transactions: updatedTransactions });

    if (transactionToDelete) {
      await logActivity(
        "FINANCE",
        t("finance.audit.txnDelete"),
        `${transactionToDelete.date} - ${transactionToDelete.description}: ${formatCurrencyUtil(transactionToDelete.amount, true)}`
      );
    }

    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  // =============== Computed Values ===============
  const filteredTransactions = useMemo(() => {
    return financeData.transactions.filter((t) => {
      const dateMatch =
        t.date >= dateFilter.startDate && t.date <= dateFilter.endDate;
      const searchMatch =
        searchTerm === "" ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        financeData.accounts
          .find((a) => a.id === t.accountId)
          ?.name.toLowerCase()
          .includes(searchTerm.toLowerCase());
      return dateMatch && searchMatch;
    });
  }, [financeData.transactions, financeData.accounts, dateFilter, searchTerm]);

  const incomeTransactions = useMemo(() =>
    filteredTransactions.filter((t) => t.type === "income"),
    [filteredTransactions]
  );

  const expenseTransactions = useMemo(() =>
    filteredTransactions.filter((t) => t.type === "expense"),
    [filteredTransactions]
  );

  const ledgerData: LedgerRow[] = useMemo(() => {
    return financeData.accounts.map((account) => {
      const accountTransactions = financeData.transactions.filter(
        (t) => t.accountId === account.id
      );
      const income = accountTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);
      const expense = accountTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        ...account,
        opening: 0,
        income,
        expense,
        balance: income - expense,
      };
    });
  }, [financeData.accounts, financeData.transactions]);

  // Get available months from transactions
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    financeData.transactions.forEach((t) => {
      const date = new Date(t.date);
      const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
      monthSet.add(key);
    });
    const currentKey = `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, "0")}`;
    monthSet.add(currentKey);
    return Array.from(monthSet).sort().reverse();
  }, [financeData.transactions]);

  // Monthly filtered transactions
  const monthlyTransactions = useMemo(() => {
    return financeData.transactions.filter((t) => {
      const date = new Date(t.date);
      return date.getFullYear() === selectedYear && date.getMonth() + 1 === selectedMonth;
    });
  }, [financeData.transactions, selectedYear, selectedMonth]);

  const monthlyIncomeTransactions = useMemo(() =>
    monthlyTransactions.filter((t) => t.type === "income"),
    [monthlyTransactions]
  );

  const monthlyExpenseTransactions = useMemo(() =>
    monthlyTransactions.filter((t) => t.type === "expense"),
    [monthlyTransactions]
  );

  // Monthly totals
  const totals = useMemo(() => {
    const income = monthlyTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = monthlyTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, net: income - expense };
  }, [monthlyTransactions]);

  // Yearly totals
  const yearlyTotals = useMemo(() => {
    const yearlyTransactions = financeData.transactions.filter((t) => {
      const date = new Date(t.date);
      return date.getFullYear() === selectedYear;
    });
    const income = yearlyTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = yearlyTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
    return { income, expense, net: income - expense };
  }, [financeData.transactions, selectedYear]);

  // Account breakdown for pie charts
  const incomeByAccount: AccountBreakdown[] = useMemo(() => {
    const breakdown: AccountBreakdown[] = [];
    const colors = ["#22c55e", "#16a34a", "#15803d", "#166534", "#14532d", "#10b981", "#059669"];

    financeData.accounts
      .filter((a) => a.type === "income")
      .forEach((account, index) => {
        const amount = monthlyTransactions
          .filter((t) => t.type === "income" && t.accountId === account.id)
          .reduce((sum, t) => sum + t.amount, 0);
        if (amount > 0) {
          breakdown.push({
            name: account.name,
            amount,
            color: colors[index % colors.length],
          });
        }
      });
    return breakdown.sort((a, b) => b.amount - a.amount);
  }, [financeData.accounts, monthlyTransactions]);

  const expenseByAccount: AccountBreakdown[] = useMemo(() => {
    const breakdown: AccountBreakdown[] = [];
    const colors = ["#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#7f1d1d", "#f97316", "#ea580c"];

    financeData.accounts
      .filter((a) => a.type === "expense")
      .forEach((account, index) => {
        const amount = monthlyTransactions
          .filter((t) => t.type === "expense" && t.accountId === account.id)
          .reduce((sum, t) => sum + t.amount, 0);
        if (amount > 0) {
          breakdown.push({
            name: account.name,
            amount,
            color: colors[index % colors.length],
          });
        }
      });
    return breakdown.sort((a, b) => b.amount - a.amount);
  }, [financeData.accounts, monthlyTransactions]);

  // =============== Report Data ===============
  const reportData: ReportData = useMemo(() => {
    let filtered: Transaction[];

    if (reportType === "monthly") {
      filtered = financeData.transactions.filter((t) => {
        const date = new Date(t.date);
        return date.getFullYear() === reportYear && date.getMonth() + 1 === reportMonth;
      });
    } else {
      filtered = financeData.transactions.filter((t) => {
        const date = new Date(t.date);
        return date.getFullYear() === reportYear;
      });
    }

    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const incomeByAccount: Record<string, number> = {};
    const expenseByAccount: Record<string, number> = {};
    const groupedTransactions = {
      income: {} as Record<string, Transaction[]>,
      expense: {} as Record<string, Transaction[]>,
    };

    filtered.forEach((t) => {
      const account = financeData.accounts.find((a) => a.id === t.accountId);
      if (!account) return;

      if (t.type === "income") {
        incomeByAccount[account.name] = (incomeByAccount[account.name] || 0) + t.amount;
        if (!groupedTransactions.income[account.name]) groupedTransactions.income[account.name] = [];
        groupedTransactions.income[account.name].push(t);
      } else {
        expenseByAccount[account.name] = (expenseByAccount[account.name] || 0) + t.amount;
        if (!groupedTransactions.expense[account.name]) groupedTransactions.expense[account.name] = [];
        groupedTransactions.expense[account.name].push(t);
      }
    });

    const totalIncome = Object.values(incomeByAccount).reduce((a, b) => a + b, 0);
    const totalExpense = Object.values(expenseByAccount).reduce((a, b) => a + b, 0);

    return {
      incomeByAccount,
      expenseByAccount,
      groupedTransactions,
      totalIncome,
      totalExpense,
      netIncome: totalIncome - totalExpense,
      transactionCount: filtered.length,
    };
  }, [financeData, reportType, reportYear, reportMonth]);

  // =============== Helpers ===============
  const formatCurrency = useCallback((amount: number, useLarge: boolean = false): string => {
    if (useLarge) {
      return formatLargeCurrency(amount);
    }
    return formatCurrencyUtil(amount, true);
    // currencyCode is in deps to trigger re-render on currency change
  }, [currencyCode]);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // =============== Render Tab Content ===============
  const renderTabContent = () => {
    switch (activeTab) {
      case "ledger":
        return (
          <LedgerView
            ledgerData={ledgerData}
            monthlyTransactions={monthlyTransactions}
            monthlyIncomeTransactions={monthlyIncomeTransactions}
            monthlyExpenseTransactions={monthlyExpenseTransactions}
            incomeByAccount={incomeByAccount}
            expenseByAccount={expenseByAccount}
            totals={totals}
            yearlyTotals={yearlyTotals}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            detailView={detailView}
            formatCurrency={formatCurrency}
            setDetailView={setDetailView}
            onAddAccount={() => {
              setEditingAccount(null);
              setShowAccountModal(true);
            }}
            onEditAccount={(account) => {
              setEditingAccount(account);
              setShowAccountModal(true);
            }}
            onDeleteAccount={(accountId) => {
              setDeleteTarget({ type: "account", id: accountId });
              setShowDeleteConfirm(true);
            }}
          />
        );
      case "income":
        return (
          <TransactionManagementView
            type="income"
            transactions={incomeTransactions}
            accounts={financeData.accounts}
            dateFilter={dateFilter}
            searchTerm={searchTerm}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            onDateFilterChange={setDateFilter}
            onSearchChange={setSearchTerm}
            onAdd={() => {
              setEditingTransaction({
                id: "",
                accountId: financeData.accounts.find(a => a.type === "income")?.id || "",
                date: new Date().toISOString().split("T")[0],
                description: "",
                amount: 0,
                type: "income",
              });
              setShowTransactionModal(true);
            }}
            onEdit={(txn) => {
              setEditingTransaction(txn);
              setShowTransactionModal(true);
            }}
            onDelete={(txnId) => {
              setDeleteTarget({ type: "transaction", id: txnId });
              setShowDeleteConfirm(true);
            }}
          />
        );
      case "expense":
        return (
          <TransactionManagementView
            type="expense"
            transactions={expenseTransactions}
            accounts={financeData.accounts}
            dateFilter={dateFilter}
            searchTerm={searchTerm}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            onDateFilterChange={setDateFilter}
            onSearchChange={setSearchTerm}
            onAdd={() => {
              setEditingTransaction({
                id: "",
                accountId: financeData.accounts.find(a => a.type === "expense")?.id || "",
                date: new Date().toISOString().split("T")[0],
                description: "",
                amount: 0,
                type: "expense",
              });
              setShowTransactionModal(true);
            }}
            onEdit={(txn) => {
              setEditingTransaction(txn);
              setShowTransactionModal(true);
            }}
            onDelete={(txnId) => {
              setDeleteTarget({ type: "transaction", id: txnId });
              setShowDeleteConfirm(true);
            }}
          />
        );
      case "report":
        return (
          <ReportView
            reportData={reportData}
            reportType={reportType}
            reportYear={reportYear}
            reportMonth={reportMonth}
            formatCurrency={formatCurrency}
            onReportTypeChange={setReportType}
            onYearChange={setReportYear}
            onMonthChange={setReportMonth}
          />
        );
      default:
        return null;
    }
  };

  // =============== Main Render ===============
  if (isLoading) {
    return (
      <div className="finance-page loading">
        <div className="loading-spinner">
          <span className="material-symbols-outlined rotating">sync</span>
          <p>{t("finance.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="finance-page">
      {/* Sidebar */}
      <FinanceSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="finance-content">
        <FinanceHeader
          activeTab={activeTab}
          currencyCode={currencyCode}
          currencySymbol={currencySymbol}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          showMonthSelector={showMonthSelector}
          availableMonths={availableMonths}
          onMonthSelectorToggle={() => setShowMonthSelector(!showMonthSelector)}
          onMonthSelect={(year, month) => {
            setSelectedYear(year);
            setSelectedMonth(month);
            setShowMonthSelector(false);
          }}
          onDetailViewReset={() => setDetailView("overview")}
        />

        <div className="finance-main">
          <div className="finance-main__inner">
            {renderTabContent()}
          </div>
        </div>
      </main>

      {/* Account Modal */}
      {showAccountModal && (
        <div className="settings-modal-overlay" onClick={() => setShowAccountModal(false)}>
          <div className="settings-modal settings-modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal__header">
              <h3 className="settings-modal__title">{editingAccount?.id ? t("finance.modal.accountEdit") : t("finance.modal.accountNew")}</h3>
              <button className="icon-btn" onClick={() => setShowAccountModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="settings-modal__body">
              <AccountForm
                account={editingAccount}
                accounts={financeData.accounts}
                onSave={handleSaveAccount}
                onCancel={() => {
                  setShowAccountModal(false);
                  setEditingAccount(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {showTransactionModal && (
        <div className="modal-overlay" onClick={() => setShowTransactionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingTransaction?.id ? t("finance.modal.transactionEdit") :
                  editingTransaction?.type === "income" ? t("finance.modal.transactionIncomeNew") : t("finance.modal.transactionExpenseNew")}
              </h3>
              <button className="modal-close" onClick={() => setShowTransactionModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <TransactionForm
              transaction={editingTransaction}
              accounts={financeData.accounts}
              members={members}
              onSave={handleSaveTransaction}
              onCancel={() => {
                setShowTransactionModal(false);
                setEditingTransaction(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        }}
        onConfirm={() => {
          if (deleteTarget?.type === "account") {
            handleDeleteAccount();
          } else {
            handleDeleteTransaction();
          }
        }}
        message={
          deleteTarget?.type === "account"
            ? t("finance.deleteConfirm.account")
            : t("finance.deleteConfirm.transaction")
        }
      />
    </div>
  );
}

export default Finance;
