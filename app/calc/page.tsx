"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// --- 型定義 ---
type SetData = { id: number; weight: number; reps: number; e1rm: number; notes?: string; };
type OtherData = { id: number; name: string; weight: number; reps: number; notes?: string; };
type DailyLog = { date: string; bench: SetData[]; squat: SetData[]; deadlift: SetData[]; assistance: OtherData[]; };

const calculateE1RM = (weight: number, reps: number) => {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
};

export default function HistoryPage() {
  const router = useRouter();
  const [tableData, setTableData] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<{id: number, exercise: string, weight: number, reps: number, notes?: string} | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleDelete = async () => {
    if (!editingItem) return;
    if (!confirm("本当に削除しますか？")) return;
    const { error } = await supabase.from('workouts').delete().eq('id', editingItem.id);
    if (!error) { setEditingItem(null); fetchLogs(); }
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    const { error } = await supabase.from('workouts')
      .update({ weight: editingItem.weight, reps: editingItem.reps, notes: editingItem.notes })
      .eq('id', editingItem.id);
    if (!error) { setEditingItem(null); fetchLogs(); }
  };

  const fetchLogs = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const groupedMap = new Map<string, DailyLog>();
      data.forEach((log) => {
        const d = new Date(log.created_at);
        const dateStr = `${d.getFullYear()}/${(`0${d.getMonth()+1}`).slice(-2)}/${(`0${d.getDate()}`).slice(-2)}`;
        if (!groupedMap.has(dateStr)) {
          groupedMap.set(dateStr, { date: dateStr, bench: [], squat: [], deadlift: [], assistance: [] });
        }
        const day = groupedMap.get(dateStr)!;
        const e1rm = calculateE1RM(log.weight, log.reps);
        const entry = { id: log.id, weight: log.weight, reps: log.reps, notes: log.notes, e1rm };

        if (log.exercise === 'bench') day.bench.push(entry);
        else if (log.exercise === 'squat') day.squat.push(entry);
        else if (log.exercise === 'deadlift') day.deadlift.push(entry);
        else day.assistance.push({ ...entry, name: log.exercise });
      });

      const processed = Array.from(groupedMap.values()).map(entry => {
        (['bench', 'squat', 'deadlift'] as const).forEach(key => {
          entry[key].sort((a, b) => b.weight - a.weight || b.reps - a.reps);
        });
        return entry;
      });
      setTableData(processed);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  // --- 💡 洗練されたログリスト：重複した種目名を排除 ---
  const NeonLogList = ({ sets, title, colorTheme, onEdit }: { sets: any[], title: string, colorTheme: 'red' | 'blue' | 'green' | 'orange', onEdit: any }) => {
    let prevWeight: number | null = null;
    const aggregated: any[] = [];
    
    sets.forEach((s) => {
      const last = aggregated[aggregated.length - 1];
      if (last && last.weight === s.weight && last.reps === s.reps && (!('name' in s) || last.name === s.name)) {
        last.count++;
        if (s.notes) last.allNotes = (last.allNotes || "") + " / " + s.notes;
      } else {
        aggregated.push({ ...s, count: 1, allNotes: s.notes });
      }
    });

    const themes = {
      red: "border-red-600/50 text-red-500",
      blue: "border-blue-600/50 text-blue-500",
      green: "border-lime-500/50 text-lime-400",
      orange: "border-orange-600/50 text-orange-500"
    };

    return (
      <div className="flex flex-col gap-4">
        {/* 💡 赤い方の種目名ヘッダー（これは残す） */}
        <p className={`${themes[colorTheme].split(' ')[1]} text-[10px] tracking-[0.5em] ml-2 italic`}>{title}</p>
        
        <div className="flex flex-col gap-3">
          {aggregated.map((set, idx) => {
            const isSameWeight = set.weight === prevWeight;
            prevWeight = set.weight;
            return (
              <div key={idx} className="flex flex-col gap-1">
                <button onClick={() => onEdit({id: set.id, exercise: set.name || title, weight: set.weight, reps: set.reps, notes: set.notes})}
                  className={`w-full flex items-center justify-between bg-gray-800/40 border-l-2 ${themes[colorTheme]} rounded-r-2xl px-6 py-4 active:scale-95 transition-all shadow-md`}
                >
                  <div className="flex items-center gap-6">
                    {/* 💡 ボタン内の種目名を削除し、重量と回数を主役に */}
                    <div className="flex items-center gap-4 text-xl">
                      <span className={`font-black italic ${isSameWeight ? 'opacity-20' : 'text-white'}`}>
                        {set.weight}kg
                      </span>
                      <span className={`font-black italic ${themes[colorTheme].split(' ')[1]}`}>
                        × {set.reps}
                      </span>
                    </div>
                    
                    {set.count > 1 && (
                      <span className="text-[10px] text-gray-600 font-bold bg-white/5 px-2 py-0.5 rounded">
                        [{set.count}_SETS]
                      </span>
                    )}
                    
                    {set.allNotes && (
                      <span className="text-[8px] border border-gray-700 text-gray-500 px-1.5 py-0.5 rounded italic">NOTES</span>
                    )}
                  </div>
                  
                  {set.e1rm && <span className="text-[10px] text-gray-800 font-normal">({set.e1rm})</span>}
                </button>
                {/* 💡 備考欄：中身がある時だけ表示 */}
                {set.allNotes && (
                  <p className="ml-8 text-[10px] text-gray-500 italic border-l border-gray-800 pl-4 opacity-70">
                    ≫ {set.allNotes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Excel/編集ロジックは前回同様のため省略

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 pb-24 font-black italic tracking-tighter">
      {/* 編集モーダル */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
          <div className="bg-gray-800 w-full max-w-md p-8 rounded-3xl border border-gray-700 shadow-2xl">
            <h3 className="text-xl mb-8 text-center text-blue-500 tracking-widest">EDIT_DATA</h3>
            <div className="space-y-6 mb-10">
              <input type="number" value={editingItem.weight} onChange={(e) => setEditingItem({...editingItem, weight: Number(e.target.value)})} className="w-full bg-gray-900 text-white text-center text-4xl p-5 rounded-2xl border border-gray-700 focus:border-blue-500 outline-none" />
              <input type="number" value={editingItem.reps} onChange={(e) => setEditingItem({...editingItem, reps: Number(e.target.value)})} className="w-full bg-gray-900 text-white text-center text-4xl p-5 rounded-2xl border border-gray-700 focus:border-blue-500 outline-none" />
              <textarea value={editingItem.notes || ""} onChange={(e) => setEditingItem({...editingItem, notes: e.target.value})} className="w-full bg-gray-900 text-gray-400 p-5 rounded-2xl border border-gray-700 text-sm italic" rows={3} placeholder="備考の編集..." />
            </div>
            <div className="flex gap-4">
              <button onClick={handleDelete} className="flex-1 py-4 bg-red-900/10 text-red-600 border border-red-900/40 rounded-2xl">DELETE</button>
              <button onClick={handleUpdate} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold">UPDATE</button>
            </div>
            <button onClick={() => setEditingItem(null)} className="w-full mt-6 text-gray-600 text-xs underline">Cancel</button>
          </div>
        </div>
      )}

      {/* 💡 ヘッダー：クソデカ斜体グラデーションを廃止し、洗練されたデザインに */}
      <div className="flex justify-between items-center mb-16 max-w-2xl mx-auto border-b border-gray-800 pb-6">
        <Link href="/" className="text-[10px] text-gray-700 tracking-[0.4em] hover:text-white transition-colors">← EXIT_LOGS</Link>
        <div className="text-right">
          <button onClick={() => setShowDownloadModal(true)} className="text-[9px] text-green-600 border border-green-900/30 px-2 py-0.5 rounded mb-2">XLSX_DATA</button>
          <h1 className="text-xl font-black text-gray-400 tracking-[0.2em] uppercase opacity-80">Training_Archive</h1>
        </div>
      </div>

      <div className="space-y-24 max-w-2xl mx-auto">
        {tableData.map((day) => (
          <section key={day.date}>
            <div className="flex items-center gap-6 mb-12">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-gray-800" />
              <h2 className="text-2xl font-bold text-gray-500 tracking-tighter">{day.date}</h2>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-gray-800" />
            </div>

            <div className="space-y-16">
              {day.bench.length > 0 && <NeonLogList sets={day.bench} title="BENCH_PRESS" colorTheme="red" onEdit={setEditingItem} />}
              {day.squat.length > 0 && <NeonLogList sets={day.squat} title="SQUAT" colorTheme="blue" onEdit={setEditingItem} />}
              {day.deadlift.length > 0 && <NeonLogList sets={day.deadlift} title="DEADLIFT" colorTheme="green" onEdit={setEditingItem} />}
              {day.assistance.length > 0 && <NeonLogList sets={day.assistance} title="ASSISTANCE" colorTheme="orange" onEdit={setEditingItem} />}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}