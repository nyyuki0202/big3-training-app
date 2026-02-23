// import { google } from '@ai-sdk/google';
// import { streamText, convertToModelMessages } from 'ai';
// import { createClient } from '@supabase/supabase-js';

// // Supabaseの設定
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );

// export const maxDuration = 30;

// export async function POST(req: Request) {
//   try {
//     const { messages } = await req.json();

//     // 1. 筋トレ記録の取得
//     const { data: history, error: dbError } = await supabase
//       .from('workouts')
//       .select('*')
//       .order('created_at', { ascending: false })
//       .limit(20);

//     if (dbError) console.error('Supabase Error:', dbError);
//     console.log(`取得した記録数: ${history?.length}件`);
//     console.log("最新の記録:", history?.[0]);

//     const historyText = history?.map(log => 
//       `- ${new Date(log.created_at).toLocaleDateString()}: ${log.exercise} ${log.weight}kg x ${log.reps}回`
//     ).join('\n') || "記録なし";

//     // 2. AIの実行 (2.0-flash に戻します。429エラーが出る場合は1分ほど待って再試行してください)
//     const result = await streamText({
//       model: google('gemini-2.0-flash'), 
//       system: `あなたは、ユーザーの目標を誰よりも応援する、少しユーモアのある相棒トレーナーです。

//       【会話のルール】
//       1. **1回の返答は短く（80〜100文字以内）**、チャット感覚でテンポ良く返してください。
//       2. 過去の記録（以下）から1つ具体的に触れて、「〇kg挙げてたな、流石だ」と自然に褒めてください。
//       3. 最後にできるだけ、トレーニングの感想や体調を尋ねる**短い質問**を添えて、会話を繋げてください。
//       4. 専門用語で語るより、隣で一緒にインターバルを過ごしているような距離感で話してください。
      
//       【ユーザーの筋トレ記録】
//       ${historyText}`,
//       messages: await convertToModelMessages(messages),
//     });

//     return result.toUIMessageStreamResponse();
//   } catch (error) {
//     // 👈 ここでエラーをターミナルに表示させる
//     console.error('Chat API Error:', error);
//     return new Response(JSON.stringify({ error: 'AI通信エラーだぜ！' }), { status: 500 });
//   }
// }