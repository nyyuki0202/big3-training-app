"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Workout = {
  id: number;
  created_at: string;
  exercise: string;
  weight: number;
  reps: number;
};

type DailyLog = {
  date: string;
  bench?: { weight: number; reps: number; e1rm: number };
  squat?: { weight: number; reps: number; e1rm: number };
  deadlift?: { weight: number; reps: number; e1rm: number };
  others: { name: string; weight: number; reps: number }[];
};

const calculateE1RM = (weight: number, reps: number) => {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
};

export default function HistoryPage() {
  const [tableData, setTableData] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ▼ 追加：全画面モードかどうかを管理するスイッチ
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error:", error);
      } else if (data) {
        const groupedMap = new Map<string, DailyLog>();

        data.forEach((log) => {
          const dateStr = new Date(log.created_at).toLocaleDateString('ja-JP');
          if (!groupedMap.has(dateStr)) {
            groupedMap.set(dateStr, { date: dateStr, others: [] });
          }

          const dayEntry = groupedMap.get(dateStr)!;
          const exercise = log.exercise; 

          if (['bench', 'squat', 'deadlift'].includes(exercise)) {
            const exKey = exercise as 'bench' | 'squat' | 'deadlift';
            const currentE1RM = calculateE1RM(log.weight, log.reps);
            const existing = dayEntry[exKey];
            
            if (!existing || currentE1RM > existing.e1rm) {
              dayEntry[exKey] = { 
                weight: log.weight, 
                reps: log.reps, 
                e1rm: currentE1RM
              };
            }
          } else {
            dayEntry.others.push({
              name: exercise,
              weight: log.weight,
              reps: log.reps
            });
          }
        });

        setTableData(Array.from(groupedMap.values()));
      }
      setLoading(false);
    };

    fetchLogs();
  }, []);

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 flex flex-col items-center">
      
      {/* 通常時のヘッダー（全画面時は隠す） */}
      {!isFullScreen && (
        <div className="w-full max-w-5xl mb-6 flex justify-between items-center">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold">WORKOUT LOG</h1>
        </div>
      )}

      {/* ▼ テーブルエリア（ここがボタンで変身する！） ▼ */}
      <div 
        className={`transition-all duration-300 ease-in-out border border-gray-700 shadow-2xl
          ${isFullScreen 
            ? "fixed inset-0 z-50 bg-gray-900 w-full h-full p-2 overflow-auto" // 全画面モード
            : "w-full max-w-5xl rounded-xl overflow-x-auto relative" // 通常モード
          }`}
      >
        
        {/* 全画面切り替えボタン */}
        <div className="sticky left-0 top-0 w-full flex justify-end p-2 z-30 pointer-events-none">
          <button 
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="pointer-events-auto bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-bold hover:bg-gray-600 active:scale-95 transition-transform flex items-center gap-2 border border-gray-500"
          >
            {isFullScreen ? (
              <>CLOSE ✕</>
            ) : (
              <>EXPAND ⤢</>
            )}
          </button>
        </div>

        <table className="w-full text-center border-collapse bg-gray-800 whitespace-nowrap mt-[-40px]">
          <thead>
            <tr className="bg-gray-700 text-gray-200">
              {/* 日付列：スクロールしてもついてくるように sticky 設定 */}
              <th className="p-3 border-b border-r border-gray-600 sticky left-0 top-0 bg-gray-700 z-20 pt-12">DATE</th>
              
              {/* BIG3 */}
              <th colSpan={3} className="p-2 border-b border-r border-gray-600 text-red-400 font-bold sticky top-0 bg-gray-700 pt-12">BENCH</th>
              <th colSpan={3} className="p-2 border-b border-r border-gray-600 text-blue-400 font-bold sticky top-0 bg-gray-700 pt-12">SQUAT</th>
              <th colSpan={3} className="p-2 border-b border-r border-gray-600 text-green-400 font-bold sticky top-0 bg-gray-700 pt-12">DEADLIFT</th>
              {/* ASSISTANCE */}
              <th className="p-2 border-b border-gray-600 text-yellow-400 font-bold min-w-[150px] sticky top-0 bg-gray-700 pt-12">OTHERS</th>
            </tr>
            <tr className="bg-gray-750 text-xs text-gray-400">
              <th className="p-1 border-r border-b border-gray-600 sticky left-0 top-[50px] bg-gray-750 z-20"></th>
              
              {/* BIG3 Sub-headers */}
              {[...Array(3)].map((_, i) => (
                <>
                  <th className="w-12 border-r border-b border-gray-600 sticky top-[50px] bg-gray-750">kg</th>
                  <th className="w-8 border-r border-b border-gray-600 sticky top-[50px] bg-gray-750">rep</th>
                  <th className="w-12 border-r border-b border-gray-600 text-white font-bold bg-gray-700 sticky top-[50px]" title="Potential Value">PV</th>
                </>
              ))}
              
              <th className="border-b border-gray-600 text-left px-2 sticky top-[50px] bg-gray-750">Memo</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan={14} className="p-8 text-gray-500 animate-pulse">Loading...</td></tr>
            ) : tableData.map((row) => (
              <tr key={row.date} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                <td className="p-4 font-mono font-bold text-gray-300 border-r border-gray-700 sticky left-0 bg-gray-800">
                  {row.date}
                </td>

                {/* BENCH */}
                <td className="p-2">{row.bench?.weight ?? "-"}</td>
                <td className="p-2 text-gray-400 text-xs">{row.bench?.reps ?? "-"}</td>
                <td className="p-2 font-black text-red-400 bg-gray-800 border-r border-gray-700">
                  {row.bench ? `${row.bench.e1rm}` : "-"}
                </td>

                {/* SQUAT */}
                <td className="p-2">{row.squat?.weight ?? "-"}</td>
                <td className="p-2 text-gray-400 text-xs">{row.squat?.reps ?? "-"}</td>
                <td className="p-2 font-black text-blue-400 bg-gray-800 border-r border-gray-700">
                  {row.squat ? `${row.squat.e1rm}` : "-"}
                </td>

                {/* DEADLIFT */}
                <td className="p-2">{row.deadlift?.weight ?? "-"}</td>
                <td className="p-2 text-gray-400 text-xs">{row.deadlift?.reps ?? "-"}</td>
                <td className="p-2 font-black text-green-400 bg-gray-800 border-r border-gray-700">
                  {row.deadlift ? `${row.deadlift.e1rm}` : "-"}
                </td>

                {/* OTHERS */}
                <td className="p-2 text-left text-xs text-gray-300">
                  {row.others.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {row.others.map((item, idx) => (
                        <span key={idx} className="bg-gray-700 px-2 py-1 rounded inline-block">
                          <span className="text-yellow-400 font-bold">{item.name}</span>: {item.weight}kg × {item.reps}
                        </span>
                      ))}
                    </div>
                  ) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {!isFullScreen && (
        <div className="mt-4 text-gray-500 text-xs text-center">
          <p className="font-bold mb-1">PV (Potential Value)</p>
          <p>Weight × (1 + Reps/30)</p>
          <p className="text-[10px] mt-1 opacity-70">※ 現在のパフォーマンスから算出された理論上の最大強度</p>
        </div>
      )}
    </main>
  );
}