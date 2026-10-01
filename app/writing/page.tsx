'use client';

import ReactMarkdown from 'react-markdown';
import React, { useState } from 'react';
import Link from 'next/link';

export default function WritingPage() {
  const [taskType, setTaskType] = useState('Task 2');
  const [prompt, setPrompt] = useState('');
  const [essay, setEssay] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;
    const [genLoading, setGenLoading] = useState(false);

  const handleGeneratePrompt = async () => {
    setGenLoading(true);
    try {
      const res = await fetch('/api/writing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskType }),
      });
      const data = await res.json();
      if (res.ok && data.prompt) {
        setPrompt(data.prompt); // 自動帶入題目框！
      } else {
        alert(data.error || '生成題目失敗');
      }
    } catch (err) {
      alert('無法連線到 AI 出題服務');
    } finally {
      setGenLoading(false);
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!essay.trim()) return;

    setLoading(true);
    setFeedback('');

    try {
      const res = await fetch('/api/essay-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, essay, taskType }),
      });

      const data = await res.json();
      if (res.ok) {
        setFeedback(data.result);
      } else {
        alert(data.error || '批改過程發生錯誤');
      }
    } catch (err) {
      console.error(err);
      alert('無法連線到 AI 服務');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* 頂部導覽 */}
        <div className="flex justify-between items-center bg-white p-4 px-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-bold text-blue-600 hover:underline">
              ← 返回儀表板
            </Link>
            <span className="text-slate-300">|</span>
            <h1 className="text-xl font-bold text-slate-800">✍️ AI 雅思寫作精準批改</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左側：作文輸入區 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-700">選擇題型</label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="p-2 border border-slate-200 rounded-xl text-sm font-bold bg-white text-blue-600"
              >
                <option value="Task 1">Task 1 (圖表/信件)</option>
                <option value="Task 2">Task 2 (議論文/大作文)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
  <label className="text-sm font-bold text-slate-700">作文題目 (可選填)</label>
  <button
    type="button"
    onClick={handleGeneratePrompt}
    disabled={genLoading}
    className="text-xs font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1 disabled:opacity-50"
  >
    {genLoading ? '🎲 出題中...' : '🎲 考官一鍵出題'}
  </button>
</div>
              <textarea
                rows={2}
                placeholder="例如：Some people believe that university education should be free for everyone. To what extent do you agree or disagree?"
                className="bg-white text-slate-900 placeholder-slate-400 w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-1 bg-white text-slate-900 placeholder-slate-400">
                <label className="text-sm font-bold text-slate-700 bg-white text-slate-900 placeholder-slate-400">作文內文</label>
                <span className={`text-xs font-bold ${wordCount < 150 ? 'text-amber-500' : 'text-emerald-600'}`}>
                  字數：{wordCount} 字
                </span>
              </div>
              <textarea
                rows={12}
                required
                placeholder="請將寫好的英文作文貼在此處..."
                className="bg-white text-slate-900 placeholder-slate-400 w-full p-4 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none flex-1 font-mono leading-relaxed"
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading || !essay.trim()}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
            >
              {loading ? '🤖 AI 考官深度分析中...' : '提交 AI 考官批改'}
            </button>
          </div>

          {/* 右側：AI 批改報告區 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm overflow-y-auto max-h-[750px]">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-3 flex items-center gap-2">
              <span>📊</span> AI 考官評分報告
            </h2>

            {loading ? (
              <div className="py-20 text-center text-slate-400 space-y-3">
                <div className="text-3xl animate-bounce">🧠</div>
                <p className="text-sm font-semibold">Gemini AI 正根據雅思官方四大標準評分中...</p>
                <p className="text-xs text-slate-400">（通常耗時 15 ~ 20 秒）</p>
              </div>
            ) : feedback ? (
              <div className="text-sm leading-relaxed text-slate-800 space-y-3 font-sans">
  <ReactMarkdown>
    {feedback}
  </ReactMarkdown>
</div>
            ) : (
              <div className="py-20 text-center text-slate-400 bg-white text-slate-900 placeholder-slate-400">
                <p className="text-sm bg-white text-slate-900 placeholder-slate-400">在左側貼上文章並點擊提交，</p>
                <p className="text-xs mt-1 text-slate-300 bg-white text-slate-900 placeholder-slate-400">即可獲得完整的 Band 分估算與詳細高分替換建議。</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}