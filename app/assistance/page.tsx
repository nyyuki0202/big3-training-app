"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// 💡 あらかじめ用意しておく王道の補助種目リスト（アルファベット順ベース）
const DEFAULT_EXERCISES = [
  "Bulgarian Squat",
  "Cable Crossover",
  "Dumbbell Fly",
  "Dumbbell Row",
  "Incline Dumbbell Press",
  "Lat Pulldown",
  "Leg Curl",
  "Leg Extension",
  "Leg Press",
  "Romanian Deadlift",
  "Seated Row",
  "Side Lateral Raise",
  "Skull Crusher",
  "Tempo Bench Press"
];

export default function AssistancePage() {
  const router = useRouter();
  
  // --- 状態管理 (States) ---
  const [exerciseName, setExerciseName] = useState("");
  const [weight, setWeight] = useState(20);
  const [reps, setReps] = useState(10);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // サジェスト機能用の状態
  const [masterExercises, setMasterExercises] = useState<string[]>(DEFAULT_EXERCISES);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const isFetched = useRef(false);

  // --- 1. 初期読み込み：デフォルトとDB内のカスタム種目をマージしてabc順ソート ---
  useEffect(() => {
    const fetchCustomExercises = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("favorite_exercises")
        .select("name")
        .eq("user_id", session.user.id);

      if (!error && data) {
        const customNames = data.map((item) => item.name);
        
        // 重複を排除してガッチャンコ (Setを使用)
        const mergedSet = new Set([...DEFAULT_EXERCISES, ...customNames]);
        
        // 綺麗にabc順（アルファベット順）にソートしてStateに格納
        const sortedNames = Array.from(mergedSet).sort((a, b) => a.localeCompare(b));
        
        setMasterExercises(sortedNames);
      }
    };

    if (!isFetched.current) {
      fetchCustomExercises();
      isFetched.current = true;
    }
  }, []);

  // --- 2. 記録保存 ＆ 新種目の自動マスター登録ロジック ---
  const handleRecord = async () => {
    if (!exerciseName.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("セッションが切れました。ログインし直してください。");
        router.push("/login");
        return;
      }

      const trimmedName = exerciseName.trim();

      // リストにない全く新しい種目名の場合、自動で favorite_exercises テーブルに登録
      if (!masterExercises.includes(trimmedName)) {
        await supabase
          .from("favorite_exercises")
          .insert([{ user_id: session.user.id, name: trimmedName }]);
      }

      // ワークアウトの記録をworkoutsテーブルに保存
      const { error } = await supabase.from("workouts").insert([
        {
          exercise: trimmedName,
          weight,
          reps,
          notes: notes.trim() || null, // 備考欄（空ならnull）
          user_id: session.user.id,
        },
      ]);

      if (error) throw error;

      router.push("/");
    } catch (e) {
      console.error(e);
      alert("Error saving record...");
      setIsSubmitting(false);
    }
  };

  // 入力文字にヒットするサジェスト候補のフィルタリング（部分一致）
  const filteredSuggestions = masterExercises.filter((ex) =>
    ex.toLowerCase().includes(exerciseName.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 pb-20 font-bold italic tracking-tighter flex flex-col items-center justify-center">
      
      {/* 戻るリンク */}
      <div className="w-full max-w-xs mb-8">
        <Link href="/" className="text-gray-500 hover:text-white text-xs tracking-widest font-normal">
          ← Back to TOP
        </Link>
      </div>

      {/* ヘッダータイトル */}
      <h1 className="text-3xl font-black text-orange-500 mb-10 tracking-widest uppercase text-center shadow-orange-500/10 drop-shadow-[0_0_10px_rgba(234,88,12,0.2)]">
        ASSISTANCE
      </h1>

      <div className="w-full max-w-xs space-y-8">
        
        {/* 💡 種目名入力 ＆ サジェストドロップダウンUI */}
        <div className="relative">
          <label className="text-[10px] text-gray-500 ml-4 mb-2 block uppercase tracking-widest">Exercise_Name</label>
          <input
            type="text"
            value={exerciseName}
            onChange={(e) => {
              setExerciseName(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            // タップ操作のイベント発火を邪魔しないように少し遅らせて閉じる
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="種目名を入力 (例: Leg)"
            className="w-full bg-gray-800/40 border-2 border-gray-700 rounded-3xl p-4 text-sm text-gray-300 focus:border-orange-500 focus:outline-none transition-all"
          />

          {/* サジェストメニュー：条件に合う候補をabc順で表示 */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-2 bg-gray-800/95 border-2 border-gray-700 rounded-2xl max-h-48 overflow-y-auto shadow-2xl backdrop-blur-sm">
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onMouseDown={() => {
                    setExerciseName(suggestion);
                    setShowSuggestions(false);
                  }}
                  className="w-full text-left px-5 py-3 text-xs text-gray-300 hover:bg-gray-700 hover:text-orange-400 border-b border-gray-700/40 last:border-none font-medium uppercase transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* WEIGHT (kg) 入力カード */}
        <div className="bg-gray-800/30 border-2 border-gray-800 rounded-3xl p-4 text-center">
          <label className="text-[10px] text-gray-500 block uppercase tracking-widest mb-1">WEIGHT (kg)</label>
          <div className="flex items-center justify-between px-2">
            <button onClick={() => setWeight(Math.max(0, weight - 2.5))} className="w-10 h-10 bg-gray-800/80 rounded-full text-gray-400 text-xl active:scale-90 transition-all">-</button>
            <input type="number" step="0.25" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-24 bg-transparent text-center text-3xl font-black text-orange-500 focus:outline-none" />
            <button onClick={() => setWeight(weight + 2.5)} className="w-10 h-10 bg-orange-600 rounded-full text-white text-xl active:scale-90 transition-all">+</button>
          </div>
        </div>

        {/* REPS 入力カード */}
        <div className="bg-gray-800/30 border-2 border-gray-800 rounded-3xl p-4 text-center">
          <label className="text-[10px] text-gray-500 block uppercase tracking-widest mb-1">REPS</label>
          <div className="flex items-center justify-between px-2">
            <button onClick={() => setReps(Math.max(0, reps - 1))} className="w-10 h-10 bg-gray-800/80 rounded-full text-gray-400 text-xl active:scale-90 transition-all">-</button>
            <input type="number" value={reps} onChange={(e) => setReps(Number(e.target.value))} className="w-24 bg-transparent text-center text-3xl font-black text-purple-400 focus:outline-none" />
            <button onClick={() => setReps(reps + 1)} className="w-10 h-10 bg-purple-600 rounded-full text-white text-xl active:scale-90 transition-all">+</button>
          </div>
        </div>

        {/* 備考入力欄 */}
        <div className="w-full">
          <label className="text-[10px] text-gray-500 ml-4 mb-2 block uppercase tracking-widest">Optional_Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="最後の1セット / ドロップセット..."
            className="w-full bg-gray-800/40 border-2 border-gray-700 rounded-3xl p-4 text-sm text-gray-300 focus:border-orange-500 focus:outline-none transition-all"
            rows={2}
          />
        </div>

        {/* 記録ボタン */}
        <button
          onClick={handleRecord}
          disabled={isSubmitting || !exerciseName.trim()}
          className="w-full py-4 bg-white text-gray-900 rounded-3xl font-black uppercase text-sm tracking-widest active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all shadow-xl"
        >
          {isSubmitting ? "RECORDING..." : "RECORD SET"}
        </button>

      </div>
    </main>
  );
}