"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// 1セットごとのデータ型（IDを追加）
type SetData = {
  id: number;
  weight: number;
  reps: number;
  e1rm: number;
};

// 補助種目のデータ型（IDを追加）
type OtherData = {
  id: number;
  name: string;
  weight: number;
  reps: number;
};

// 1日分のデータ型
type DailyLog = {
  date: string;
  bench: SetData[];
  squat: SetData[];
  deadlift: SetData[];
  others: OtherData[];
};

// E1RM計算
const calculateE1RM = (weight: number, reps: number) => {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
};

export default function HistoryPage() {
  const [tableData, setTableData] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ▼ 編集モーダル用の状態管理
  const [editingItem, setEditingItem] = useState<{id: number, exercise: string, weight: number, reps: number} | null>(null);

  // データ取得関数（再利用するために外に出しました）
  const fetchLogs = async () => {
    setLoading(true);
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
        const setData: SetData = { id: log.id, weight: log.weight, reps: log.reps, e1rm: currentE1RM };

        if (exercise === 'bench') {
          dayEntry.bench.push(setData);
        } else if (exercise === 'squat') {
          dayEntry.squat.push(setData);
        } else if (exercise === 'deadlift') {
          dayEntry.deadlift.push(setData);
        } else {
          dayEntry.others.push({
            id: log.id,
            name: exercise,
            weight: log.weight,
            reps: log.reps
          });
        }
      });

      // 並び替え処理
      const processedData = Array.from(groupedMap.values()).map(entry => {
        (['bench', 'squat', 'deadlift'] as const).forEach(key => {
          entry[key].sort((a, b) => b.e1rm - a.e1rm); // 強度高い順
          entry[key] = entry[key].slice(0, 3); // Top 3
        });
        return entry;
      });

      setTableData(processedData);
    }
    setLoading(false);
  };

  // 初回ロード
  useEffect(() => {
    fetchLogs();
  }, []);

  // 削除処理
  const handleDelete = async () => {
    if (!editingItem) return;
    if (!confirm("本当にこの記録を削除しますか？")) return;

    const { error } = await supabase.from('workouts').delete().eq('id', editingItem.id);
    if (error) {
      alert("削除に失敗しました");
    } else {
      setEditingItem(null); // モーダル閉じる
      fetchLogs(); // データを再取得して画面更新
    }
  };

  // 更新処理
  const handleUpdate = async () => {
    if (!editingItem) return;

    const { error } = await supabase
      .from('workouts')
      .update({ weight: editingItem.weight, reps: editingItem.reps })
      .eq('id', editingItem.id);

    if (error) {
      alert("更新に失敗しました");
    } else {
      setEditingItem(null); // モーダル閉じる
      fetchLogs(); // データを再取得して画面更新
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white relative">
      
      {/* ==============================================
          【編集モーダル】 (editingItemがある時だけ表示)
         ============================================== */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-800 w-full max-w-sm p-6 rounded-2xl border border-gray-600 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-4 text-center border-b border-gray-700 pb-2">
              EDIT RECORD ✏️
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-gray-400 block mb-1">WEIGHT (kg)</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setEditingItem({...editingItem, weight: editingItem.weight - 1})} className="w-10 h-10 bg-gray-700 rounded-full font-bold">-</button>
                  <input 
                    type="number" 
                    value={editingItem.weight}
                    onChange={(e) => setEditingItem({...editingItem, weight: Number(e.target.value)})}
                    className="flex-1 bg-gray-900 text-white text-center text-2xl font-bold p-2 rounded-lg"
                  />
                  <button onClick={() => setEditingItem({...editingItem, weight: editingItem.weight + 1})} className="w-10 h-10 bg-gray-700 rounded-full font-bold">+</button>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">REPS</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setEditingItem({...editingItem, reps: Math.max(0, editingItem.reps - 1)})} className="w-10 h-10 bg-gray-700 rounded-full font-bold">-</button>
                  <input 
                    type="number" 
                    value={editingItem.reps}
                    onChange={(e) => setEditingItem({...editingItem, reps: Number(e.target.value)})}
                    className="flex-1 bg-gray-900 text-white text-center text-2xl font-bold p-2 rounded-lg"
                  />
                  <button onClick={() => setEditingItem({...editingItem, reps: editingItem.reps + 1})} className="w-10 h-10 bg-gray-700 rounded-full font-bold">+</button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 py-3 bg-red-900/50 text-red-400 border border-red-800 rounded-xl font-bold hover:bg-red-900">
                DELETE 🗑️
              </button>
              <button onClick={handleUpdate} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/50">
                UPDATE 💾
              </button>
            </div>
            
            <button onClick={() => setEditingItem(null)} className="w-full mt-4 text-gray-500 text-sm underline">
              Cancel
            </button>
          </div>
        </div>
      )}


      {/* ==============================================
          【縦画面用】 (クリックで編集を開く)
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
                  <span className="text-xs text-gray-500 font-normal self-end">Tap to Edit 👆</span>
                </h2>
                
                {/* BENCH */}
                {day.bench.length > 0 && (
                  <div className="mb-3">
                    <p className="text-red-400 font-bold text-sm mb-1">BENCH PRESS</p>
                    <div className="flex flex-wrap gap-2">
                      {day.bench.map((set) => (
                        <button 
                          key={set.id} 
                          onClick={() => setEditingItem({id: set.id, exercise: 'bench', weight: set.weight, reps: set.reps})}
                          className="bg-gray-900 px-2 py-1 rounded text-xs border border-gray-700 hover:bg-gray-700 hover:border-red-500 transition-colors"
                        >
                          {set.weight}kg × {set.reps} <span className="text-gray-500">({set.e1rm})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* SQUAT */}
                {day.squat.length > 0 && (
                  <div className="mb-3">
                    <p className="text-blue-400 font-bold text-sm mb-1">SQUAT</p>
                    <div className="flex flex-wrap gap-2">
                      {day.squat.map((set) => (
                        <button 
                          key={set.id} 
                          onClick={() => setEditingItem({id: set.id, exercise: 'squat', weight: set.weight, reps: set.reps})}
                          className="bg-gray-900 px-2 py-1 rounded text-xs border border-gray-700 hover:bg-gray-700 hover:border-blue-500 transition-colors"
                        >
                          {set.weight}kg × {set.reps} <span className="text-gray-500">({set.e1rm})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* DEADLIFT */}
                {day.deadlift.length > 0 && (
                  <div className="mb-3">
                    <p className="text-green-400 font-bold text-sm mb-1">DEADLIFT</p>
                    <div className="flex flex-wrap gap-2">
                      {day.deadlift.map((set) => (
                        <button 
                          key={set.id} 
                          onClick={() => setEditingItem({id: set.id, exercise: 'deadlift', weight: set.weight, reps: set.reps})}
                          className="bg-gray-900 px-2 py-1 rounded text-xs border border-gray-700 hover:bg-gray-700 hover:border-green-500 transition-colors"
                        >
                          {set.weight}kg × {set.reps} <span className="text-gray-500">({set.e1rm})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* OTHERS */}
                {day.others.length > 0 && (
                  <div>
                    <p className="text-yellow-400 font-bold text-sm mb-1">OTHERS</p>
                    <div className="flex flex-wrap gap-2">
                      {day.others.map((set) => (
                        <button 
                          key={set.id} 
                          onClick={() => setEditingItem({id: set.id, exercise: set.name, weight: set.weight, reps: set.reps})}
                          className="bg-gray-900 px-2 py-1 rounded text-xs border border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-yellow-500 transition-colors"
                        >
                          {set.name}: {set.weight}kg × {set.reps}
                        </button>
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
          【横画面用】 テーブル表示 (ここもクリック可能に！)
         ============================================== */}
      <div className="hidden landscape:block w-full h-screen overflow-auto bg-gray-800 relative">
        <table className="w-full text-center border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-700 text-gray-200">
              <th className="p-3 border-b border-r border-gray-600 sticky left-0 top-0 bg-gray-700 z-50 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)]">DATE</th>
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
                <td className="p-4 font-mono font-bold text-gray-300 border-r border-gray-700 sticky left-0 bg-gray-800 z-50 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)] align-middle">
                  {row.date}
                </td>

                {/* BENCH Cell */}
                <td className="p-2 border-r border-gray-700 bg-gray-800/30">
                  <div className="flex flex-col gap-1 items-center">
                    {row.bench.map((set) => (
                      <button 
                        key={set.id} 
                        onClick={() => setEditingItem({id: set.id, exercise: 'bench', weight: set.weight, reps: set.reps})}
                        className="text-xs bg-gray-900/50 px-2 py-1 rounded w-full flex justify-between gap-2 hover:bg-gray-700 hover:ring-1 hover:ring-red-400 transition-all"
                      >
                        <span className="font-bold text-gray-200">{set.weight}k×{set.reps}</span>
                        <span className="font-mono text-red-400">PV:{set.e1rm}</span>
                      </button>
                    ))}
                  </div>
                </td>

                {/* SQUAT Cell */}
                <td className="p-2 border-r border-gray-700 bg-gray-800/30">
                  <div className="flex flex-col gap-1 items-center">
                    {row.squat.map((set) => (
                      <button 
                        key={set.id} 
                        onClick={() => setEditingItem({id: set.id, exercise: 'squat', weight: set.weight, reps: set.reps})}
                        className="text-xs bg-gray-900/50 px-2 py-1 rounded w-full flex justify-between gap-2 hover:bg-gray-700 hover:ring-1 hover:ring-blue-400 transition-all"
                      >
                        <span className="font-bold text-gray-200">{set.weight}k×{set.reps}</span>
                        <span className="font-mono text-blue-400">PV:{set.e1rm}</span>
                      </button>
                    ))}
                  </div>
                </td>

                {/* DEADLIFT Cell */}
                <td className="p-2 border-r border-gray-700 bg-gray-800/30">
                  <div className="flex flex-col gap-1 items-center">
                    {row.deadlift.map((set) => (
                      <button 
                        key={set.id} 
                        onClick={() => setEditingItem({id: set.id, exercise: 'deadlift', weight: set.weight, reps: set.reps})}
                        className="text-xs bg-gray-900/50 px-2 py-1 rounded w-full flex justify-between gap-2 hover:bg-gray-700 hover:ring-1 hover:ring-green-400 transition-all"
                      >
                        <span className="font-bold text-gray-200">{set.weight}k×{set.reps}</span>
                        <span className="font-mono text-green-400">PV:{set.e1rm}</span>
                      </button>
                    ))}
                  </div>
                </td>

                {/* OTHERS Cell */}
                <td className="p-2 text-left text-xs text-gray-300 min-w-[200px] align-middle">
                  <div className="flex flex-wrap gap-1">
                    {row.others.map((set) => (
                      <button 
                        key={set.id} 
                        onClick={() => setEditingItem({id: set.id, exercise: set.name, weight: set.weight, reps: set.reps})}
                        className="bg-gray-700 px-2 py-1 rounded inline-block hover:bg-gray-600 hover:text-yellow-400 transition-colors"
                      >
                        <span className="text-yellow-400 font-bold">{set.name}</span>: {set.weight}kg × {set.reps}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}