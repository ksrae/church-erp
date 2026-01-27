// =============== Finance Types ===============

export interface Account {
  id: string;
  code: string;
  name: string;
  subName: string;
  type: "asset" | "income" | "expense";
  description?: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category?: string;
  memo?: string;
}

export interface FinanceData {
  accounts: Account[];
  transactions: Transaction[];
  lastUpdated: string;
}

export type TabType = "ledger" | "income" | "expense" | "report";
export type DetailViewType = "overview" | "income" | "expense" | "net";

export interface LedgerRow extends Account {
  opening: number;
  income: number;
  expense: number;
  balance: number;
}

export interface AccountBreakdown {
  name: string;
  amount: number;
  color: string;
}

export interface ReportData {
  incomeByAccount: Record<string, number>;
  expenseByAccount: Record<string, number>;
  groupedTransactions: {
    income: Record<string, Transaction[]>;
    expense: Record<string, Transaction[]>;
  };
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  transactionCount: number;
}

// =============== Initial Data ===============
export const initialFinanceData: FinanceData = {
  accounts: [],
  transactions: [],
  lastUpdated: "",
};

export const defaultAccounts: Account[] = [
  { id: "acc-1", code: "1000", name: "현금", subName: "Cash", type: "asset" },
  { id: "acc-2", code: "1100", name: "은행예금", subName: "Bank Deposit", type: "asset" },
  { id: "acc-3", code: "4000", name: "십일조", subName: "Tithe", type: "income" },
  { id: "acc-4", code: "4100", name: "감사헌금", subName: "Thanksgiving Offering", type: "income" },
  { id: "acc-5", code: "4200", name: "주일헌금", subName: "Sunday Offering", type: "income" },
  { id: "acc-6", code: "4300", name: "선교헌금", subName: "Mission Offering", type: "income" },
  { id: "acc-7", code: "5000", name: "인건비", subName: "Personnel Expense", type: "expense" },
  { id: "acc-8", code: "5100", name: "선교비", subName: "Mission Expense", type: "expense" },
  { id: "acc-9", code: "5200", name: "교육비", subName: "Education Expense", type: "expense" },
  { id: "acc-10", code: "5300", name: "시설유지비", subName: "Facility Maintenance", type: "expense" },
];
