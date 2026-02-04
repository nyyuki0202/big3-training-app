"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

// 1セットごとのデータ型
type SetData = {
  id: number;
  weight: number;
  reps: number;
  e1rm: number;
};

// 補助種目のデータ型
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

const calculateE1RM = (weight: number, reps: number) => {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
};

export default function HistoryPage() {
  const [tableData, setTableData] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // モーダル類の管理
  const [editingItem, setEditingItem] = useState<{id: number, exercise: string, weight: number, reps: number} | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false); // ダウンロード画面の開閉
  
  // 期間指定用のState
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
        // 日付を YYYY/MM/DD 形式に統一
        const dateObj = new Date(log.created_at);
        const y = dateObj.getFullYear();
        const m = (`00${dateObj.getMonth()+1}`).slice(-2);
        const d = (`00${dateObj.getDate()}`).slice(-2);
        const dateStr = `${y}/${m}/${d}`;
        
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

      const processedData = Array.from(groupedMap.values()).map(entry => {
        (['bench', 'squat', 'deadlift'] as const).forEach(key => {
          entry[key].sort((a, b) => b.e1rm - a.e1rm);
          entry[key] = entry[key].slice(0, 3);
        });
        return entry;
      });

      setTableData(processedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // ▼ CSVダウンロード実行関数
  const executeDownload = (filter: boolean) => {
    // 1. フィルタリング処理
    let targetData = tableData;
    
    if (filter) {
      targetData = tableData.filter(day => {
        // "YYYY/MM/DD" を "YYYY-MM-DD" に変換して比較
        const rowDate = day.date.replaceAll('/', '-'); 
        const start = startDate || "0000-01-01";
        const end = endDate || "9999-12-31";
        return rowDate >= start && rowDate <= end;
      });
    }

    if (targetData.length === 0) {
      alert("指定された期間のデータがありません");
      return;
    }

    // 2. CSV生成
    const header = ["Date", "Exercise", "Weight(kg)", "Reps", "E1RM", "Type"];
    const rows: string[] = [];

    targetData.forEach((day) => {
      day.bench.forEach(set => rows.push(`${day.date},BENCH PRESS,${set.weight},${set.reps},${set.e1rm},BIG3`));
      day.squat.forEach(set => rows.push(`${day.date},SQUAT,${set.weight},${set.reps},${set.e1rm},BIG3`));
      day.deadlift.forEach(set => rows.push(`${day.date},DEADLIFT,${set.weight},${set.reps},${set.e1rm},BIG3`));
      day.others.forEach(set => rows.push(`${day.date},${set.name},${set.weight},${set.reps},-,Assistance`));
    });

    const csvContent = "\uFEFF" + [header.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `workout_${filter ? 'range' : 'all'}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setShowDownloadModal(false); // モーダル閉じる
  };

  // 削除・更新処理
  const handleDelete = async () => {
    if (!editingItem) return;
    if (!confirm("本当にこの記録を削除しますか？")) return;
    const { error } = await supabase.from('workouts').delete().eq('id', editingItem.id);
    if (!error) { setEditingItem(null); fetchLogs(); }
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    const { error } = await supabase.from('workouts').update({ weight: editingItem.weight, reps: editingItem.reps }).eq('id', editingItem.id);
    if (!error) { setEditingItem(null); fetchLogs(); }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white relative">
      
      {/* ==============================================
          【ダウンロード設定モーダル】
         ============================================== */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-800 w-full max-w-sm p-6 rounded-2xl border border-gray-600 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-4 text-center border-b border-gray-700 pb-2">
              DOWNLOAD CSV 📊
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Start Date</label>
                  <input 
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-gray-900 text-white p-2 rounded-lg border border-gray-700 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">End Date</label>
                  <input 
                    type="date" 
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-gray-900 text-white p-2 rounded-lg border border-gray-700 focus:border-green-500"
                  />
                </div>
              </div>

              <button onClick={() => executeDownload(true)} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-500 shadow-lg shadow-green-900/50">
                指定期間をダウンロード 🗓️
              </button>
              
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-600"></div>
                <span className="flex-shrink mx-4 text-gray-500 text-xs">OR</span>
                <div className="flex-grow border-t border-gray-600"></div>
              </div>

              <button onClick={() => executeDownload(false)} className="w-full py-2 bg-gray-700 text-gray-300 rounded-xl font-bold hover:bg-gray-600 text-sm">
                全期間をダウンロード 📦
              </button>
            </div>
            
            <button onClick={() => setShowDownloadModal(false)} className="w-full mt-2 text-gray-500 text-sm underline hover:text-white">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ==============================================
          【編集モーダル】
         ============================================== */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-800 w-full max-w-sm p-6 rounded-2xl border border-gray-600 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-4 text-center border-b border-gray-700 pb-2">EDIT RECORD ✏️</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-gray-400 block mb-1">WEIGHT (kg)</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setEditingItem({...editingItem, weight: editingItem.weight - 2.5})} className="w-12 h-12 bg-gray-700 rounded-full font-bold hover:bg-gray-600">-2.5</button>
                  <input type="number" step="0.25" value={editingItem.weight} onChange={(e) => setEditingItem({...editingItem, weight: Number(e.target.value)})} className="flex-1 bg-gray-900 text-white text-center text-2xl font-bold p-2 rounded-lg border border-gray-700" />
                  <button onClick={() => setEditingItem({...editingItem, weight: editingItem.weight + 2.5})} className="w-12 h-12 bg-blue-600 rounded-full font-bold hover:bg-blue-500">+2.5</button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">REPS</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setEditingItem({...editingItem, reps: Math.max(0, editingItem.reps - 1)})} className="w-12 h-12 bg-gray-700 rounded-full font-bold hover:bg-gray-600">-</button>
                  <input type="number" value={editingItem.reps} onChange={(e) => setEditingItem({...editingItem, reps: Number(e.target.value)})} className="flex-1 bg-gray-900 text-white text-center text-2xl font-bold p-2 rounded-lg border border-gray-700" />
                  <button onClick={() => setEditingItem({...editingItem, reps: editingItem.reps + 1})} className="w-12 h-12 bg-blue-600 rounded-full font-bold hover:bg-blue-500">+</button>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 py-3 bg-red-900/50 text-red-400 border border-red-800 rounded-xl font-bold hover:bg-red-900">DELETE 🗑️</button>
              <button onClick={handleUpdate} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/50">UPDATE 💾</button>
            </div>
            <button onClick={() => setEditingItem(null)} className="w-full mt-4 text-gray-500 text-sm underline hover:text-white">Cancel</button>
          </div>
        </div>
      )}

      {/* 縦画面用 (Portrait View) */}
      <div className="block landscape:hidden p-4 pb-20">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">← Back</Link>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowDownloadModal(true)} className="text-green-400 hover:text-green-300 text-sm font-bold flex items-center gap-1 border border-green-800 bg-green-900/30 px-3 py-1 rounded-lg">
              CSV ⬇️
            </button>
            <h1 className="text-2xl font-bold">HISTORY</h1>
          </div>
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
                {day.bench.length > 0 && (
                  <div className="mb-3">
                    <p className="text-red-400 font-bold text-sm mb-1">BENCH PRESS</p>
                    <div className="flex flex-wrap gap-2">
                      {day.bench.map((set) => (
                        <button key={set.id} onClick={() => setEditingItem({id: set.id, exercise: 'bench', weight: set.weight, reps: set.reps})} className="bg-gray-900 px-2 py-1 rounded text-xs border border-gray-700 hover:bg-gray-700 hover:border-red-500 transition-colors">
                          {set.weight}kg × {set.reps} <span className="text-gray-500">({set.e1rm})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* (Squat/Deadlift/Others 省略 - 同じロジックで表示されます) */}
                {day.squat.length > 0 && (
                  <div className="mb-3">
                    <p className="text-blue-400 font-bold text-sm mb-1">SQUAT</p>
                    <div className="flex flex-wrap gap-2">
                      {day.squat.map((set) => (
                        <button key={set.id} onClick={() => setEditingItem({id: set.id, exercise: 'squat', weight: set.weight, reps: set.reps})} className="bg-gray-900 px-2 py-1 rounded text-xs border border-gray-700 hover:bg-gray-700 hover:border-blue-500 transition-colors">
                          {set.weight}kg × {set.reps} <span className="text-gray-500">({set.e1rm})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {day.deadlift.length > 0 && (
                  <div className="mb-3">
                    <p className="text-green-400 font-bold text-sm mb-1">DEADLIFT</p>
                    <div className="flex flex-wrap gap-2">
                      {day.deadlift.map((set) => (
                        <button key={set.id} onClick={() => setEditingItem({id: set.id, exercise: 'deadlift', weight: set.weight, reps: set.reps})} className="bg-gray-900 px-2 py-1 rounded text-xs border border-gray-700 hover:bg-gray-700 hover:border-green-500 transition-colors">
                          {set.weight}kg × {set.reps} <span className="text-gray-500">({set.e1rm})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {day.others.length > 0 && (
                  <div>
                    <p className="text-yellow-400 font-bold text-sm mb-1">OTHERS</p>
                    <div className="flex flex-wrap gap-2">
                      {day.others.map((set) => (
                        <button key={set.id} onClick={() => setEditingItem({id: set.id, exercise: set.name, weight: set.weight, reps: set.reps})} className="bg-gray-900 px-2 py-1 rounded text-xs border border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-yellow-500 transition-colors">
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

      {/* 横画面用 (Landscape View) */}
      <div className="hidden landscape:block w-full h-screen overflow-auto bg-gray-800 relative">
        <table className="w-full text-center border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-700 text-gray-200">
              <th className="p-3 border-b border-r border-gray-600 sticky left-0 top-0 bg-gray-700 z-50 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.5)] flex items-center justify-between gap-2">
                <span>DATE</span>
                <button onClick={() => setShowDownloadModal(true)} title="Download CSV" className="bg-green-700 hover:bg-green-600 text-white text-[10px] p-1 rounded">
                  ⬇️CSV
                </button>
              </th>
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
                <td className="p-2 border-r border-gray-700 bg-gray-800/30">
                  <div className="flex flex-col gap-1 items-center">
                    {row.bench.map((set) => (
                      <button key={set.id} onClick={() => setEditingItem({id: set.id, exercise: 'bench', weight: set.weight, reps: set.reps})} className="text-xs bg-gray-900/50 px-2 py-1 rounded w-full flex justify-between gap-2 hover:bg-gray-700 hover:ring-1 hover:ring-red-400 transition-all">
                        <span className="font-bold text-gray-200">{set.weight}k×{set.reps}</span>
                        <span className="font-mono text-red-400">PV:{set.e1rm}</span>
                      </button>
                    ))}
                  </div>
                </td>
                <td className="p-2 border-r border-gray-700 bg-gray-800/30">
                  <div className="flex flex-col gap-1 items-center">
                    {row.squat.map((set) => (
                      <button key={set.id} onClick={() => setEditingItem({id: set.id, exercise: 'squat', weight: set.weight, reps: set.reps})} className="text-xs bg-gray-900/50 px-2 py-1 rounded w-full flex justify-between gap-2 hover:bg-gray-700 hover:ring-1 hover:ring-blue-400 transition-all">
                        <span className="font-bold text-gray-200">{set.weight}k×{set.reps}</span>
                        <span className="font-mono text-blue-400">PV:{set.e1rm}</span>
                      </button>
                    ))}
                  </div>
                </td>
                <td className="p-2 border-r border-gray-700 bg-gray-800/30">
                  <div className="flex flex-col gap-1 items-center">
                    {row.deadlift.map((set) => (
                      <button key={set.id} onClick={() => setEditingItem({id: set.id, exercise: 'deadlift', weight: set.weight, reps: set.reps})} className="text-xs bg-gray-900/50 px-2 py-1 rounded w-full flex justify-between gap-2 hover:bg-gray-700 hover:ring-1 hover:ring-green-400 transition-all">
                        <span className="font-bold text-gray-200">{set.weight}k×{set.reps}</span>
                        <span className="font-mono text-green-400">PV:{set.e1rm}</span>
                      </button>
                    ))}
                  </div>
                </td>
                <td className="p-2 text-left text-xs text-gray-300 min-w-[200px] align-middle">
                  <div className="flex flex-wrap gap-1">
                    {row.others.map((set) => (
                      <button key={set.id} onClick={() => setEditingItem({id: set.id, exercise: set.name, weight: set.weight, reps: set.reps})} className="bg-gray-700 px-2 py-1 rounded inline-block hover:bg-gray-600 hover:text-yellow-400 transition-colors">
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