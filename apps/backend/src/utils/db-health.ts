/**
 * データベース接続状態を管理するユーティリティ
 * 接続状態をキャッシュして、毎回タイムアウトを待つことを避ける
 */

import prisma from '../config/database';

class DatabaseHealthChecker {
  private isConnected: boolean | null = null;
  private lastCheckTime: number = 0;
  private checkInterval: number = 30000; // 30秒ごとに再チェック
  private isChecking: boolean = false;

  /**
   * データベース接続状態を確認
   */
  async checkConnection(): Promise<boolean> {
    const now = Date.now();

    // 前回のチェックから30秒以内であれば、キャッシュされた結果を返す
    if (this.isConnected !== null && now - this.lastCheckTime < this.checkInterval) {
      return this.isConnected;
    }

    // すでにチェック中の場合は、前回の結果を返す
    if (this.isChecking) {
      return this.isConnected ?? false;
    }

    this.isChecking = true;

    try {
      // シンプルなクエリでタイムアウト付きで接続を確認
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database connection timeout')), 2000)
        ),
      ]);

      this.isConnected = true;
      this.lastCheckTime = now;
      console.log('✓ Database connection established');
      return true;
    } catch (error) {
      this.isConnected = false;
      this.lastCheckTime = now;
      console.warn('✗ Database connection failed, using mock storage');
      return false;
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * 接続状態を即座に取得（チェックしない）
   */
  isDbConnected(): boolean {
    return this.isConnected ?? false;
  }

  /**
   * 接続状態をリセット（テスト用）
   */
  reset(): void {
    this.isConnected = null;
    this.lastCheckTime = 0;
  }
}

export const dbHealthChecker = new DatabaseHealthChecker();
