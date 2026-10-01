'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const SAMPLE_SENTENCES = [
  { id: 1, text: "The international conference on climate change will be held next Tuesday.", topic: "Environment" },
  { id: 2, text: "Students are required to submit their research proposals before the end of this month.", topic: "Campus Life" },
  { id: 3, text: "Public transportation infrastructure plays a crucial role in reducing urban traffic congestion.", topic: "Transport" }
];

export default function ListeningPage() {
  const [userInput, setUserInput] = useState('');
  const [rate, setRate] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // 預設為第一題，後續透過 AI 抽題更新
  const [currentSentence, setCurrentSentence] = useState({
    text: "The international conference on climate change will be held next Tuesday.",
    topic: "Environment",
    definition_tw: "關於氣候變遷的國際會議將於下週二舉行。",
    keyVocabulary: ["international", "conference", "climate change"]
  });

  // 💡 AI 聽力自動出題函式
  const fetchAiListening = async () => {
    setLoading(true);
    setUserInput('');
    setIsSubmitted(false);

    try {
      const res = await fetch('/api/listening/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: 'medium' }),
      });
      const data = await res.json();

      if (res.ok && data.sentence) {
        const newSentence = {
          text: data.sentence,
          topic: "AI 即時考題",
          definition_tw: data.definition_tw || "",
          keyVocabulary: data.keyVocabulary || []
        };
        setCurrentSentence(newSentence);
        // 抽完題自動為使用者發音朗讀一次
        speakAudio(data.sentence, rate);
      } else {
        alert(data.error || 'AI 出題失敗');
      }
    } catch (err) {
      alert('無法連線到 AI 聽力服務');
    } finally {
      setLoading(false);
    }
  };

 const playAudio = () => speakAudio(currentSentence.text, rate);

  const speakAudio = (text: string, currentRate: number) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-GB';
      utterance.rate = currentRate;
      window.speechSynthesis.speak(utterance);
    } else {
      alert('你的瀏覽器不支援語音播放');
    }
  };

  const calculateAccuracy = () => {
    const cleanUser = userInput.toLowerCase().replace(/[^\w\s]/g, '').trim().split(/\s+/);
    const cleanCorrect = currentSentence.text.toLowerCase().replace(/[^\w\s]/g, '').trim().split(/\s+/);
    let matchCount = 0;
    cleanCorrect.forEach((word) => {
      if (cleanUser.includes(word)) matchCount++;
    });
    return Math.round((matchCount / cleanCorrect.length) * 100);
  };

  const nextSentence = () => {
    fetchAiListening();
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center">
      <div className="max-w-3xl w-full bg-white rounded-3xl p-8 shadow-sm border border-slate-100 space-y-6">
        <div className="flex justify-between items-center border-b pb-4">
          <Link href="/" className="text-sm font-bold text-blue-600 hover:underline">
            ← 返回儀表板
          </Link>
          <h1 className="text-xl font-bold text-slate-800">🎧 雅思聽力精聽特訓</h1>
        </div>

        <div className="bg-blue-50 rounded-2xl p-6 text-center space-y-4">
         <div className="flex justify-between items-center">
  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
    主題：{currentSentence.topic}
  </span>
  <button
    onClick={fetchAiListening}
    disabled={loading}
    className="text-xs font-bold text-blue-600 hover:text-blue-800 transition flex items-center gap-1 disabled:opacity-50"
  >
    {loading ? '🎲 考官念題中...' : '🎲 考官一鍵出題'}
  </button>
</div>
          <div className="flex justify-center gap-4 items-center">
            <button
              onClick={playAudio}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg transition flex items-center gap-2"
            >
              🔊 播放英音原音
            </button>
            <select
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="bg-white text-slate-900 placeholder-slate-400 p-3 border rounded-xl font-bold text-sm bg-white"
            >
              <option value={0.8}>0.8x (慢速)</option>
              <option value={1.0}>1.0x (原速)</option>
              <option value={1.2}>1.2x (快速)</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-bold text-slate-700">請聽寫出你聽到的句子：</label>
          <textarea
            rows={3}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="點擊上方播放按鈕，並在此處輸入聽到的英文內容..."
            className="bg-white text-slate-900 placeholder-slate-400 w-full p-4 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />

          {!isSubmitted ? (
            <button
              onClick={() => setIsSubmitted(true)}
              disabled={!userInput.trim()}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition disabled:opacity-50"
            >
              核對答案
            </button>
          ) : (
            <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">正確率評分：</span>
                <span className="text-lg font-extrabold text-blue-600">{calculateAccuracy()}%</span>
              </div>
              <div>
                <span className="block mb-1">正確文本：</span>
                <p className="text-base font-bold text-emerald-700">{currentSentence.text}</p>
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 block mb-1">你的回答：</span>
              
                <p className="text-base font-bold text-slate-700">{userInput}</p>
                  {/* 💡 補上 AI 生成的中文翻譯 */}
              {currentSentence.definition_tw && (
                <div>
                  <span className="text-xs font-bold text-slate-400 block mb-1">中文翻譯：</span>
                  <p className="text-sm font-semibold text-slate-600">{currentSentence.definition_tw}</p>
                </div>
              )}

              {/* 💡 補上 AI 整理的核心單字 */}
              {currentSentence.keyVocabulary && currentSentence.keyVocabulary.length > 0 && (
                <div>
                  <span className="text-xs font-bold text-slate-400 block mb-1">核心單字：</span>
                  <div className="flex gap-2 flex-wrap">
                    {currentSentence.keyVocabulary.map((word, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-md border border-blue-100">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              </div>
              <button
                onClick={nextSentence}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition"
              >
                下一題 →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}