// API型定義
export interface Member {
  id: number;
  memberId: string;
  name: string;
  email: string;
  departmentId: number;
  department?: Department;
  role: 'member' | 'admin' | 'manager';
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseApplication {
  id: number;
  memberId: number;
  member?: Member;
  status: 'draft' | 'submitted' | 'returned' | 'approved' | 'rejected';
  expenseDate: string;
  amount: number;
  proposedAmount?: number;
  finalAmount?: number;
  description: string;
  internalCategoryId?: number;
  internalCategory?: InternalCategory;
  isCashPayment: boolean;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  receipts?: Receipt[];
  comments?: ApplicationComment[];
}

export interface Receipt {
  id: number;
  expenseApplicationId: number;
  fileName: string;
  filePath: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
  ocrResult?: OCRResult;
}

export interface OCRResult {
  id: number;
  receiptId: number;
  extractedDate?: string;
  extractedAmount?: number;
  extractedStoreName?: string;
  extractedText?: string;
  confidence?: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface InternalCategory {
  id: number;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationComment {
  id: number;
  expenseApplicationId: number;
  memberId: number;
  member?: Member;
  comment: string;
  commentType: 'approval' | 'rejection' | 'return' | 'general';
  createdAt: string;
}

export interface Dashboard {
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  returnedApplications: number;
  totalAmount: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  member: Member;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
