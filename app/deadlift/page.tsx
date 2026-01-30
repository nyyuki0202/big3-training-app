"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // ← 画面移動用
import { supabase } from "@/lib/supabaseClient"; // ← さっき作ったSupabase接続用

export default function BenchPage() {
  const router = useRouter();
  const [weight, setWeight] = useState(60);
  const [reps, setReps] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false); // 連打防止用

  // 保存ボタンを押したときの処理
  const handleRecord = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 1. Supabaseにデータを送る
      const { error } = await supabase
        .from('workouts')
        .insert([
          { 
            exercise: 'deadlift', // 種目名
            weight: weight,    // 重量
            reps: reps         // 回数
          }
        ]);

      if (error) throw error;

      // 2. 成功したらアラートを出してトップに戻る
      alert("記録しました！ナイスファイト！🔥");
      router.push("/");

    } catch (e) {
      alert("エラーが発生しました...");
      console.error(e);
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center">
      
      <div className="w-full max-w-md mb-8">
        <Link href="/" className="text-gray-400 hover:text-white text-sm">
          ← Back to TOP
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-8 text-green-500">DEADLIFT</h1>

      <div className="w-full max-w-md space-y-8">
        
        {/* 重量入力 */}
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg">
          <p className="text-gray-400 text-sm mb-2 text-center">WEIGHT (kg)</p>
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setWeight(w => w - 2.5)}
              className="w-16 h-16 bg-gray-700 rounded-full text-2xl font-bold hover:bg-gray-600 active:bg-gray-500"
            >
              -
            </button>
            <span className="text-5xl font-black font-mono w-32 text-center">
              {weight}
            </span>
            <button 
              onClick={() => setWeight(w => w + 2.5)}
              className="w-16 h-16 bg-green-600 rounded-full text-2xl font-bold hover:bg-red-500 active:bg-red-400"
            >
              +
            </button>
          </div>
        </div>

        {/* 回数入力 */}
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg">
          <p className="text-gray-400 text-sm mb-2 text-center">REPS</p>
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setReps(r => Math.max(0, r - 1))} // ← 0未満にならないように修正済み！
              className="w-16 h-16 bg-gray-700 rounded-full text-2xl font-bold hover:bg-gray-600 active:bg-gray-500"
            >
              -
            </button>
            <span className="text-5xl font-black font-mono w-32 text-center">
              {reps}
            </span>
            <button 
              onClick={() => setReps(r => r + 1)}
              className="w-16 h-16 bg-blue-600 rounded-full text-2xl font-bold hover:bg-blue-500 active:bg-blue-400"
            >
              +
            </button>
          </div>
        </div>

        {/* 決定ボタン (handleRecordを実行) */}
        <button 
          onClick={handleRecord}
          disabled={isSubmitting}
          className="w-full py-6 bg-white text-black font-black text-2xl rounded-xl hover:bg-gray-200 active:scale-95 transition-transform disabled:opacity-50"
        >
          {isSubmitting ? "SAVING..." : "RECORD SET"}
        </button>

      </div>
    </main>
  );
}