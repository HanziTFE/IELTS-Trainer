import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { prompt, essay, taskType } = await request.json();

    if (!essay) {
      return NextResponse.json({ error: '作文內容不能為空白' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: '未設定 GEMINI_API_KEY' }, { status: 500 });
    }

    const systemPrompt = `
你是一位嚴格且專業的資深雅思（IELTS）官方考官。請針對以下學生的作文進行評分與詳細批改。

【題目】：${prompt || '未提供題目'}
【題型】：IELTS Writing ${taskType || 'Task 2'}
【學生文章】：
${essay}

請嚴格按照雅思官方四大指標進行評分：
1. Task Achievement / Task Response (TR)
2. Coherence and Cohesion (CC)
3. Lexical Resource (LR)
4. Grammatical Range and Accuracy (GRA)

請以繁體中文輸出，格式必須包含：
1. **預估 Band 分數**（整體分數及四大項各自預估分數）
2. **優點分析**
3. **關鍵扣分點與改進建議**
4. **高分詞彙與句型替換提案**（提供 3-5 個可以替換成 Band 7+ 的字詞）
5. **重構版範文參考**（針對該文章進行升級與修正後的範文）
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Gemini API 呼叫失敗');
    }

    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '無法生成分析結果';

    return NextResponse.json({ result: resultText });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}