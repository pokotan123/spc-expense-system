import { redirect } from 'next/navigation';

export default function HomePage() {
  // ルートページは常にログインページにリダイレクト
  // 認証状態のチェックは各ページで行う
  redirect('/login');
}
