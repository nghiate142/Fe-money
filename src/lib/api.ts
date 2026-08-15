import axios from 'axios';

const TOKEN_KEY = 'money.token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      // Reload để quay về màn hình đăng nhập, không cần state toàn cục.
      if (!location.pathname.startsWith('/login')) location.reload();
    }
    return Promise.reject(error);
  },
);

/** Lấy message lỗi từ response của Nest, fallback về message của axios. */
export function errorMessage(e: unknown): string {
  const m = (e as any)?.response?.data?.message;
  if (Array.isArray(m)) return m.join(', ');
  return m ?? (e as any)?.message ?? 'Có lỗi xảy ra';
}

export type Page<T> = { items: T[]; total: number; page: number; limit: number };

export type Kind = 'income' | 'expense';
/** operating = kinh doanh/tiêu dùng, financing = vay/trả gốc, interest = lãi vay. */
export type Nature = 'operating' | 'financing' | 'interest';
export type DebtStatus = 'active' | 'overdue' | 'paid';

/** `code` khác null = danh mục hệ thống, không sửa/xoá được. */
export type Category = { id: number; name: string; kind: Kind; code: string | null };

export type Person = {
  id: number;
  name: string;
  phone: string | null;
  note: string | null;
  iOwe: number;
  owesMe: number;
  debtCount: number;
};
export type Project = {
  id: number;
  name: string;
  startedAt: string;
  closedAt: string | null;
  note: string | null;
  income?: number;
  expense?: number;
  profit?: number;
};
export type Currency = { code: string; name: string; decimals: number };

export type RateResult = {
  currency: string;
  date: string;
  rate: number;
  source: 'api' | 'cache' | 'nearest' | 'manual';
  stale?: boolean;
};

export type Transaction = {
  id: number;
  date: string;
  /** Luôn là VND — mọi báo cáo tính trên trường này. */
  amount: number;
  /** Tiền như đã thanh toán: `originalAmount` theo đơn vị nhỏ nhất (USD = cent). */
  currency: string;
  originalAmount: number;
  rate: number;
  /** Phí giao dịch (VND), đã cộng trong `amount`. */
  fee: number;
  kind: Kind;
  nature: Nature;
  note: string | null;
  categoryId: number;
  category: Category;
  projectId: number | null;
  project: { id: number; name: string } | null;
  /** Trả cho ai / nhận từ ai — không dính tới dư nợ. */
  personId: number | null;
  person: { id: number; name: string } | null;
  /** Khác null = giao dịch sinh từ khoản nợ, chỉ sửa được ở tab Nợ. */
  debtId: number | null;
  debtPaymentId: number | null;
};

export type DebtPayment = {
  id: number;
  debtId: number;
  date: string;
  principalAmount: number;
  interestAmount: number;
  note: string | null;
};

export type LoanType = 'personal' | 'unsecured' | 'secured' | 'overdraft';
export type InterestMethod =
  | 'none'
  | 'flat'
  | 'declining'
  | 'annuity'
  | 'fixed'
  | 'contract';

export const LOAN_TYPE_LABEL: Record<LoanType, string> = {
  personal: 'Vay mượn cá nhân',
  unsecured: 'Vay tín chấp',
  secured: 'Vay thế chấp',
  overdraft: 'Vay thấu chi',
};

export const METHOD_LABEL: Record<InterestMethod, string> = {
  none: 'Không tính lãi theo công thức',
  flat: 'Lãi phẳng trên gốc ban đầu',
  declining: 'Lãi trên dư nợ giảm dần',
  annuity: 'Trả góp đều (EMI)',
  fixed: 'Số tiền lãi cố định mỗi tháng',
  contract: 'Theo hợp đồng (chép số của bên cho vay)',
};

/** Cách tính lãi gợi ý theo loại vay — vẫn đổi được. */
export const DEFAULT_METHOD: Record<LoanType, InterestMethod> = {
  personal: 'none',
  unsecured: 'flat',
  secured: 'declining',
  overdraft: 'fixed',
};

export type SchedulePeriod = {
  index: number;
  dueDate: string;
  opening: number;
  principal: number;
  interest: number;
  payment: number;
  closing: number;
  dueToDate: number;
  paidToDate: number;
  shortfall: number;
  status: 'paid' | 'partial' | 'late' | 'upcoming';
};

export type LoanSchedule = {
  periods: SchedulePeriod[];
  summary: {
    totalPrincipal: number;
    totalInterest: number;
    totalPayment: number;
    paidTotal: number;
    nextDueDate: string | null;
    nextPayment: number;
    overdueAmount: number;
    periodsLeft: number;
  };
};

export type Debt = {
  id: number;
  personId: number;
  person: { id: number; name: string; phone: string | null };
  direction: 'i_owe' | 'owes_me';
  principal: number;
  date: string;
  dueDate: string | null;
  /** false = khoản vay cũ, tiền đã tiêu hết: chỉ theo dõi dư nợ, không cộng vào số dư. */
  affectsBalance: boolean;
  loanType: LoanType;
  interestMethod: InterestMethod;
  interestRate: number | null;
  fixedInterestAmount: number | null;
  contractPayment: number | null;
  contractLastPayment: number | null;
  termMonths: number | null;
  paymentDay: number | null;
  interestNote: string | null;
  note: string | null;
  projectId: number | null;
  project: { id: number; name: string } | null;
  payments: DebtPayment[];
  /** Tính lại từ các lần trả, không lưu trong DB. */
  paid: number;
  interestPaid: number;
  remaining: number;
  status: DebtStatus;
};
