/**
 * モックデータストレージサービス
 * データベース接続がない場合に使用するメモリ上のストレージ
 */

interface MockComment {
  id: number;
  expenseApplicationId: number;
  memberId: number;
  comment: string;
  commentType: 'approval' | 'rejection' | 'return' | 'general';
  createdAt: Date;
  member?: any;
}

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
  comments?: MockComment[];
}

class MockStorageService {
  private applications: Map<number, MockApplication> = new Map();
  private comments: Map<number, MockComment> = new Map();
  private nextId: number = Date.now();
  private nextCommentId: number = Date.now();

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
    if (!application) {
      return null;
    }
    
    // コメントを取得
    const appComments = Array.from(this.comments.values())
      .filter((c) => c.expenseApplicationId === id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return {
      ...application,
      comments: appComments,
    };
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

    return applications.map((app) => {
      // コメントを取得
      const appComments = Array.from(this.comments.values())
        .filter((c) => c.expenseApplicationId === app.id)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      return {
        ...app,
        comments: appComments,
      };
    }).sort((a, b) => {
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  /**
   * コメントを追加
   */
  addComment(expenseApplicationId: number, memberId: number, comment: string, commentType: 'approval' | 'rejection' | 'return' | 'general'): MockComment {
    const newComment: MockComment = {
      id: this.nextCommentId++,
      expenseApplicationId,
      memberId,
      comment,
      commentType,
      createdAt: new Date(),
      member: {
        id: memberId,
        name: '事務局',
        role: 'admin',
      },
    };
    this.comments.set(newComment.id, newComment);
    return { ...newComment };
  }

  /**
   * 領収書を申請に追加
   */
  addReceipt(expenseApplicationId: number, receipt: any): void {
    const application = this.applications.get(expenseApplicationId);
    if (application) {
      if (!application.receipts) {
        application.receipts = [];
      }
      application.receipts.push(receipt);
      this.applications.set(expenseApplicationId, application);
    }
  }

  /**
   * 申請の領収書を取得
   */
  getReceiptsByApplicationId(expenseApplicationId: number): any[] {
    const application = this.applications.get(expenseApplicationId);
    return application?.receipts || [];
  }
}

export const mockStorageService = new MockStorageService();
