"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// 🏆 ご指定いただいた最新の英語版リスト
const EXERCISE_OPTIONS = [
  "Incline Dumbbell Press",
  "Incline Dumbbell Curl",
  "Narrow Bench Press",
  "Lying Triceps Extension",
  "Lateral Raise",
  "Chin-Up",
  "Dips",
  "Lat Pulldown",
  "Shoulder Press",
  "Leg Extension"
];

export default function OthersPage() {
  const router = useRouter();
  
  // モード切替用のステート (false: リストから選択, true: 手入力)
  const [isCustomMode, setIsCustomMode] = useState(false);
  
  const [exercise, setExercise] = useState(EXERCISE_OPTIONS[0]);
  const [customExercise, setCustomExercise] = useState("");
  const [weight, setWeight] = useState(20);
  const [reps, setReps] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRecord = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const finalExerciseName = isCustomMode ? customExercise : exercise;
    
    if (!finalExerciseName) {
      alert("Please enter or select exercise name!");
      setIsSubmitting(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Login required");

      const { error } = await supabase
        .from('workouts')
        .insert([
          { 
            exercise: finalExerciseName,
            weight: weight,
            reps: reps,
            user_id: session.user.id 
          }
        ]);

      if (error) throw error;
      alert(`${finalExerciseName} RECORDED! 🔥`);
      router.push("/");
    } catch (e) {
      alert("Error occurred...");
      console.error(e);
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-md mb-8">
        <Link href="/" className="text-gray-400 hover:text-white text-sm">← Back to TOP</Link>
      </div>

      <h1 className="text-3xl font-bold mb-8 text-orange-500 italic tracking-tighter">ASSISTANCE</h1>

      <div className="w-full max-w-md space-y-6">
        
        {/* 種目選択セクション (トグル形式再現) */}
        <div className="bg-gray-800 p-6 rounded-3xl shadow-lg border border-gray-700/50">
          <p className="text-gray-400 text-sm mb-4 text-center tracking-widest font-black italic">EXERCISE</p>
          
          {!isCustomMode ? (
            <div className="space-y-4">
              <div className="relative">
                <select 
                  value={exercise}
                  onChange={(e) => setExercise(e.target.value)}
                  className="w-full bg-gray-900 text-white p-4 rounded-xl border border-gray-700 focus:border-orange-500 outline-none font-bold appearance-none text-sm"
                >
                  {EXERCISE_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt.toUpperCase()}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">▼</div>
              </div>
              <button 
                onClick={() => setIsCustomMode(true)}
                className="text-orange-500 text-xs underline w-full text-center block"
              >
                リストにない種目を手入力する
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="text"
                placeholder="例: Bicep Curl"
                value={customExercise}
                onChange={(e) => setCustomExercise(e.target.value)}
                className="w-full bg-gray-900 text-white p-4 rounded-xl border border-orange-500 outline-none font-bold"
              />
              <button 
                onClick={() => setIsCustomMode(false)}
                className="text-orange-500 text-xs underline w-full text-center block"
              >
                リストから選ぶ
              </button>
            </div>
          )}
        </div>

        {/* 重量入力：怪物級対応レイアウト */}
        <div className="bg-gray-800 p-6 rounded-3xl shadow-2xl border border-gray-700/50">
          <p className="text-gray-400 text-sm mb-6 text-center tracking-widest font-black italic">WEIGHT (kg)</p>
          <div className="flex items-center justify-between mb-8 gap-2">
            <button onClick={() => setWeight(w => Math.max(0, w - 2.5))} className="w-20 h-20 shrink-0 bg-gray-700 rounded-full border-2 border-gray-600 text-xl font-black shadow-lg active:scale-90 transition-transform">-2.5</button>
            <div className="flex-1 px-2 text-5xl sm:text-6xl font-black font-mono text-center text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.4)]">{weight}</div>
            <button onClick={() => setWeight(w => w + 2.5)} className="w-20 h-20 shrink-0 bg-orange-600 rounded-full text-xl font-black shadow-lg shadow-orange-900/40 active:scale-90">+2.5</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-start gap-2">
              <button onClick={() => setWeight(w => Math.max(0, w - 1))} className="flex-1 h-10 bg-gray-700 rounded-xl text-xs font-bold active:bg-gray-600">-1</button>
              <button onClick={() => setWeight(w => Math.max(0, w - 5))} className="flex-1 h-10 bg-gray-700 rounded-xl text-xs font-bold active:bg-gray-600">-5</button>
              <button onClick={() => setWeight(w => Math.max(0, w - 10))} className="flex-1 h-10 bg-gray-700 rounded-xl text-xs font-bold active:bg-gray-600">-10</button>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setWeight(w => w + 10)} className="flex-1 h-10 bg-gray-700 rounded-xl text-xs font-bold text-orange-400">+10</button>
              <button onClick={() => setWeight(w => w + 5)} className="flex-1 h-10 bg-gray-700 rounded-xl text-xs font-bold text-orange-400">+5</button>
              <button onClick={() => setWeight(w => w + 1)} className="flex-1 h-10 bg-gray-700 rounded-xl text-xs font-bold text-orange-400">+1</button>
            </div>
          </div>
        </div>

        {/* 回数入力 */}
        <div className="bg-gray-800 p-6 rounded-3xl shadow-lg border border-gray-700/50">
          <p className="text-gray-400 text-sm mb-4 text-center tracking-widest font-black italic">REPS</p>
          <div className="flex items-center justify-between px-4">
            <button onClick={() => setReps(r => Math.max(0, r - 1))} className="w-16 h-16 bg-gray-700 rounded-full text-2xl font-bold hover:bg-gray-600 active:scale-90 transition-transform">-</button>
            <span className="text-5xl font-black font-mono w-32 text-center text-blue-400">{reps}</span>
            <button onClick={() => setReps(r => r + 1)} className="w-16 h-16 bg-blue-600 rounded-full text-2xl font-bold hover:bg-blue-500 active:scale-90 transition-transform">+</button>
          </div>
        </div>

        <button onClick={handleRecord} disabled={isSubmitting} className="w-full py-6 bg-white text-black font-black text-2xl rounded-2xl hover:bg-gray-200 active:scale-95 transition-all shadow-xl disabled:opacity-50">
          {isSubmitting ? "SAVING..." : "RECORD SET"}
        </button>
      </div>
    </main>
  );
}