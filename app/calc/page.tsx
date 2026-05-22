"use client";

import { useState } from "react";
import Link from "next/link";

export default function OneRepMaxConverter() {
  const [weight, setWeight] = useState(100);
  const [reps, setReps] = useState(5);

  const calculate1RM = () => {
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30));
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 pb-20 flex flex-col items-center justify-center">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div>
          <Link href="/" className="text-gray-400 hover:text-white text-sm">← Back to TOP</Link>
        </div>

        <h1 className="text-2xl font-bold text-center text-purple-400 uppercase tracking-wider mb-2">1RM CONVERTER</h1>

        {/* 💡 いつもの重量設定カード（青ベース） */}
        <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 text-center">
          <label className="text-xs text-gray-400 block mb-2">WEIGHT (kg)</label>
          <div className="flex items-center justify-between">
            <button onClick={() => setWeight(Math.max(0, weight - 2.5))} className="w-12 h-12 bg-gray-700 rounded-full font-bold hover:bg-gray-600">-2.5</button>
            <input type="number" step="0.25" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-24 bg-transparent text-center text-2xl font-bold focus:outline-none" />
            <button onClick={() => setWeight(weight + 2.5)} className="w-12 h-12 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-500">+2.5</button>
          </div>
        </div>

        {/* 💡 いつものレップ設定カード（紫ベース） */}
        <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 text-center">
          <label className="text-xs text-gray-400 block mb-2">REPS</label>
          <div className="flex items-center justify-between">
            <button onClick={() => setReps(Math.max(1, reps - 1))} className="w-12 h-12 bg-gray-700 rounded-full font-bold hover:bg-gray-600">-</button>
            <input type="number" value={reps} onChange={(e) => setReps(Number(e.target.value))} className="w-24 bg-transparent text-center text-2xl font-bold focus:outline-none" />
            <button onClick={() => setReps(reps + 1)} className="w-12 h-12 bg-purple-600 text-white rounded-full font-bold hover:bg-purple-500">+</button>
          </div>
        </div>

        {/* 💡 換算結果：大きめに強調表示 */}
        <div className="mt-6 p-6 bg-gray-800/40 rounded-2xl border border-gray-800 text-center shadow-inner">
          <label className="text-xs text-green-400 font-bold block mb-2 uppercase tracking-widest">ESTIMATED 1RM</label>
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-6xl font-black text-white tracking-tighter">
              {calculate1RM()}
            </span>
            <span className="text-xl font-bold text-gray-500">KG</span>
          </div>
        </div>
      </div>
    </main>
  );
}