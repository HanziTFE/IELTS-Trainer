import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const taskType = body.taskType || 'Task 2';

    // 產生一個完全隨機的雜訊字串與時間戳，打亂 AI 內部的文字機率樹
    const uniqueSeed = Math.random().toString(36).substring(2) + Date.now();

    const prompt = `
你是一位極具創意且極具深度的雅思 (IELTS) 首席出題官。
請完全發揮你的想像力與知識庫，為考生設計一題全新的【雅思 ${taskType} 寫作題目】。

【出題要求】：
1. 請打破常見的雅思考古題陳腔濫調（不要總是出「手機對小孩的影響」或「科技好不好」）。
2. 請從任何現代社會、未來趨勢、哲學倫理、經濟學、當代文化、環境生態、全球化等無限領域中，自選一個有趣且有深度討論價值的角度。
3. 題目格式與問句必須完全符合官方雅思 ${taskType} 的標準寫作範本。
4. 【隨機思考引導碼】：${uniqueSeed} (請根據此隨機亂數觸發你神經網路中不同的概念聯想)。

請務必只回傳【純 JSON 格式】，不要包含任何 markdown 標籤（不要 \`\`\`json ），格式如下：
{
  "title": "精準英文短標題",
  "prompt": "完整的雅思 ${taskType} 題目英文內文",
  "taskType": "${taskType}"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        temperature: 2.0, // 調到最大自由度
        topP: 0.95,
      },
    });

    const text = response.text || '';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanJson);

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Writing API Error:', err);
    return NextResponse.json(
      { error: err.message || '寫作題目生成失敗' },
      { status: 500 }
    );
  }
}