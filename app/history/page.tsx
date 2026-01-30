"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

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
    <main className="min-h-screen bg-gray-900 text-white">
      
      {/* ▼▼▼ 【ここが強制装置】縦画面のときだけ出る警告オーバーレイ ▼▼▼ */}
      <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col items-center justify-center p-6 text-center md:hidden portrait:flex landscape:hidden">
        <div className="text-6xl mb-6 animate-pulse">📱 ➡️ 🔄</div>
        <h2 className="text-2xl font-black text-yellow-500 mb-4 tracking-widest">ROTATE DEVICE</h2>
        <p className="text-gray-400 font-bold">
          このページは横画面専用です。<br/>
          スマホを横に向けてください。
        </p>
        <Link href="/" className="mt-12 text-gray-500 underline text-sm">
          トップに戻る
        </Link>
      </div>

      {/* PC用の戻るボタン（スマホ横画面では邪魔なので隠す調整も可） */}
      <div className="p-4 flex justify-between items-center bg-gray-900 sticky top-0 z-40">
        <Link href="/" className="text-gray-400 hover:text-white text-sm font-bold">
          ← TOP
        </Link>
        <h1 className="text-xl font-bold tracking-wider">WORKOUT LOG</h1>
      </div>

      {/* ▼ テーブルエリア（常時フルスクリーン・横スクロール） ▼ */}
      <div className="w-full h-[calc(100vh-60px)] overflow-auto bg-gray-800 relative">
        <table className="w-full text-center border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-700 text-gray-200">
              {/* DATE列：最強の z-index: 50 で固定 */}
              <th className="p-3 border-b border-r border-gray-600 sticky left-0 top-0 bg-gray-700 z-50 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)]">DATE</th>
              
              {/* 他のヘッダー：z-index: 40 */}
              <th colSpan={3} className="p-2 border-b border-r border-gray-600 text-red-400 font-bold sticky top-0 bg-gray-700 z-40">BENCH</th>
              <th colSpan={3} className="p-2 border-b border-r border-gray-600 text-blue-400 font-bold sticky top-0 bg-gray-700 z-40">SQUAT</th>
              <th colSpan={3} className="p-2 border-b border-r border-gray-600 text-green-400 font-bold sticky top-0 bg-gray-700 z-40">DEADLIFT</th>
              <th className="p-2 border-b border-gray-600 text-yellow-400 font-bold min-w-[200px] sticky top-0 bg-gray-700 z-40">OTHERS</th>
            </tr>
            
            {/* サブヘッダー */}
            <tr className="bg-gray-750 text-xs text-gray-400">
              {/* 空白セルも最強固定 z-50 */}
              <th className="p-1 border-r border-b border-gray-600 sticky left-0 top-[49px] bg-gray-750 z-50 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)]"></th>
              
              {[...Array(3)].map((_, i) => (
                <>
                  <th className="w-14 border-r border-b border-gray-600 sticky top-[49px] bg-gray-750 z-30">kg</th>
                  <th className="w-10 border-r border-b border-gray-600 sticky top-[49px] bg-gray-750 z-30">rep</th>
                  <th className="w-14 border-r border-b border-gray-600 text-white font-bold bg-gray-700 sticky top-[49px] z-30">PV</th>
                </>
              ))}
              <th className="border-b border-gray-600 text-left px-2 sticky top-[49px] bg-gray-750 z-30">Memo</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan={14} className="p-8 text-gray-500 animate-pulse">Loading...</td></tr>
            ) : tableData.map((row) => (
              <tr key={row.date} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                {/* DATE列（データ部分）：最強固定 z-50 */}
                <td className="p-4 font-mono font-bold text-gray-300 border-r border-gray-700 sticky left-0 bg-gray-800 z-50 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)]">
                  {row.date}
                </td>

                {/* BENCH */}
                <td className="p-2">{row.bench?.weight ?? "-"}</td>
                <td className="p-2 text-gray-400 text-xs">{row.bench?.reps ?? "-"}</td>
                <td className="p-2 font-black text-red-400 bg-gray-800/30 border-r border-gray-700">
                  {row.bench ? `${row.bench.e1rm}` : "-"}
                </td>

                {/* SQUAT */}
                <td className="p-2">{row.squat?.weight ?? "-"}</td>
                <td className="p-2 text-gray-400 text-xs">{row.squat?.reps ?? "-"}</td>
                <td className="p-2 font-black text-blue-400 bg-gray-800/30 border-r border-gray-700">
                  {row.squat ? `${row.squat.e1rm}` : "-"}
                </td>

                {/* DEADLIFT */}
                <td className="p-2">{row.deadlift?.weight ?? "-"}</td>
                <td className="p-2 text-gray-400 text-xs">{row.deadlift?.reps ?? "-"}</td>
                <td className="p-2 font-black text-green-400 bg-gray-800/30 border-r border-gray-700">
                  {row.deadlift ? `${row.deadlift.e1rm}` : "-"}
                </td>

                {/* OTHERS */}
                <td className="p-2 text-left text-xs text-gray-300 min-w-[200px]">
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