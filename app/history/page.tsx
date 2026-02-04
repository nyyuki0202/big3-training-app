"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// 1セットごとのデータ型
type SetData = {
  weight: number;
  reps: number;
  e1rm: number;
};

// 1日分のデータ型（各種目は配列で持つ）
type DailyLog = {
  date: string;
  bench: SetData[];
  squat: SetData[];
  deadlift: SetData[];
  others: { name: string; weight: number; reps: number }[];
};

// E1RM計算
const calculateE1RM = (weight: number, reps: number) => {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
};

export default function HistoryPage() {
  const [tableData, setTableData] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

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
          
          // その日のデータ枠がなければ作る
          if (!groupedMap.has(dateStr)) {
            groupedMap.set(dateStr, { 
              date: dateStr, 
              bench: [], 
              squat: [], 
              deadlift: [], 
              others: [] 
            });
          }

          const dayEntry = groupedMap.get(dateStr)!;
          const exercise = log.exercise;
          const currentE1RM = calculateE1RM(log.weight, log.reps);
          const setData: SetData = { weight: log.weight, reps: log.reps, e1rm: currentE1RM };

          // 種目ごとに配列に追加
          if (exercise === 'bench') {
            dayEntry.bench.push(setData);
          } else if (exercise === 'squat') {
            dayEntry.squat.push(setData);
          } else if (exercise === 'deadlift') {
            dayEntry.deadlift.push(setData);
          } else {
            dayEntry.others.push({
              name: exercise,
              weight: log.weight,
              reps: log.reps
            });
          }
        });

        // 最後に各BIG3種目を「E1RMが高い順」に並び替えて「上位3つ」に絞る
        const processedData = Array.from(groupedMap.values()).map(entry => {
          (['bench', 'squat', 'deadlift'] as const).forEach(key => {
            entry[key].sort((a, b) => b.e1rm - a.e1rm); // パフォーマンス高い順
            entry[key] = entry[key].slice(0, 3); // Top 3のみ残す
          });
          return entry;
        });

        setTableData(processedData);
      }
      setLoading(false);
    };

    fetchLogs();
  }, []);

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      
      {/* ==============================================
          【縦画面用】 カード型リスト表示 (Portrait View)
         ============================================== */}
      <div className="block landscape:hidden p-4 pb-20">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">← Back</Link>
          <h1 className="text-2xl font-bold">HISTORY</h1>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Loading...</p>
        ) : (
          <div className="space-y-4">
            {tableData.map((day) => (
              <div key={day.date} className="bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-700">
                <h2 className="text-lg font-bold text-gray-200 border-b border-gray-600 pb-2 mb-3 flex justify-between">
                  <span>{day.date}</span>
                  <span className="text-xs text-gray-500 font-normal self-end">Best 3 Sets</span>
                </h2>
                
                {/* BENCH */}
                {day.bench.length > 0 && (
                  <div className="mb-3">
                    <p className="text-red-400 font-bold text-sm mb-1">BENCH PRESS</p>
                    <div className="flex flex-wrap gap-2">
                      {day.bench.map((set, i) => (
                        <span key={i} className="bg-gray-900 px-2 py-1 rounded text-xs border border-gray-700">
                          {set.weight}kg × {set.reps} <span className="text-gray-500">({set.e1rm})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* SQUAT */}
                {day.squat.length > 0 && (
                  <div className="mb-3">
                    <p className="text-blue-400 font-bold text-sm mb-1">SQUAT</p>
                    <div className="flex flex-wrap gap-2">
                      {day.squat.map((set, i) => (
                        <span key={i} className="bg-gray-900 px-2 py-1 rounded text-xs border border-gray-700">
                          {set.weight}kg × {set.reps} <span className="text-gray-500">({set.e1rm})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* DEADLIFT */}
                {day.deadlift.length > 0 && (
                  <div className="mb-3">
                    <p className="text-green-400 font-bold text-sm mb-1">DEADLIFT</p>
                    <div className="flex flex-wrap gap-2">
                      {day.deadlift.map((set, i) => (
                        <span key={i} className="bg-gray-900 px-2 py-1 rounded text-xs border border-gray-700">
                          {set.weight}kg × {set.reps} <span className="text-gray-500">({set.e1rm})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* OTHERS */}
                {day.others.length > 0 && (
                  <div>
                    <p className="text-yellow-400 font-bold text-sm mb-1">OTHERS</p>
                    <div className="flex flex-col gap-1">
                      {day.others.map((set, i) => (
                        <span key={i} className="text-xs text-gray-400">
                          • {set.name}: {set.weight}kg × {set.reps}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>横画面にすると集計表が見れます 🔄</p>
        </div>
      </div>


      {/* ==============================================
          【横画面用】 テーブル全画面表示 (Landscape View)
         ============================================== */}
      <div className="hidden landscape:block w-full h-screen overflow-auto bg-gray-800 relative">
        <table className="w-full text-center border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-700 text-gray-200">
              {/* DATE */}
              <th className="p-3 border-b border-r border-gray-600 sticky left-0 top-0 bg-gray-700 z-50 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)]">DATE</th>
              
              {/* HEADERS */}
              <th className="p-2 border-b border-r border-gray-600 text-red-400 font-bold sticky top-0 bg-gray-700 z-40 min-w-[140px]">BENCH (Top 3)</th>
              <th className="p-2 border-b border-r border-gray-600 text-blue-400 font-bold sticky top-0 bg-gray-700 z-40 min-w-[140px]">SQUAT (Top 3)</th>
              <th className="p-2 border-b border-r border-gray-600 text-green-400 font-bold sticky top-0 bg-gray-700 z-40 min-w-[140px]">DEADLIFT (Top 3)</th>
              <th className="p-2 border-b border-gray-600 text-yellow-400 font-bold min-w-[200px] sticky top-0 bg-gray-700 z-40">OTHERS</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-gray-500 animate-pulse">Loading...</td></tr>
            ) : tableData.map((row) => (
              <tr key={row.date} className="border-b border-gray-700 hover:bg-gray-750 transition-colors align-top">
                {/* Date */}
                <td className="p-4 font-mono font-bold text-gray-300 border-r border-gray-700 sticky left-0 bg-gray-800 z-50 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)] align-middle">
                  {row.date}
                </td>

                {/* BENCH Cell */}
                <td className="p-2 border-r border-gray-700 bg-gray-800/30">
                  {row.bench.length > 0 ? (
                    <div className="flex flex-col gap-1 items-center">
                      {row.bench.map((set, i) => (
                        <div key={i} className="text-xs bg-gray-900/50 px-2 py-1 rounded w-full flex justify-between gap-2">
                          <span className="font-bold text-gray-200">{set.weight}k×{set.reps}</span>
                          <span className="font-mono text-red-400">PV:{set.e1rm}</span>
                        </div>
                      ))}
                    </div>
                  ) : "-"}
                </td>

                {/* SQUAT Cell */}
                <td className="p-2 border-r border-gray-700 bg-gray-800/30">
                  {row.squat.length > 0 ? (
                    <div className="flex flex-col gap-1 items-center">
                      {row.squat.map((set, i) => (
                        <div key={i} className="text-xs bg-gray-900/50 px-2 py-1 rounded w-full flex justify-between gap-2">
                          <span className="font-bold text-gray-200">{set.weight}k×{set.reps}</span>
                          <span className="font-mono text-blue-400">PV:{set.e1rm}</span>
                        </div>
                      ))}
                    </div>
                  ) : "-"}
                </td>

                {/* DEADLIFT Cell */}
                <td className="p-2 border-r border-gray-700 bg-gray-800/30">
                  {row.deadlift.length > 0 ? (
                    <div className="flex flex-col gap-1 items-center">
                      {row.deadlift.map((set, i) => (
                        <div key={i} className="text-xs bg-gray-900/50 px-2 py-1 rounded w-full flex justify-between gap-2">
                          <span className="font-bold text-gray-200">{set.weight}k×{set.reps}</span>
                          <span className="font-mono text-green-400">PV:{set.e1rm}</span>
                        </div>
                      ))}
                    </div>
                  ) : "-"}
                </td>

                {/* OTHERS Cell */}
                <td className="p-2 text-left text-xs text-gray-300 min-w-[200px] align-middle">
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
    </main>
  );
}