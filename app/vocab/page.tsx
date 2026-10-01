'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface VocabItem {
  id: number;
  word: string;
  phonetic: string;
  pos: string;
  definition_tw: string;
  collocation: string;
  example_sentence: string;
  band_level: string;
  ielts_topic: string;
}

export default function VocabPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. 每日目標 (LocalStorage)
  const [dailyGoal, setDailyGoal] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vocab_daily_goal');
      return saved ? parseInt(saved, 10) : 20;
    }
    return 20;
  });

  const [inputValue, setInputValue] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('vocab_daily_goal') || '20';
    }
    return '20';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vocab_daily_goal', dailyGoal.toString());
    }
  }, [dailyGoal]);

  // 2. 單字佇列與當前索引
  const [words, setWords] = useState<VocabItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // 3. 統計數據
const [completedCount, setCompletedCount] = useState<number>(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('vocab_today_count');
    return saved ? parseInt(saved, 10) : 0;
  }
  return 0;
  });
const [stats, setStats] = useState<{ totalLearned: number; masteredCount: number }>(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('vocab_stats');
    return saved ? JSON.parse(saved) : { totalLearned: 0, masteredCount: 0 };
  }
  return { totalLearned: 0, masteredCount: 0 };
});
  // 4. 自動儲存背誦中途的佇列快取與統計數字
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (words.length > 0) {
        localStorage.setItem('vocab_current_words', JSON.stringify(words));
        localStorage.setItem('vocab_current_index', currentIndex.toString());
      }
      // 同步存入統計數字，避免退出歸零
      localStorage.setItem('vocab_today_count', completedCount.toString());
      localStorage.setItem('vocab_stats', JSON.stringify(stats));
    }
  }, [words, currentIndex, completedCount, stats]);

  // 初始化載入
  useEffect(() => {
    initFetch();
  }, [dailyGoal]);

  const initFetch = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }
    setUser(user);

    // 先檢查是否有未完成的快取佇列
    if (typeof window !== 'undefined') {
      const savedWords = localStorage.getItem('vocab_current_words');
      const savedIndex = localStorage.getItem('vocab_current_index');

      if (savedWords) {
        try {
          const parsed = JSON.parse(savedWords);
          const index = savedIndex ? parseInt(savedIndex, 10) : 0;
         if (parsed.length > 0 && index < parsed.length) {
            setWords(parsed);
            setCurrentIndex(index);
            
            // 讀取本地保存的統計數字
            const savedCount = localStorage.getItem('vocab_today_count');
            const savedStats = localStorage.getItem('vocab_stats');
            if (savedCount) setCompletedCount(parseInt(savedCount, 10));
            if (savedStats) setStats(JSON.parse(savedStats));

            setLoading(false);
            return;
          }
        } catch (e) {
          console.error('快取解析失敗', e);
        }
      }
    }

    // 無快取才向 API 請求
    try {
      const res = await fetch(`/api/vocab?userId=${user.id}&limit=${dailyGoal}&t=${Date.now()}`);
      const data = await res.json();

     if (res.ok && data.words) {
        setWords(data.words);
        setStats(data.stats || { totalLearned: 0, masteredCount: 0 });
        
        // 優先取 API 與本地最大值，避免被 0 覆蓋
        const savedCount = localStorage.getItem('vocab_today_count');
        const localCount = savedCount ? parseInt(savedCount, 10) : 0;
        const apiCount = data.stats?.todayCount || 0;
        setCompletedCount(Math.max(apiCount, localCount));

        setCurrentIndex(0);
      }
    } catch (err) {
      console.error('Fetch exception:', err);
    } finally {
      setLoading(false);
    }
  };

  // 核心邏輯：按鈕操作
  const handleAction = async (status: 'mastered' | 'uncertain' | 'forgot') => {
    if (!user || !words[currentIndex]) return;

    const currentWord = words[currentIndex];
    setIsFlipped(false);

    try {
      const isMastered = status === 'mastered';

      // 寫入 Supabase 紀錄
      const res = await fetch('/api/vocab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          vocabId: currentWord.id,
          remembered: isMastered,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(`進度儲存失敗：${data.error || '未知錯誤'}`);
        return;
      }

      if (isMastered) {
        // ✅ 完全掌握：更新統計並將該單字徹底過濾
        setCompletedCount((prev) => prev + 1);
        setStats((prev) => ({
          totalLearned: prev.totalLearned + 1,
          masteredCount: prev.masteredCount + 1,
        }));

        // 從佇列中濾除此單字
        const nextWords = words.filter((w) => w.id !== currentWord.id);
        setWords(nextWords);

        // 如果濾除後已無剩餘單字，清空快取
        if (nextWords.length === 0 || currentIndex >= nextWords.length) {
          clearCache();
        }
      } else {
        // 🧠 忘記/不確定：先取出單字，再插入後面第 3 或第 7 位
        const offset = status === 'forgot' ? 3 : 7;
        const nextWords = [...words];

        // 1. 從當前位置移除
        nextWords.splice(currentIndex, 1);

        // 2. 計算插入新索引位置
        const targetIndex = Math.min(currentIndex + offset - 1, nextWords.length);

        // 3. 插入該單字
        nextWords.splice(targetIndex, 0, currentWord);

        setWords(nextWords);
        // 注意：無需 setCurrentIndex + 1，因為原位置的單字移走後，後面的單字自動遞補上來！
      }
    } catch (err: any) {
      alert(`網路請求失敗：${err.message}`);
    }
  };

  const clearCache = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vocab_current_words');
      localStorage.removeItem('vocab_current_index');
    }
  };

  // Web Speech API AI 發音
  const speakWord = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const currentWord = words[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-500">
        🔍 正在載入單字進度...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      {/* 頂部導覽列與進度面板 */}
      <div className="max-w-2xl w-full bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6 space-y-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xs font-bold text-blue-600 hover:underline">
            ← 返回儀表板
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">每日目標：</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={1}
                max={500}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const num = Math.max(1, parseInt(inputValue) || 1);
                    setDailyGoal(num);
                  }
                }}
                className="w-16 p-1 border border-slate-200 rounded-xl text-xs font-bold bg-white text-blue-600 text-center outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs font-bold text-slate-500">個</span>
              <button
                type="button"
                onClick={() => {
                  const num = Math.max(1, parseInt(inputValue) || 1);
                  setDailyGoal(num);
                }}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition"
              >
                更新
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl text-center">
          <div>
            <span className="text-xs text-slate-400 font-bold block">今日進度</span>
            <span className="text-lg font-extrabold text-blue-600">
              {completedCount} / {dailyGoal}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block">累計已學</span>
            <span className="text-lg font-extrabold text-slate-700">{stats.totalLearned} 字</span>
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold block">完全掌握</span>
            <span className="text-lg font-extrabold text-emerald-600">{stats.masteredCount} 字</span>
          </div>
        </div>
      </div>

      {/* 單字卡片 / 完結結算 */}
      {!currentWord || words.length === 0 ? (
        <div className="max-w-2xl w-full bg-white rounded-3xl p-10 text-center border border-slate-100 shadow-sm space-y-4">
          <div className="text-5xl">🎉</div>
          <h2 className="text-xl font-bold text-slate-800">完成今日背誦目標！</h2>
          <p className="text-sm text-slate-500">所有進度已同步至 Supabase 雲端資料庫。</p>
          <button
            onClick={() => {
              clearCache();
              initFetch();
            }}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-md hover:bg-blue-700 transition"
          >
            載入未學習的新單字
          </button>
        </div>
      ) : (
        <div className="max-w-2xl w-full flex flex-col items-center">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full min-h-[340px] bg-white rounded-3xl shadow-md border border-slate-100 p-8 flex flex-col justify-between cursor-pointer hover:border-blue-300 transition select-none"
          >
            <div className="flex justify-between items-center">
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full">
                Band {currentWord.band_level || '6.5'} • {currentWord.ielts_topic || 'General'}
              </span>
              <span className="text-xs text-slate-400">點擊卡片翻面 🔄</span>
            </div>

            <div className="text-center my-auto">
              <div className="flex justify-center items-center gap-3">
                <h2 className="text-4xl font-extrabold text-slate-900 tracking-wide">
                  {currentWord.word}
                </h2>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    speakWord(currentWord.word);
                  }}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition text-xl"
                  title="聽發音"
                >
                  🔊
                </button>
              </div>

              {currentWord.phonetic && (
                <p className="text-sm text-slate-500 mt-2">{currentWord.phonetic} {currentWord.pos && `(${currentWord.pos})`}</p>
              )}

              {isFlipped && (
                <div className="mt-6 pt-6 border-t border-slate-100 text-left space-y-3">
                  <div>
                    <span className="text-xs font-bold text-slate-400 block">中文釋義</span>
                    <p className="text-lg font-bold text-slate-800">{currentWord.definition_tw}</p>
                  </div>
                  {currentWord.collocation && (
                    <div>
                      <span className="text-xs font-bold text-slate-400 block">高分搭配詞</span>
                      <p className="text-sm font-bold text-blue-600">{currentWord.collocation}</p>
                    </div>
                  )}
                  {currentWord.example_sentence && (
                    <div>
                      <span className="text-xs font-bold text-slate-400 block">雅思實戰例句</span>
                      <p className="text-sm text-slate-700 italic">"{currentWord.example_sentence}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="text-center text-xs text-slate-400">
              {isFlipped ? '再點擊一次隱藏細節' : '點擊查看中文釋義與搭配詞'}
            </div>
          </div>

          {/* 底部 3 個操作按鈕 */}
          <div className="flex gap-3 w-full mt-6">
            <button
              onClick={() => handleAction('forgot')}
              className="flex-1 py-3.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-2xl transition text-sm flex flex-col items-center justify-center"
            >
              <span>❌ 還沒記住</span>
              <span className="text-[10px] font-medium text-red-400">3 字後複習</span>
            </button>

            <button
              onClick={() => handleAction('uncertain')}
              className="flex-1 py-3.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-2xl transition border border-amber-200/60 text-sm flex flex-col items-center justify-center"
            >
              <span>🤔 不確定</span>
              <span className="text-[10px] font-medium text-amber-500">7 字後複習</span>
            </button>

            <button
              onClick={() => handleAction('mastered')}
              className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-md transition text-sm flex flex-col items-center justify-center"
            >
              <span>✅ 完全掌握</span>
              <span className="text-[10px] font-medium text-emerald-100">完成今日進度</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}