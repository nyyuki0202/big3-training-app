"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const EXERCISE_OPTIONS = [
  "Incline Dumbbell Press", "Incline Dumbbell Curl", "Lying Triceps Extension",
  "Lateral Raise", "Chin-Up", "Dips", "Lat Pulldown", "Shoulder Press", "Leg Extension"
];

export default function AssistancePage() {
  const router = useRouter();
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [exercise, setExercise] = useState(EXERCISE_OPTIONS[0]);
  const [customExercise, setCustomExercise] = useState("");
  const [weight, setWeight] = useState(20);
  const [reps, setReps] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWeightInputMode, setIsWeightInputMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 種目変更時に前回値を自動取得
  useEffect(() => {
    const fetchLastRecord = async () => {
      const selected = isCustomMode ? customExercise : exercise;
      if (!selected) return;
      const { data: { session } } = await supabase.auth.getSession();
      const { data } = await supabase.from('workouts').select('weight, reps')
        .eq('exercise', selected).eq('user_id', session?.user.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) { setWeight(data.weight); setReps(data.reps); }
      setIsLoading(false);
    };
    fetchLastRecord();
  }, [exercise, isCustomMode, customExercise]);

  const handleRecord = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const finalName = isCustomMode ? customExercise : exercise;
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.from('workouts').insert([{ 
      exercise: finalName, weight, reps, user_id: session?.user.id 
    }]);
    router.push("/");
  };

  if (isLoading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-orange-500 font-black italic">LOADING...</div>;

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 pb-32 flex flex-col items-center">
      <div className="w-full max-w-md mb-6"><Link href="/" className="text-gray-400 text-sm">← Back to TOP</Link></div>
      
      {/* TITLE: Orange Glow */}
      <h1 className="text-3xl font-black mb-8 text-orange-500 italic tracking-tighter drop-shadow-[0_0_15px_rgba(249,115,22,0.6)]">ASSISTANCE</h1>
      
      <div className="w-full max-w-md space-y-6">
        {/* MENU SELECT */}
        <div className="bg-gray-800/50 p-6 rounded-3xl border border-gray-700/50 shadow-xl">
          <p className="text-gray-500 text-[10px] mb-4 text-center font-black italic tracking-widest">MENU</p>
          {!isCustomMode ? (
            <select value={exercise} onChange={(e) => setExercise(e.target.value)} className="w-full bg-gray-900 text-white p-4 rounded-xl border border-gray-700 font-bold appearance-none">
              {EXERCISE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}
            </select>
          ) : (
            <input type="text" placeholder="EXERCISE NAME..." value={customExercise} onChange={(e) => setCustomExercise(e.target.value)} className="w-full bg-gray-900 text-white p-4 rounded-xl border border-orange-500 outline-none font-bold" />
          )}
          <button onClick={() => setIsCustomMode(!isCustomMode)} className="text-orange-500 text-[10px] underline w-full text-center mt-4 uppercase font-black">
            {isCustomMode ? "Select from list" : "Enter custom exercise"}
          </button>
        </div>

        {/* WEIGHT: Orange Neon Glow */}
        <div className="bg-gray-800/80 p-8 rounded-[40px] border border-gray-700 shadow-2xl relative">
          <p className="text-gray-500 text-xs mb-6 text-center font-black italic tracking-widest">WEIGHT (kg)</p>
          <div className="flex items-center justify-between gap-6">
            <button onClick={() => setWeight(w => Math.max(0, w - 2.5))} className="w-16 h-16 bg-gray-700 rounded-full text-2xl font-black active:scale-90">-</button>
            <div className="flex-1 flex justify-center">
              {isWeightInputMode ? (
                <input type="number" inputMode="decimal" autoFocus onBlur={() => setIsWeightInputMode(false)}
                  value={weight === 0 ? "" : weight} onChange={(e) => setWeight(Math.max(0, Number(e.target.value)))}
                  className="w-32 bg-transparent text-6xl font-black text-center text-orange-500 outline-none border-b-4 border-orange-600" />
              ) : (
                <div onClick={() => setIsWeightInputMode(true)} className="text-7xl font-black text-center text-orange-500 cursor-pointer drop-shadow-[0_0_25px_rgba(249,115,22,0.5)]">{weight}</div>
              )}
            </div>
            <button onClick={() => setWeight(w => w + 2.5)} className="w-16 h-16 bg-orange-600 rounded-full text-2xl font-black shadow-lg shadow-orange-900/40 active:scale-90">+</button>
          </div>
        </div>

        {/* REPS: Amber/Yellow Neon Glow */}
        <div className="bg-gray-800/80 p-8 rounded-[40px] border border-gray-700 shadow-2xl">
          <p className="text-gray-500 text-xs mb-6 text-center font-black italic tracking-widest">REPS</p>
          <div className="flex items-center justify-between gap-6">
            <button onClick={() => setReps(r => Math.max(0, r - 1))} className="w-16 h-16 bg-gray-700 rounded-full text-3xl font-bold active:scale-90">-</button>
            <div className="flex-1 text-7xl font-black text-center text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]">
              {reps}
            </div>
            <button onClick={() => setReps(r => r + 1)} className="w-16 h-16 bg-amber-600 rounded-full text-3xl font-bold text-black active:scale-90">+</button>
          </div>
        </div>

        <button onClick={handleRecord} disabled={isSubmitting} className="w-full py-6 bg-white text-black font-black text-3xl rounded-3xl hover:bg-gray-200 active:scale-95 shadow-xl transition-all">
          {isSubmitting ? "SAVING..." : "RECORD SET"}
        </button>
      </div>
    </main>
  );
}