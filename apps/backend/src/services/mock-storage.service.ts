/**
 * モックデータストレージサービス
 * データベース接続がない場合に使用するメモリ上のストレージ
 */

interface MockApplication {
  id: number;
  memberId: number;
  status: string;
  expenseDate: Date;
  amount: number;
  description: string;
  isCashPayment: boolean;
  proposedAmount?: number | null;
  finalAmount?: number | null;
  internalCategoryId?: number | null;
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date | null;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  member?: any;
  receipts?: any[];
  comments?: any[];
}

class MockStorageService {
  private applications: Map<number, MockApplication> = new Map();
  private nextId: number = Date.now();

  /**
   * 申請を保存
   */
  saveApplication(application: MockApplication): MockApplication {
    if (!application.id) {
      application.id = this.nextId++;
    }
    this.applications.set(application.id, { ...application });
    return { ...application };
  }

  /**
   * IDで申請を取得
   */
  getApplicationById(id: number): MockApplication | null {
    const application = this.applications.get(id);
    return application ? { ...application } : null;
  }

  /**
   * 会員IDで申請一覧を取得
   */
  getApplicationsByMemberId(memberId: number, status?: string): MockApplication[] {
    let applications = Array.from(this.applications.values())
      .filter((app) => app.memberId === memberId);

    if (status) {
      applications = applications.filter((app) => app.status === status);
    }

    return applications.map((app) => ({ ...app })).sort((a, b) => {
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  /**
   * 申請を更新
   */
  updateApplication(id: number, updates: Partial<MockApplication>): MockApplication | null {
    const application = this.applications.get(id);
    if (!application) {
      return null;
    }

    const updated = {
      ...application,
      ...updates,
      updatedAt: new Date(),
    };
    this.applications.set(id, updated);
    return { ...updated };
  }

  /**
   * 申請を削除
   */
  deleteApplication(id: number): boolean {
    return this.applications.delete(id);
  }

  /**
   * すべての申請を取得（管理者用）
   */
  getAllApplications(status?: string): MockApplication[] {
    let applications = Array.from(this.applications.values());

    if (status) {
      applications = applications.filter((app) => app.status === status);
    }

    return applications.map((app) => ({ ...app })).sort((a, b) => {
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }
}

export const mockStorageService = new MockStorageService();
