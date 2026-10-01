'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) router.push('/login');
    else setUser(user);
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">載入中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <header className="max-w-5xl mx-auto bg-white rounded-2xl p-4 px-6 shadow-sm border flex justify-between items-center mb-8">
        <h1 className="text-xl font-extrabold text-slate-800">🎯 IELTS TRAINER</h1>
        <div className="flex gap-4 items-center">
          <span className="text-sm text-slate-600">{user?.email}</span>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-xl">登出</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-800">📚 雅思單字庫</h3>
            <p className="text-sm text-slate-600">自訂每日目標，閃卡獨立背誦</p>
            <Link href="/vocab" className="block text-center py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl">進入單字閃卡</Link>
          </div>

          <div className="bg-white rounded-3xl p-6 border shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-800">✍️ AI 寫作精準批改</h3>
            <p className="text-sm text-slate-600">Gemini 深度分析 TR/CC/LR/GRA</p>
            <Link href="/writing" className="block text-center py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl">進入寫作批改</Link>
          </div>

          <div className="bg-white rounded-3xl p-6 border shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-800">🎧 聽力精聽特訓</h3>
            <p className="text-sm text-slate-600">英音變速播放與精準聽寫比對</p>
            <Link href="/listening" className="block text-center py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl">進入聽力特訓</Link>
          </div>

          <div className="bg-white rounded-3xl p-6 border shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-800">🎙️ AI 口說模擬考官</h3>
            <p className="text-sm text-slate-600">語音即時辨識與考官批改報告</p>
            <Link href="/speaking" className="block text-center py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl">進入口說特訓</Link>
          </div>
        </div>
      </main>
    </div>
  );
}