'use client';

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('註冊成功！請直接輸入帳號密碼登入。');
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        // 💡 1. 手動將 session token 寫入 Cookie 給 Middleware 讀取
        if (data.session) {
          document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=3600; SameSite=Lax`;
          document.cookie = `sb-refresh-token=${data.session.refresh_token}; path=/; max-age=86400; SameSite=Lax`;
        }

        // 💡 2. 使用硬重新載入跳轉至首頁，帶上最新 Cookie
        window.location.href = '/';
      }
    } catch (err: any) {
      setErrorMsg(err.message || '發生錯誤，請檢查帳號密碼');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-800">🎯 IELTS TRAINER</h1>
          <p className="text-sm text-slate-500 mt-2">
            {isSignUp ? '建立專屬帳號，開啟雅思高效備考' : '歡迎回來！登入你的私人訓練器'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Email 帳號</label>
            <input
              type="email"
              required
              className="bg-white text-slate-900 placeholder-slate-400 w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">密碼</label>
            <input
              type="password"
              required
              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transitionbg-white text-slate-900 placeholder-slate-400"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition duration-200 disabled:opacity-50"
          >
            {loading ? '處理中...' : isSignUp ? '立即免費註冊' : '登入系統'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition"
          >
            {isSignUp ? '已有帳號？點此登入' : '還沒有帳號？免費建立一個'}
          </button>
        </div>
      </div>
    </div>
  );
}