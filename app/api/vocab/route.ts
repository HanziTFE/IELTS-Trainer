import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: 依墨墨背單詞邏輯抓取「到期複習字 + 新字」
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const userId = searchParams.get('userId');

  if (!userId || userId === 'undefined' || userId === 'null') {
    return NextResponse.json({ error: '未提供有效的 User ID' }, { status: 400 });
  }

  try {
    const now = new Date().toISOString();

    // 1. 抓取使用者的所有學習紀錄
    const { data: progressData, error: progressError } = await supabase
      .from('user_vocab_progress')
      .select('vocab_id, status, updated_at, next_review_at')
      .eq('user_id', userId);

    if (progressError) throw progressError;

    const allProgress = progressData || [];

    // 已永久掌握的字（如果有）
    const masteredIds = allProgress
      .filter((p) => p.status === 'mastered')
      .map((p) => Number(p.vocab_id));

    // 💡 1. 第一優先：抓出「到期需要複習的舊字」 (status === 'learning' 且 next_review_at <= 現在)
    const dueReviewIds = allProgress
      .filter((p) => p.status === 'learning' && p.next_review_at && p.next_review_at <= now)
      .map((p) => Number(p.vocab_id));

    // 所有曾經學過的字 ID（包含學習中與完全掌握）
    const learnedIds = allProgress.map((p) => Number(p.vocab_id));

    // 今日已完成背誦數量（今天更新過的紀錄數量）
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = allProgress.filter((p) => new Date(p.updated_at) >= todayStart).length;

    // 2. 抓取所有單字庫
    const { data: allWords, error: wordsError } = await supabase
      .from('global_vocabulary')
      .select('*')
      .order('id', { ascending: true });

    if (wordsError) throw wordsError;

    const allWordsMap = new Map((allWords || []).map((w) => [Number(w.id), w]));

    // 3. 組成到期的複習單字列表
    const reviewWords = dueReviewIds
      .map((id) => allWordsMap.get(id))
      .filter((w): w is NonNullable<typeof w> => w !== undefined);

    // 4. 第二優先：抓取完全沒學過的新單字
    const newWords = (allWords || []).filter((w) => !learnedIds.includes(Number(w.id)));

    // 5. 組合：到期的舊字排前面，不夠的用新字補滿到 limit 個
    const combinedWords = [...reviewWords, ...newWords].slice(0, limit);

    return NextResponse.json({
      words: combinedWords,
      stats: {
        totalLearned: learnedIds.length,
        masteredCount: masteredIds.length,
        todayCount: todayCount,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: 依按鈕行為設定 next_review_at 間隔複習時間
export async function POST(request: Request) {
  try {
    const { userId, vocabId, status } = await request.json();

    if (!userId || !vocabId) {
      return NextResponse.json({ error: '缺少參數' }, { status: 400 });
    }

    const now = new Date();
    let nextReview = new Date();
    let dbStatus = 'learning';

    if (status === 'forgot') {
      // ❌ 還沒記住：今天或明天立刻再測
      nextReview.setMinutes(now.getMinutes() + 10);
    } else if (status === 'uncertain') {
      // 🤔 不確定：1 天後複習
      nextReview.setDate(now.getDate() + 1);
    } else if (status === 'mastered') {
      // ✅ 完全掌握：推延到 3 天後複習
      nextReview.setDate(now.getDate() + 3);
    }

    // 更新或新增使用者的單字進度紀錄 (Upsert)
    const { data, error } = await supabase
      .from('user_vocab_progress')
      .upsert(
        {
          user_id: userId,
          vocabId: vocabId,
          vocab_id: vocabId,
          status: dbStatus,
          updated_at: now.toISOString(),
          next_review_at: nextReview.toISOString(),
        },
        { onConflict: 'user_id,vocab_id' }
      )
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}