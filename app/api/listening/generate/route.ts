import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
const level = body.level;// 'easy' | 'medium' | 'hard'

    const prompt = `
你是一位雅思 (IELTS) 聽力考官。請生成一題雅思聽力聽寫 (Dictation) 練習句。
難易度：${level || 'medium'}。

請務必只回傳【純 JSON 格式】，不要包含任何 markdown 標籤（不要 \`\`\`json ），格式如下：
{
  "sentence": "完整的英文聽力句子 (適合雅思考題標準)",
  "definition_tw": "該句子的繁體中文翻譯",
  "keyVocabulary": ["句子中的高分關鍵單字1", "關鍵單字2"],
  "audioSpeed": 1.0
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
    });

    const text = response.text || '';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJson);

    return NextResponse.json(data);
  } catch (err: any) {
  console.error("聽力 API 錯誤詳情：", err);
  return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 });
}
}