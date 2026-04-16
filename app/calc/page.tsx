"use client";

import { useEffect, useState, useRef } from "react";
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
  const isFetched = useRef(false);

  // --- 1. データ取得：重量優先ソート ---
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
          // 重量(降) > レップ(降) で並べ替え
          entry[key].sort((a, b) => b.weight - a.weight || b.reps - a.reps);
        });
        return entry;
      });
      setTableData(processed);
    }
    setLoading(false);
  };

  useEffect(() => { if (!isFetched.current) { fetchLogs(); isFetched.current = true; } }, []);

  // --- 2. 外部機能 (Excel出力、編集、削除) ---
  const executeDownload = async (filter: boolean) => { /* 既存のExcel出力ロジックをここに配置 */ };
  
  const handleDelete = async () => {
    if (!editingItem || !confirm("本当に削除しますか？")) return;
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

  // --- 3. ネオンUIコンポーネント ---
  const NeonLogList = ({ sets, colorTheme, onEdit }: { sets: any[], colorTheme: 'red' | 'blue' | 'green' | 'orange', onEdit: any }) => {
    let prevWeight: number | null = null;
    const aggregated: any[] = [];
    
    // セットの集約
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
      red: "border-red-600 text-red-500 shadow-[0_0_10px_rgba(220,38,38,0.2)]",
      blue: "border-blue-600 text-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.2)]",
      green: "border-lime-500 text-lime-400 shadow-[0_0_10px_rgba(163,230,53,0.2)]",
      orange: "border-orange-600 text-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.2)]"
    };

    return (
      <div className="flex flex-col gap-4">
        {aggregated.map((set, idx) => {
          const isSameWeight = set.weight === prevWeight;
          prevWeight = set.weight;
          return (
            <div key={idx} className="flex flex-col gap-1">
              {'name' in set && !isSameWeight && <span className="text-[10px] text-gray-600 ml-2 uppercase">{set.name}</span>}
              <button onClick={() => onEdit({id: set.id, exercise: set.name || '', weight: set.weight, reps: set.reps, notes: set.notes})}
                className={`w-full flex items-center justify-between bg-gray-800/60 border-2 ${themes[colorTheme]} rounded-2xl px-5 py-3 active:scale-95 transition-all`}
              >
                <div className="flex items-center gap-4">
                  <span className={`text-2xl font-black italic ${isSameWeight ? 'opacity-20' : ''}`}>{set.weight}kg</span>
                  <span className="text-2xl font-black italic">× {set.reps}</span>
                  {set.count > 1 && <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">{set.count}SETS</span>}
                </div>
                {set.e1rm && <span className="text-xs text-gray-700 font-normal italic">({set.e1rm})</span>}
              </button>
              {/* 💡 備考欄：中身がある時だけ表示 */}
              {set.allNotes && (
                <p className="ml-4 text-[10px] text-gray-500 italic opacity-80">≫ {set.allNotes}</p>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 pb-24 font-black italic tracking-tighter">
      {/* 編集モーダル */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-gray-800 w-full max-w-md p-6 rounded-3xl border border-gray-700 shadow-2xl">
            <h3 className="text-xl mb-6 text-center text-blue-500">EDIT_RECORD</h3>
            <div className="space-y-6 mb-8">
              <div className="flex items-center gap-4">
                <input type="number" value={editingItem.weight} onChange={(e) => setEditingItem({...editingItem, weight: Number(e.target.value)})} className="flex-1 bg-gray-900 text-white text-center text-2xl p-3 rounded-xl border border-gray-700" />
                <span className="text-xl">KG</span>
              </div>
              <div className="flex items-center gap-4">
                <input type="number" value={editingItem.reps} onChange={(e) => setEditingItem({...editingItem, reps: Number(e.target.value)})} className="flex-1 bg-gray-900 text-white text-center text-2xl p-3 rounded-xl border border-gray-700" />
                <span className="text-xl">REPS</span>
              </div>
              <textarea value={editingItem.notes || ""} onChange={(e) => setEditingItem({...editingItem, notes: e.target.value})} placeholder="備考を入力..." className="w-full bg-gray-900 text-gray-300 p-4 rounded-xl border border-gray-700 text-sm" rows={2} />
            </div>
            <div className="flex gap-4">
              <button onClick={handleDelete} className="flex-1 py-4 bg-red-900/20 text-red-500 border border-red-900/50 rounded-2xl font-bold">DELETE</button>
              <button onClick={handleUpdate} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-900/40">UPDATE</button>
            </div>
            <button onClick={() => setEditingItem(null)} className="w-full mt-4 text-gray-600 text-sm underline">Cancel</button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end mb-12 max-w-2xl mx-auto border-b border-gray-800 pb-4">
        <Link href="/" className="text-[10px] text-gray-600 hover:text-white tracking-[0.3em]">← EXIT_SYSTEM</Link>
        <div className="text-right">
          <button onClick={() => setShowDownloadModal(true)} className="text-[10px] text-green-500 border border-green-900/50 px-2 py-1 rounded">XLSX_DATA</button>
          <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-800">HISTORY</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-blue-500 animate-pulse tracking-widest text-xs">SYNCING_DATA_STREAM...</div>
      ) : (
        <div className="space-y-16 max-w-2xl mx-auto">
          {tableData.map((day) => (
            <section key={day.date} className="relative">
              <div className="flex items-center gap-4 mb-8">
                <div className="h-[1px] flex-1 bg-gray-800" />
                <h2 className="text-xl text-gray-500">{day.date}</h2>
                <div className="h-[1px] flex-1 bg-gray-800" />
              </div>

              <div className="space-y-12">
                {day.bench.length > 0 && (
                  <div>
                    <p className="text-red-600 text-[10px] mb-3 ml-2 tracking-[0.5em]">BENCH_PRESS</p>
                    <NeonLogList sets={day.bench} colorTheme="red" onEdit={setEditingItem} />
                  </div>
                )}
                {day.squat.length > 0 && (
                  <div>
                    <p className="text-blue-600 text-[10px] mb-3 ml-2 tracking-[0.5em]">SQUAT</p>
                    <NeonLogList sets={day.squat} colorTheme="blue" onEdit={setEditingItem} />
                  </div>
                )}
                {day.deadlift.length > 0 && (
                  <div>
                    <p className="text-lime-500 text-[10px] mb-3 ml-2 tracking-[0.5em]">DEADLIFT</p>
                    <NeonLogList sets={day.deadlift} colorTheme="green" onEdit={setEditingItem} />
                  </div>
                )}
                {day.assistance.length > 0 && (
                  <div>
                    <p className="text-orange-600 text-[10px] mb-3 ml-2 tracking-[0.5em]">ASSISTANCE</p>
                    <NeonLogList sets={day.assistance} colorTheme="orange" onEdit={setEditingItem} />
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}