import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const part = body.part || 'Part 2';
    const uniqueSeed = Math.random().toString(36).substring(2) + Date.now();

    const prompt = `
你是一位雅思 (IELTS) 口說主考官。請生成一題全新的雅思口說題目。
考題類型：IELTS Speaking ${part}
隨機種子：${uniqueSeed}

請務必只回傳【純 JSON 格式】，不要包含任何 markdown 標籤（不要 \`\`\`json ），格式如下：
{
  "part": "${part}",
  "question": "完整的雅思口說題目敘述 (英文)",
  "cueCardPoints": ["如果是 Part 2 請給 3-4 個 Cue Card 提示點，非 Part 2 回傳空陣列"]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        temperature: 2.0,
      },
    });

    const text = response.text || '';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJson);

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Speaking Generate API Error:', err);
    return NextResponse.json({ error: err.message || '題目生成失敗' }, { status: 500 });
  }
}