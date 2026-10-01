import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const question = body.question || 'Standard Speaking Question';
    const userTranscript = body.userTranscript || '';
    const part = body.part || 'Part 2';

    if (!userTranscript) {
      return NextResponse.json({ error: '未接收到口說逐字稿內容' }, { status: 400 });
    }

    const prompt = `
    【⚠️ 評分重要原則 - 請務必遵循】：
1. 考生回答內容是由「語音轉文字 (STT)」自動生成的，可能包含同音字誤判（例如：there/their、to/too）、標點符號缺失，或語音辨識的小拼字錯誤。
2. 請【完全忽略】這些明顯屬於語音辨識誤判的小錯字，不要因此扣文法或詞彙分數。
3. 請著重評估考生的【實際語意連貫性】、【句型多樣性】與【高分詞彙使用】。
你是一位專業的雅思 (IELTS) 口說首席考官。請針對考生的口說回答逐字稿進行深度評分與批改。

【題目 (${part})】：${question}
【考生回答 (逐字稿)】：${userTranscript}

請根據雅思口說官方標準評分，並務必只回傳【純 JSON 格式】，不要包含任何 markdown 標籤（不要 \`\`\`json ），格式如下：
{
  "overallBand": 6.5,
  "fluencyScore": 6.5,
  "lexicalScore": 6.0,
  "grammarScore": 7.0,
  "feedback": "整體評價與主要扣分點 (繁體中文)",
  "improvedAnswer": "Band 8+ 的高分示範回答 (英文)",
  "keyVocabulary": ["推薦替換的高分單字1", "關鍵片語2"]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        temperature: 1.0,
      },
    });

    const text = response.text || '';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJson);

    return NextResponse.json(data);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : '批改失敗';
    console.error('Speaking Eval Error:', err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}