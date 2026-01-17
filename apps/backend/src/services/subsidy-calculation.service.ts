import prisma from '../config/database';

/**
 * 補助金額算出サービス
 * 申請金額に基づいて補助金額を提案する
 */
export interface SubsidyCalculationResult {
  proposedAmount: number;
  calculationMethod: string;
  details?: Record<string, unknown>;
}

export const subsidyCalculationService = {
  /**
   * 補助金額を算出
   * @param amount 申請金額
   * @param internalCategoryId 社内カテゴリID（オプション）
   * @param memberId 会員ID（オプション、過去の申請履歴を参照する場合）
   * @returns 算出結果
   */
  calculate: async (
    amount: number,
    internalCategoryId?: number,
    memberId?: number
  ): Promise<SubsidyCalculationResult> => {
    try {
      // TODO: 実際の補助金額算出ロジックを実装
      // 現在は簡易実装

      // カテゴリ別の補助率を取得（将来的にマスタから取得）
      const categoryRates: Record<number, number> = {
        // 例: カテゴリIDと補助率のマッピング
        1: 0.8, // 交通費: 80%
        2: 1.0, // 会議費: 100%
        3: 0.5, // 通信費: 50%
        4: 0.7, // 消耗品費: 70%
      };

      let rate = 1.0; // デフォルト100%

      if (internalCategoryId && categoryRates[internalCategoryId]) {
        rate = categoryRates[internalCategoryId];
      }

      // 補助金額を算出
      const proposedAmount = Math.floor(amount * rate);

      // 上限チェック（例: 10万円まで）
      const maxAmount = 100000;
      const finalAmount = Math.min(proposedAmount, maxAmount);

      return {
        proposedAmount: finalAmount,
        calculationMethod: internalCategoryId
          ? `カテゴリ別補助率適用 (${rate * 100}%)`
          : '標準補助率適用 (100%)',
        details: {
          originalAmount: amount,
          rate,
          calculatedAmount: proposedAmount,
          maxAmount,
          finalAmount,
        },
      };
    } catch (error) {
      console.error('Subsidy calculation error:', error);
      // エラー時は申請金額をそのまま返す
      return {
        proposedAmount: amount,
        calculationMethod: 'エラー時デフォルト',
      };
    }
  },

  /**
   * 申請承認時に補助金額を再算出
   * 事務局が承認する際に、最新のロジックで再計算
   */
  recalculateOnApproval: async (
    applicationId: number,
    internalCategoryId: number
  ): Promise<number> => {
    try {
      const application = await prisma.expenseApplication.findUnique({
        where: { id: applicationId },
      });

      if (!application) {
        throw new Error('Application not found');
      }

      const result = await subsidyCalculationService.calculate(
        application.amount.toNumber(),
        internalCategoryId,
        application.memberId
      );

      return result.proposedAmount;
    } catch (error) {
      console.error('Recalculate on approval error:', error);
      throw error;
    }
  },
};
