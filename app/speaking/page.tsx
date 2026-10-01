'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface EvaluationResult {
  overallBand: number;
  fluencyScore: number;
  lexicalScore: number;
  grammarScore: number;
  feedback: string;
  improvedAnswer: string;
  keyVocabulary: string[];
}

export default function SpeakingPage() {
  const [part, setPart] = useState('Part 2');
  const [question, setQuestion] = useState('');
  const [cueCardPoints, setCueCardPoints] = useState<string[]>([]);
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const speakText = (text: string) => {
    if (!text || typeof window === 'undefined') return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error(e);
      }
    }
    setIsRecording(false);
  };

  const startRecording = () => {
    if (!recognitionRef.current) {
      alert('您的瀏覽器不支援 Web Speech 語音辨識，請使用 Chrome 瀏覽器。');
      return;
    }
    try {
      recognitionRef.current.start();
      setIsRecording(false); // 重設狀態再啟動
      setTimeout(() => setIsRecording(true), 100);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleGeneratePrompt = async () => {
    stopRecording();
    setGenLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/speaking/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ part }),
      });
      const data = await res.json();

      if (res.ok && data.question) {
        setQuestion(data.question);
        setCueCardPoints(data.cueCardPoints || []);
        speakText(data.question);
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
    stopRecording();
    if (!transcript.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/speaking/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question || 'General Speaking Practice',
          userTranscript: transcript,
          part,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(data);
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

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;

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
            <h1 className="text-xl font-bold text-slate-800">🗣️ AI 雅思口說模擬與評分</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左側：口說輸入區 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-slate-700">選擇 Parts</label>
              <select
                value={part}
                onChange={(e) => {
                  setPart(e.target.value);
                  stopRecording();
                }}
                className="p-2 border border-slate-200 rounded-xl text-sm font-bold bg-white text-blue-600 outline-none"
              >
                <option value="Part 1">Part 1 (日常簡答)</option>
                <option value="Part 2">Part 2 (獨白 Cue Card)</option>
                <option value="Part 3">Part 3 (深入討論)</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-bold text-slate-700">口說題目 (可選填)</label>
                <button
                  type="button"
                  onClick={handleGeneratePrompt}
                  disabled={genLoading}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1 disabled:opacity-50"
                >
                  {genLoading ? '🎲 出題中...' : '🎲 考官一鍵出題'}
                </button>
              </div>

              <div className="relative">
                <textarea
                  rows={3}
                  placeholder="例如：Describe a memorable journey you have taken in your life."
                  className="bg-white text-slate-900 placeholder-slate-400 w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none pr-12"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
                {question && (
                  <button
                    type="button"
                    onClick={() => speakText(question)}
                    title="聆聽題目發音"
                    className="absolute right-3 top-3 text-sm p-1 hover:bg-slate-100 rounded-lg transition"
                  >
                    🔊
                  </button>
                )}
              </div>

              {cueCardPoints.length > 0 && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200/60 mt-2">
                  <span className="text-xs font-bold text-amber-800 block mb-1">You should say:</span>
                  <ul className="list-disc list-inside text-xs text-amber-900 space-y-0.5">
                    {cueCardPoints.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-bold text-slate-700">口說回答逐字稿</label>
                <span className={`text-xs font-bold ${wordCount < 30 ? 'text-amber-500' : 'text-emerald-600'}`}>
                  字數：{wordCount} 字
                </span>
              </div>

              <textarea
                rows={8}
                required
                placeholder="點擊下方「🎤 開始口說錄音」開口回答，語音轉成的英文將顯示於此 (亦可手動修改)..."
                className="bg-white text-slate-900 placeholder-slate-400 w-full p-4 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none flex-1 font-mono leading-relaxed"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={toggleRecording}
                className={`flex-1 py-3 font-bold text-sm rounded-2xl transition flex items-center justify-center gap-2 ${
                  isRecording
                    ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-900 text-white shadow-md'
                }`}
              >
                {isRecording ? '🛑 停止錄音' : '🎤 開始口說錄音'}
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || !transcript.trim()}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-blue-500/20 transition disabled:opacity-50"
              >
                {loading ? '🤖 AI 考官分析中...' : '提交 AI 考官批改'}
              </button>
            </div>
          </div>

          {/* 右側：AI 批改報告區 */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm overflow-y-auto max-h-[750px]">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-3 flex items-center gap-2">
              <span>📊</span> AI 考官評分報告
            </h2>

            {loading ? (
              <div className="py-20 text-center text-slate-400 space-y-3">
                <div className="text-3xl animate-bounce">🎙️</div>
                <p className="text-sm font-semibold text-slate-600">Gemini AI 正根據雅思口說官方四大標準評分中...</p>
                <p className="text-xs text-slate-400">（通常耗時 5 ~ 10 秒）</p>
              </div>
            ) : result ? (
              <div className="space-y-5">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-xs font-bold text-slate-400 block">口說整體表現</span>
                    <span className="text-sm font-bold text-slate-700">Band Rating</span>
                  </div>
                  <div className="text-right bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
                    <span className="text-xs font-bold text-blue-400 uppercase block">Overall Band</span>
                    <span className="text-3xl font-black text-blue-600">{result.overallBand}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-xs text-slate-400 font-bold block mb-1">Fluency</span>
                    <span className="text-lg font-extrabold text-slate-700">{result.fluencyScore}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-xs text-slate-400 font-bold block mb-1">Lexical</span>
                    <span className="text-lg font-extrabold text-slate-700">{result.lexicalScore}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-xs text-slate-400 font-bold block mb-1">Grammar</span>
                    <span className="text-lg font-extrabold text-slate-700">{result.grammarScore}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-400 block mb-1.5">考官整體評語：</span>
                  <p className="text-sm font-medium text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100 leading-relaxed">
                    {result.feedback}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-400 block mb-1.5">Band 8+ 高分範例回答：</span>
                  <p className="text-sm font-medium text-emerald-900 bg-emerald-50 p-4 rounded-2xl border border-emerald-100 leading-relaxed font-mono">
                    {result.improvedAnswer}
                  </p>
                </div>

                {result.keyVocabulary && result.keyVocabulary.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-slate-400 block mb-2">高分詞彙與片語推薦：</span>
                    <div className="flex gap-2 flex-wrap">
                      {result.keyVocabulary.map((word, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-50 text-blue-600 font-bold text-xs rounded-xl border border-blue-100">
                          {word}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400">
                <p className="text-sm text-slate-600 font-medium">點擊「🎤 開始口說錄音」回答問題，</p>
                <p className="text-xs mt-1 text-slate-400">提交後即可獲得流利度、詞彙與文法評分與高分建議。</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}