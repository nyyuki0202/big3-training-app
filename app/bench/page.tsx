"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function BenchPage() {
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
          .eq('exercise', 'bench').eq('user_id', session.user.id)
          .order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (data) { setWeight(data.weight); setReps(data.reps); }
        else { setWeight(60); setReps(10); }
      } finally { setIsLoading(false); }
    };
    fetchLastRecord();
  }, []);

  const handleRecord = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.from('workouts').insert([{ exercise: 'bench', weight, reps, user_id: session?.user.id }]);
      router.push("/");
    } catch (e) { alert("Error..."); setIsSubmitting(false); }
  };

  if (isLoading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-red-500 font-black italic">LOADING...</div>;

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 pb-32 flex flex-col items-center">
      <div className="w-full max-w-md mb-8"><Link href="/" className="text-gray-400 text-sm">← Back to TOP</Link></div>
      <h1 className="text-4xl font-black mb-10 text-red-600 italic tracking-tighter drop-shadow-[0_0_15px_rgba(220,38,38,0.6)]">BENCH PRESS</h1>

      <div className="w-full max-w-md space-y-8">
        {/* WEIGHT (Red Glow) */}
        <div className="bg-gray-800/80 p-8 rounded-[40px] border border-gray-700 shadow-2xl relative">
          <p className="text-gray-500 text-xs mb-6 text-center font-black italic">WEIGHT (kg)</p>
          <div className="flex items-center justify-between gap-6">
            <button onClick={() => setWeight(w => Math.max(0, w - 2.5))} className="w-16 h-16 bg-gray-700 rounded-full text-2xl font-black">-</button>
            <div className="flex-1 flex justify-center">
              {isWeightInputMode ? (
                <input type="number" inputMode="decimal" autoFocus onBlur={() => setIsWeightInputMode(false)}
                  value={weight === 0 ? "" : weight} onChange={(e) => setWeight(Math.max(0, Number(e.target.value)))}
                  className="w-32 bg-transparent text-6xl font-black text-center text-red-500 outline-none border-b-4 border-red-600" />
              ) : (
                <div onClick={() => setIsWeightInputMode(true)} className="text-7xl font-black text-center text-red-500 cursor-pointer drop-shadow-[0_0_25px_rgba(239,68,68,0.5)]">{weight}</div>
              )}
            </div>
            <button onClick={() => setWeight(w => w + 2.5)} className="w-16 h-16 bg-red-600 rounded-full text-2xl font-black">+</button>
          </div>
        </div>

        {/* REPS (Magenta Glow) */}
        <div className="bg-gray-800/80 p-8 rounded-[40px] border border-gray-700 shadow-2xl">
          <p className="text-gray-500 text-xs mb-6 text-center font-black italic">REPS</p>
          <div className="flex items-center justify-between gap-6">
            <button onClick={() => setReps(r => Math.max(0, r - 1))} className="w-16 h-16 bg-gray-700 rounded-full text-3xl font-bold">-</button>
            <div className="flex-1 text-7xl font-black text-center text-fuchsia-400 drop-shadow-[0_0_20px_rgba(232,121,249,0.5)]">{reps}</div>
            <button onClick={() => setReps(r => r + 1)} className="w-16 h-16 bg-fuchsia-600 rounded-full text-3xl font-bold">+</button>
          </div>
        </div>
        <button onClick={handleRecord} className="w-full py-6 bg-white text-black font-black text-3xl rounded-3xl active:scale-95 shadow-xl">RECORD SET</button>
      </div>
    </main>
  );
}