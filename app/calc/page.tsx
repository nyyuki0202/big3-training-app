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

  // --- 1. データ取得：キャッシュを防ぎ最新を取るロジック ---
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
        // 💡 日本時間(JST)で正しく日付を取る
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

  // 💡 画面が表示されるたびに確実に実行
  useEffect(() => { fetchLogs(); }, []);

  // --- 2. ネオンUIコンポーネント (サイズ比率を逆転) ---
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
      <div className="flex flex-col gap-5">
        <p className={`${themes[colorTheme].split(' ')[1]} text-[10px] tracking-[0.5em] ml-2 italic`}>{title}</p>
        <div className="flex flex-col gap-3">
          {aggregated.map((set, idx) => {
            const isSameWeight = set.weight === prevWeight;
            prevWeight = set.weight;
            return (
              <div key={idx} className="flex flex-col gap-1">
                <button onClick={() => onEdit({id: set.id, exercise: set.name || title, weight: set.weight, reps: set.reps, notes: set.notes})}
                  className={`w-full flex items-center justify-between bg-gray-800/40 border-l-4 ${themes[colorTheme]} rounded-r-2xl px-5 py-3 active:scale-95 transition-all shadow-lg`}
                >
                  <div className="flex flex-col items-start gap-1">
                    {/* 💡 種目名を大きく、重量を小さく (比率逆転) */}
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black italic tracking-tighter text-white uppercase">
                        {set.name || title}
                      </span>
                      {set.allNotes && (
                        <span className="text-[9px] bg-white/10 text-gray-400 px-2 py-0.5 rounded italic">NOTES_ON</span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <span className={`font-bold ${isSameWeight ? 'opacity-20' : ''}`}>{set.weight}kg</span>
                      <span>× {set.reps}</span>
                      {set.count > 1 && <span className="text-[9px] text-gray-600 uppercase">[{set.count}_sets]</span>}
                    </div>
                  </div>
                  
                  {set.e1rm && <span className="text-[10px] text-gray-700 font-normal">({set.e1rm})</span>}
                </button>
                {set.allNotes && (
                  <p className="ml-6 text-[10px] text-gray-500 italic border-l border-gray-800 pl-3">≫ {set.allNotes}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- Excel出力、編集、削除（既存ロジック） ---
  const executeDownload = async (filter: boolean) => { /* ...Excel出力... */ };
  const handleDelete = async () => { /* ...削除... */ };
  const handleUpdate = async () => { /* ...更新... */ };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 pb-24 font-black italic tracking-tighter">
      {/* 編集モーダル */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-800 w-full max-w-md p-6 rounded-3xl border border-gray-700 shadow-2xl">
            <h3 className="text-xl mb-6 text-center text-blue-500">EDIT_ARCHIVE</h3>
            <div className="space-y-6 mb-8">
              <input type="number" value={editingItem.weight} onChange={(e) => setEditingItem({...editingItem, weight: Number(e.target.value)})} className="w-full bg-gray-900 text-white text-center text-3xl p-4 rounded-2xl border border-gray-700" />
              <input type="number" value={editingItem.reps} onChange={(e) => setEditingItem({...editingItem, reps: Number(e.target.value)})} className="w-full bg-gray-900 text-white text-center text-3xl p-4 rounded-2xl border border-gray-700" />
              <textarea value={editingItem.notes || ""} onChange={(e) => setEditingItem({...editingItem, notes: e.target.value})} className="w-full bg-gray-900 text-gray-400 p-4 rounded-2xl border border-gray-700 text-sm" rows={3} />
            </div>
            <div className="flex gap-4">
              <button onClick={handleDelete} className="flex-1 py-4 bg-red-900/20 text-red-500 border border-red-900/50 rounded-2xl">DELETE</button>
              <button onClick={handleUpdate} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl">UPDATE</button>
            </div>
            <button onClick={() => setEditingItem(null)} className="w-full mt-4 text-gray-600 text-xs underline">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end mb-16 max-w-2xl mx-auto border-b border-gray-800 pb-4">
        <Link href="/" className="text-[10px] text-gray-600 tracking-[0.3em]">← EXIT_SYSTEM</Link>
        <div className="text-right">
          <button onClick={() => setShowDownloadModal(true)} className="text-[10px] text-green-500 border border-green-900/50 px-2 py-1 rounded">XLSX_DATA</button>
          <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-800">HISTORY</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-blue-500 animate-pulse text-xs tracking-widest">FETCHING_LATEST_RECORDS...</div>
      ) : (
        <div className="space-y-20 max-w-2xl mx-auto">
          {tableData.map((day) => (
            <section key={day.date}>
              <div className="flex items-center gap-4 mb-10">
                <div className="h-[1px] flex-1 bg-gray-800" />
                <h2 className="text-2xl text-gray-400">{day.date}</h2>
                <div className="h-[1px] flex-1 bg-gray-800" />
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
      )}
    </main>
  );
}