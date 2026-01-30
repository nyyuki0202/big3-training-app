"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AssistancePage() {
  const router = useRouter();
  
  // よく使う補助種目のリスト（自由に追加してください！）
  const defaultExercises = [
    "Dumbbell Press",
    "Shoulder Press",
    "Chin-up",
    "Dip",
    "Lunge",
    "Rowing"
  ];

  const [exercise, setExercise] = useState(defaultExercises[0]); // 種目名
  const [weight, setWeight] = useState(20);
  const [reps, setReps] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustom, setIsCustom] = useState(false); // 自由入力モードかどうか

  const handleRecord = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('workouts')
        .insert([
          { 
            exercise: exercise, // ここで選んだ種目名が入る
            weight: weight,
            reps: reps
          }
        ]);

      if (error) throw error;
      alert("補助種目も記録完了！積み重ねが大事！🧱");
      router.push("/");
    } catch (e) {
      alert("エラーが発生しました...");
      console.error(e);
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-md mb-6">
        <Link href="/" className="text-gray-400 hover:text-white text-sm">← Back to TOP</Link>
      </div>

      <h1 className="text-3xl font-bold mb-6 text-yellow-500">ASSISTANCE</h1>

      <div className="w-full max-w-md space-y-6">
        
        {/* 種目選択エリア */}
        <div className="bg-gray-800 p-4 rounded-2xl shadow-lg">
          <p className="text-gray-400 text-sm mb-2 text-center">MENU</p>
          {!isCustom ? (
            <div className="flex flex-col gap-2">
              <select 
                value={exercise} 
                onChange={(e) => setExercise(e.target.value)}
                className="w-full bg-gray-700 text-white p-4 rounded-xl text-xl font-bold text-center appearance-none"
              >
                {defaultExercises.map(ex => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </select>
              <button 
                onClick={() => { setIsCustom(true); setExercise(""); }}
                className="text-xs text-yellow-500 underline text-center mt-2"
              >
                リストにない種目を手入力する
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <input 
                type="text" 
                value={exercise} 
                placeholder="例: Bicep Curl"
                onChange={(e) => setExercise(e.target.value)}
                className="w-full bg-gray-700 text-white p-4 rounded-xl text-xl font-bold text-center"
              />
              <button 
                onClick={() => { setIsCustom(false); setExercise(defaultExercises[0]); }}
                className="text-xs text-gray-400 underline text-center mt-2"
              >
                リストから選ぶ
              </button>
            </div>
          )}
        </div>

        {/* 重量入力 */}
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg">
          <p className="text-gray-400 text-sm mb-2 text-center">WEIGHT (kg)</p>
          <div className="flex items-center justify-between">
            <button onClick={() => setWeight(w => w - 1)} className="w-12 h-12 bg-gray-700 rounded-full font-bold">-</button>
            <span className="text-4xl font-black font-mono w-32 text-center">{weight}</span>
            <button onClick={() => setWeight(w => w + 1)} className="w-12 h-12 bg-yellow-600 rounded-full font-bold">+</button>
          </div>
        </div>

        {/* 回数入力 */}
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg">
          <p className="text-gray-400 text-sm mb-2 text-center">REPS</p>
          <div className="flex items-center justify-between">
            <button onClick={() => setReps(r => Math.max(0, r - 1))} className="w-12 h-12 bg-gray-700 rounded-full font-bold">-</button>
            <span className="text-4xl font-black font-mono w-32 text-center">{reps}</span>
            <button onClick={() => setReps(r => r + 1)} className="w-12 h-12 bg-blue-600 rounded-full font-bold">+</button>
          </div>
        </div>

        {/* 決定ボタン */}
        <button 
          onClick={handleRecord}
          disabled={isSubmitting || !exercise}
          className="w-full py-5 bg-yellow-500 text-black font-black text-2xl rounded-xl hover:bg-yellow-400 disabled:opacity-50"
        >
          RECORD
        </button>

      </div>
    </main>
  );
}