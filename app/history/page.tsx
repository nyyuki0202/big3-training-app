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
  // その他の種目を配列で持つように変更
  others: { name: string; weight: number; reps: number }[];
};

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
          if (!groupedMap.has(dateStr)) {
            groupedMap.set(dateStr, { date: dateStr, others: [] });
          }

          const dayEntry = groupedMap.get(dateStr)!;
          const exercise = log.exercise; // 小文字変換しない

          // BIG3の処理
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
            // 補助種目の処理 (重複チェックせず全部追加するか、最新だけ残すかはお好みで。今回はシンプルに追加)
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
      
      <div className="w-full max-w-5xl mb-6 flex justify-between items-center">
        <Link href="/" className="text-gray-400 hover:text-white text-sm">← Back</Link>
        <h1 className="text-2xl font-bold">WORKOUT LOG</h1>
      </div>

      <div className="w-full max-w-5xl overflow-x-auto rounded-xl shadow-2xl border border-gray-700">
        <table className="w-full text-center border-collapse bg-gray-800 whitespace-nowrap">
<thead>
            <tr className="bg-gray-700 text-gray-200">
              <th className="p-3 border-b border-r border-gray-600 sticky left-0 bg-gray-700 z-20">DATE</th>
              {/* BIG3 */}
              <th colSpan={3} className="p-2 border-b border-r border-gray-600 text-red-400 font-bold">BENCH</th>
              <th colSpan={3} className="p-2 border-b border-r border-gray-600 text-blue-400 font-bold">SQUAT</th>
              <th colSpan={3} className="p-2 border-b border-r border-gray-600 text-green-400 font-bold">DEADLIFT</th>
              {/* ASSISTANCE */}
              <th className="p-2 border-b border-gray-600 text-yellow-400 font-bold min-w-[150px]">OTHERS</th>
            </tr>
            <tr className="bg-gray-750 text-xs text-gray-400">
              {/* ▼ここが修正ポイント！ z-20 を追加 */}
              <th className="p-1 border-r border-b border-gray-600 sticky left-0 bg-gray-750 z-20"></th>
              
              {/* BENCH Sub-header */}
              <th className="w-12 border-r border-b border-gray-600">kg</th>
              <th className="w-8 border-r border-b border-gray-600">rep</th>
              <th className="w-12 border-r border-b border-gray-600 text-white font-bold bg-gray-700" title="Potential Value">PV</th>

              {/* SQUAT Sub-header */}
              <th className="w-12 border-r border-b border-gray-600">kg</th>
              <th className="w-8 border-r border-b border-gray-600">rep</th>
              <th className="w-12 border-r border-b border-gray-600 text-white font-bold bg-gray-700" title="Potential Value">PV</th>

              {/* DEADLIFT Sub-header */}
              <th className="w-12 border-r border-b border-gray-600">kg</th>
              <th className="w-8 border-r border-b border-gray-600">rep</th>
              <th className="w-12 border-r border-b border-gray-600 text-white font-bold bg-gray-700" title="Potential Value">PV</th>
              
              {/* Others Sub-header */}
              <th className="border-b border-gray-600 text-left px-2">Memo</th>
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

                {/* OTHERS (補助種目をリスト表示) */}
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
      
      <div className="mt-4 text-gray-500 text-xs text-center">
        <p className="font-bold mb-1">PV (Potential Value)</p>
        <p>Weight × (1 + Reps/30)</p>
        <p className="text-[10px] mt-1 opacity-70">※ 現在のパフォーマンスから算出された理論上の最大強度</p>
      </div>
    </main>
  );
}