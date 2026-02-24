"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function DeadliftPage() {
  const router = useRouter();
  const [weight, setWeight] = useState(0);
  const [reps, setReps] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isWeightInputMode, setIsWeightInputMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLastRecord = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data } = await supabase.from('workouts').select('weight, reps')
          .eq('exercise', 'dead').eq('user_id', session.user.id)
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (data) { setWeight(data.weight); setReps(data.reps); }
        else { setWeight(100); setReps(5); }
      } finally { setIsLoading(false); }
    };
    fetchLastRecord();
  }, []);

  const handleRecord = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('workouts').insert([{ exercise: 'dead', weight, reps, user_id: session?.user.id }]);
      router.push("/");
    } catch (e) { alert("Error..."); setIsSubmitting(false); }
  };

  if (isLoading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-green-500 font-black italic">LOADING...</div>;

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 pb-32 flex flex-col items-center">
      <div className="w-full max-w-md mb-8"><Link href="/" className="text-gray-400 text-sm">← Back to TOP</Link></div>
      
      {/* TITLE: Green (RGBのG) */}
      <h1 className="text-4xl font-black mb-10 text-green-500 italic tracking-tighter drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">DEADLIFT</h1>
      
      <div className="w-full max-w-md space-y-8">
        {/* WEIGHT (Standard Green) */}
        <div className="bg-gray-800/80 p-8 rounded-[40px] border border-gray-700 shadow-2xl relative">
          <p className="text-gray-500 text-xs mb-6 text-center font-black italic tracking-widest">WEIGHT (kg)</p>
          <div className="flex items-center justify-between gap-6">
            <button onClick={() => setWeight(w => Math.max(0, w - 2.5))} className="w-16 h-16 bg-gray-700 rounded-full text-2xl font-black">-</button>
            <div className="flex-1 flex justify-center">
              {isWeightInputMode ? (
                <input type="number" inputMode="decimal" autoFocus onBlur={() => setIsWeightInputMode(false)}
                  value={weight === 0 ? "" : weight} onChange={(e) => setWeight(Math.max(0, Number(e.target.value)))}
                  className="w-32 bg-transparent text-6xl font-black text-center text-green-500 outline-none border-b-4 border-green-600" />
              ) : (
                <div onClick={() => setIsWeightInputMode(true)} className="text-7xl font-black text-center text-green-500 cursor-pointer drop-shadow-[0_0_20px_rgba(34,197,94,0.4)]">{weight}</div>
              )}
            </div>
            <button onClick={() => setWeight(w => w + 2.5)} className="w-16 h-16 bg-green-600 rounded-full text-2xl font-black shadow-lg shadow-green-900/40">+</button>
          </div>
        </div>

        {/* REPS (Fluorescent Lime) - ここがライム！ */}
        <div className="bg-gray-800/80 p-8 rounded-[40px] border border-gray-700 shadow-2xl">
          <p className="text-gray-500 text-xs mb-6 text-center font-black italic tracking-widest">REPS</p>
          <div className="flex items-center justify-between gap-6">
            <button onClick={() => setReps(r => Math.max(0, r - 1))} className="w-16 h-16 bg-gray-700 rounded-full text-3xl font-bold">-</button>
            
            {/* 蛍光感の強い Lime-400 を採用 */}
            <div className="flex-1 text-7xl font-black text-center text-lime-400 drop-shadow-[0_0_15px_rgba(163,230,53,0.5)]">
              {reps}
            </div>

            <button onClick={() => setReps(r => r + 1)} className="w-16 h-16 bg-lime-600 rounded-full text-3xl font-bold text-black">+</button>
          </div>
        </div>

        <button onClick={handleRecord} className="w-full py-6 bg-white text-black font-black text-3xl rounded-3xl active:scale-95 shadow-xl">RECORD SET</button>
      </div>
    </main>
  );
}