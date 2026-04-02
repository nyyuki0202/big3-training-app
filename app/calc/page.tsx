"use client";

import { useState } from "react";
import Link from "next/link";

export default function CalcPage() {
  const [weight, setWeight] = useState<number>(100);
  const [reps, setReps] = useState<number>(1);

  // 💡 リアルタイム計算ロジック
  const e1RM = reps === 1 ? weight : Math.round(weight * (1 + reps / 30));

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center justify-center font-black italic tracking-tighter">
      
      <Link href="/" className="absolute top-8 left-8 text-[10px] text-gray-600 hover:text-white tracking-[0.4em]">
        ← EXIT_CALCULATOR
      </Link>

      <h1 className="text-4xl mb-12 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-800 italic">
        1RM_CONVERTER
      </h1>

      <div className="w-full max-w-sm space-y-12">
        
        {/* ⚖️ WEIGHT INPUT */}
        <div>
          <label className="text-[10px] text-blue-500 mb-4 block tracking-[0.5em] ml-4">INPUT_WEIGHT (KG)</label>
          <div className="flex items-center gap-4">
            <button onClick={() => setWeight(Math.max(0, weight - 2.5))} className="w-16 h-16 bg-gray-800 rounded-full border-2 border-gray-700 text-2xl hover:bg-gray-700 transition-all">-</button>
            <input 
              type="number" 
              value={weight} 
              onChange={(e) => setWeight(Number(e.target.value))}
              className="flex-1 bg-transparent text-center text-5xl font-black focus:outline-none border-b-4 border-blue-600 pb-2"
            />
            <button onClick={() => setWeight(weight + 2.5)} className="w-16 h-16 bg-blue-600 rounded-full text-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:scale-110 transition-all">+</button>
          </div>
        </div>

        {/* 🔢 REPS INPUT */}
        <div>
          <label className="text-[10px] text-red-500 mb-4 block tracking-[0.5em] ml-4">INPUT_REPS (COUNT)</label>
          <div className="flex items-center gap-4">
            <button onClick={() => setReps(Math.max(1, reps - 1))} className="w-16 h-16 bg-gray-800 rounded-full border-2 border-gray-700 text-2xl hover:bg-gray-700 transition-all">-</button>
            <input 
              type="number" 
              value={reps} 
              onChange={(e) => setReps(Number(e.target.value))}
              className="flex-1 bg-transparent text-center text-5xl font-black focus:outline-none border-b-4 border-red-600 pb-2"
            />
            <button onClick={() => setReps(reps + 1)} className="w-16 h-16 bg-red-600 rounded-full text-2xl shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:scale-110 transition-all">+</button>
          </div>
        </div>

        {/* ⚡️ RESULT DISPLAY */}
        <div className="pt-8 border-t-2 border-gray-800">
          <label className="text-[10px] text-green-500 mb-4 block text-center tracking-[0.8em]">ESTIMATED_MAX_WEIGHT</label>
          <div className="text-center relative">
            <span className="text-8xl font-black italic text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.3)]">
              {e1RM}
            </span>
            <span className="text-2xl ml-2 text-gray-500">KG</span>
            
            {/* 装飾用のスキャンライン演出 */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-1 w-full animate-pulse top-1/2" />
          </div>
        </div>

      </div>

      <p className="mt-20 text-[8px] text-gray-700 tracking-[1em] uppercase">
        Matrix_Calc_Module_v1.0
      </p>
    </main>
  );
}