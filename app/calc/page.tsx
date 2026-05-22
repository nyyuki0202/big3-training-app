"use client";

import { useState } from "react";
import Link from "next/link";

export default function OneRepMaxConverter() {
  const [weight, setWeight] = useState(100);
  const [reps, setReps] = useState(1);

  // 💡 エプリーの公式による推定1RM計算
  const calculate1RM = () => {
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30));
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 pb-20 font-bold italic tracking-tighter flex flex-col items-center justify-center overflow-x-hidden">
      
      {/* 戻るリンク */}
      <div className="w-full max-w-xs mb-12">
        <Link href="/" className="text-gray-600 hover:text-white text-xs tracking-widest font-normal transition-colors">
          ← EXIT_CALCULATOR
        </Link>
      </div>

      {/* メインタイトル */}
      <h1 className="text-4xl font-black tracking-widest text-gray-400 uppercase text-center mb-16 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-700">
        1RM_CONVERTER
      </h1>

      <div className="w-full max-w-xs space-y-12">
        
        {/* --- WEIGHT INPUT CARD --- */}
        <div className="relative border-b border-blue-600 pb-4">
          <label className="text-[10px] text-blue-500 tracking-widest block uppercase mb-6">
            INPUT_WEIGHT (KG)
          </label>
          <div className="flex items-center justify-between">
            {/* 縦型のインジケータバーを再現 */}
            <div className="w-2 h-16 bg-gray-800 rounded-full relative flex items-center justify-center border border-gray-700">
              <div 
                className="absolute w-3 h-1.5 bg-gray-400 rounded border border-gray-900 shadow-sm"
                style={{ bottom: `${Math.min(100, (weight / 200) * 100)}%` }}
              />
            </div>
            
            {/* 数値入力部分 */}
            <input 
              type="number" 
              value={weight} 
              onChange={(e) => setWeight(Math.max(0, Number(e.target.value)))}
              className="w-48 bg-transparent text-right text-6xl font-black text-white focus:outline-none tracking-tighter"
            />
          </div>
        </div>

        {/* --- REPS INPUT CARD --- */}
        <div className="relative border-b border-red-600 pb-4">
          <label className="text-[10px] text-red-500 tracking-widest block uppercase mb-6">
            INPUT_REPS (COUNT)
          </label>
          <div className="flex items-center justify-between">
            {/* 縦型のインジケータバーを再現 */}
            <div className="w-2 h-16 bg-gray-800 rounded-full relative flex items-center justify-center border border-gray-700">
              <div 
                className="absolute w-3 h-1.5 bg-gray-400 rounded border border-gray-900 shadow-sm"
                style={{ bottom: `${Math.min(100, (reps / 20) * 100)}%` }}
              />
            </div>
            
            {/* 数値入力部分 */}
            <input 
              type="number" 
              value={reps} 
              onChange={(e) => setReps(Math.max(1, Number(e.target.value)))}
              className="w-48 bg-transparent text-right text-6xl font-black text-white focus:outline-none tracking-tighter"
            />
          </div>
        </div>

        {/* 区切り線 */}
        <div className="h-[1px] bg-gray-800 my-8" />

        {/* --- ESTIMATED RESULT --- */}
        <div className="text-center pt-4">
          <label className="text-[10px] text-green-500 tracking-widest block uppercase mb-4">
            ESTIMATED_MAX_WEIGHT
          </label>
          <div className="inline-flex items-baseline justify-center gap-2 relative group">
            {/* クソデカ換算数値（光彩グロー効果付き） */}
            <span className="text-7xl font-black text-white tracking-tighter drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]">
              {calculate1RM()}
            </span>
            <span className="text-2xl font-black text-gray-500 italic">
              KG
            </span>
          </div>
        </div>

      </div>

      {/* フッターモジュール表記 */}
      <div className="mt-20 text-[9px] text-gray-700 tracking-[0.3em] uppercase opacity-40">
        MATRIX_CALC_MODULE_V1.0
      </div>

    </main>
  );
}