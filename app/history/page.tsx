"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type SetData = {
  id: number;
  weight: number;
  reps: number;
  e1rm: number;
  notes?: string;
};

type OtherData = {
  id: number;
  name: string;
  weight: number;
  reps: number;
  notes?: string;
};

type DailyLog = {
  date: string;
  bench: SetData[];
  squat: SetData[];
  deadlift: SetData[];
  assistance: OtherData[];
};

const DEFAULT_EXERCISES = [
  "Bench Press", "Squat", "Deadlift",
  "Bulgarian Squat", "Cable Crossover", "Dumbbell Fly", "Dumbbell Row",
  "Incline Dumbbell Press", "Lat Pulldown", "Leg Curl", "Leg Extension",
  "Leg Press", "Romanian Deadlift", "Seated Row", "Side Lateral Raise"
];

const calculateE1RM = (weight: number, reps: number) => {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
};

export default function HistoryPage() {
  const [tableData, setTableData] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingItem, setEditingItem] = useState<{id: number, exercise: string, weight: number, reps: number, notes?: string} | null>(null);
  
  // 💡 過去ログ追加モーダル用のステート（日付＋アシスタンス等でお馴染みの入力項目）
  const [addingItem, setAddingItem] = useState<{
    date: string;
    exercise: string;
    isCustom: boolean;
    weight: number;
    reps: number;
    notes: string;
    isWeightInputMode: boolean;
  } | null>(null);

  // サジェスト用のマスターリスト
  const [masterExercises, setMasterExercises] = useState<string[]>(DEFAULT_EXERCISES);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const isFetched = useRef(false);

  const fetchLogs = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const groupedMap = new Map<string, DailyLog>();

      data.forEach((log) => {
        const dateObj = new Date(log.created_at);
        const y = dateObj.getFullYear();
        const m = (`00${dateObj.getMonth()+1}`).slice(-2);
        const d = (`00${dateObj.getDate()}`).slice(-2);
        const dateStr = `${y}/${m}/${d}`;
        
        if (!groupedMap.has(dateStr)) {
          groupedMap.set(dateStr, { date: dateStr, bench: [], squat: [], deadlift: [], assistance: [] });
        }

        const dayEntry = groupedMap.get(dateStr)!;
        const exercise = log.exercise;
        const currentE1RM = calculateE1RM(log.weight, log.reps);
        const setData: SetData = { id: log.id, weight: log.weight, reps: log.reps, e1rm: currentE1RM, notes: log.notes };

        if (exercise === 'bench') dayEntry.bench.push(setData);
        else if (exercise === 'squat') dayEntry.squat.push(setData);
        else if (exercise === 'deadlift') dayEntry.deadlift.push(setData);
        else dayEntry.assistance.push({ id: log.id, name: exercise, weight: log.weight, reps: log.reps, notes: log.notes });
      });

      const processedData = Array.from(groupedMap.values());
      setTableData(processedData.reverse());
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!isFetched.current) {
      const fetchCustom = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data } = await supabase.from("favorite_exercises").select("name").eq("user_id", session.user.id);
        if (data) {
          const customNames = data.map((item) => item.name);
          const merged = Array.from(new Set([...DEFAULT_EXERCISES, ...customNames])).sort((a, b) => a.localeCompare(b));
          setMasterExercises(merged);
        }
      };
      fetchCustom();
      fetchLogs();
      isFetched.current = true;
    }
  }, []);

  const handleDelete = async () => {
    if (!editingItem) return;
    if (!confirm("本当にこの記録を削除しますか？")) return;
    const { error } = await supabase.from('workouts').delete().eq('id', editingItem.id);
    if (!error) { setEditingItem(null); fetchLogs(); }
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    const { error } = await supabase.from('workouts').update({ weight: editingItem.weight, reps: editingItem.reps, notes: editingItem.notes }).eq('id', editingItem.id);
    if (!error) { setEditingItem(null); fetchLogs(); }
  };

  // 過去ログ追加の実行
  const handleAddRecord = async () => {
    if (!addingItem) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const finalName = addingItem.exercise.trim();
    if (!finalName) return;

    // 新規カスタム種目ならマスターへ追加
    if (!masterExercises.includes(finalName)) {
      await supabase.from("favorite_exercises").insert([{ user_id: session.user.id, name: finalName }]);
    }

    const targetDateObj = new Date(`${addingItem.date}T12:00:00`);

    const { error } = await supabase.from('workouts').insert([{
      user_id: session.user.id,
      exercise: finalName,
      weight: addingItem.weight,
      reps: addingItem.reps,
      notes: addingItem.notes.trim() || null,
      created_at: targetDateObj.toISOString()
    }]);

    if (!error) {
      setAddingItem(null);
      fetchLogs();
    } else {
      alert("追加に失敗しました...");
    }
  };

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${(`00${d.getMonth()+1}`).slice(-2)}-{d.getDate().toString().padStart(2, '0')}`;
  };

  const filteredSuggestions = masterExercises.filter((ex) =>
    ex.toLowerCase().includes(addingItem?.exercise.toLowerCase() || "")
  );

  return (
    <main className="min-h-screen bg-gray-900 text-white relative p-4 pb-20">
      
      {/* 編集モーダル */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-800 w-full max-w-md p-6 rounded-2xl border border-gray-600 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-center border-b border-gray-700 pb-2">EDIT RECORD ✏️</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-gray-400 block mb-1">WEIGHT (kg)</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setEditingItem({...editingItem, weight: editingItem.weight - 2.5})} className="w-12 h-12 shrink-0 bg-gray-700 rounded-full font-bold">-2.5</button>
                  <input type="number" step="0.25" value={editingItem.weight} onChange={(e) => setEditingItem({...editingItem, weight: Number(e.target.value)})} className="flex-1 min-w-0 bg-gray-900 text-white text-center text-2xl font-bold p-2 rounded-lg border border-gray-700" />
                  <button onClick={() => setEditingItem({...editingItem, weight: editingItem.weight + 2.5})} className="w-12 h-12 shrink-0 bg-blue-600 rounded-full font-bold">+2.5</button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">REPS</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setEditingItem({...editingItem, reps: Math.max(0, editingItem.reps - 1)})} className="w-12 h-12 shrink-0 bg-gray-700 rounded-full font-bold">-</button>
                  <input type="number" value={editingItem.reps} onChange={(e) => setEditingItem({...editingItem, reps: Number(e.target.value)})} className="flex-1 min-w-0 bg-gray-900 text-white text-center text-2xl font-bold p-2 rounded-lg border border-gray-700" />
                  <button onClick={() => setEditingItem({...editingItem, reps: editingItem.reps + 1})} className="w-12 h-12 shrink-0 bg-blue-600 rounded-full font-bold">+</button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">NOTES</label>
                <textarea value={editingItem.notes || ""} onChange={(e) => setEditingItem({...editingItem, notes: e.target.value})} className="w-full bg-gray-900 text-white p-3 rounded-lg border border-gray-700 text-sm" rows={2} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 py-3 bg-red-900/50 text-red-400 border border-red-800 rounded-xl font-bold">DELETE 🗑️</button>
              <button onClick={handleUpdate} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">UPDATE 💾</button>
            </div>
            <button onClick={() => setEditingItem(null)} className="w-full mt-4 text-gray-500 text-sm underline">Cancel</button>
          </div>
        </div>
      )}

      {/* 💡 過去ログ追加モーダル（アシスタンスのUIを完全融合） */}
      {addingItem && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-gray-800 w-full max-w-md p-6 rounded-3xl border border-gray-700 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            <h3 className="text-xl font-black text-center text-orange-500 uppercase tracking-widest">ADD PAST RECORD</h3>
            
            {/* 日付選択 */}
            <div>
              <label className="text-[10px] text-gray-500 block mb-1 font-black uppercase tracking-widest">DATE</label>
              <input 
                type="date" 
                value={addingItem.date} 
                onChange={(e) => setAddingItem({...addingItem, date: e.target.value})} 
                className="w-full bg-gray-900 text-white p-3 rounded-xl border border-gray-700 font-bold text-center" 
              />
            </div>

            {/* 種目選択 ＆ サジェスト */}
            <div className="relative">
              <label className="text-[10px] text-gray-500 block mb-1 font-black uppercase tracking-widest">EXERCISE</label>
              <input
                type="text"
                value={addingItem.exercise}
                onChange={(e) => { setAddingItem({...addingItem, exercise: e.target.value}); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                placeholder="種目を入力..."
                className="w-full bg-gray-900 text-white p-3 rounded-xl border border-orange-500 outline-none font-bold text-sm"
              />
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl max-h-40 overflow-y-auto shadow-2xl">
                  {filteredSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onMouseDown={() => { setAddingItem({...addingItem, exercise: suggestion}); setShowSuggestions(false); }}
                      className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-gray-800 border-b border-gray-800/50 font-bold"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* WEIGHT 巨大ネオンカード */}
            <div className="bg-gray-900/60 p-6 rounded-3xl border border-gray-700 text-center">
              <p className="text-gray-500 text-[10px] mb-4 font-black tracking-widest">WEIGHT (kg)</p>
              <div className="flex items-center justify-between gap-4">
                <button onClick={() => setAddingItem({...addingItem, weight: Math.max(0, addingItem.weight - 2.5)})} className="w-12 h-12 bg-gray-800 rounded-full font-black text-xl active:scale-90">-</button>
                <div className="flex-1 flex justify-center">
                  <input type="number" step="0.25" value={addingItem.weight} onChange={(e) => setAddingItem({...addingItem, weight: Number(e.target.value)})} className="w-32 bg-transparent text-5xl font-black text-center text-orange-500 outline-none" />
                </div>
                <button onClick={() => setAddingItem({...addingItem, weight: addingItem.weight + 2.5})} className="w-12 h-12 bg-orange-600 rounded-full font-black text-xl active:scale-90">+</button>
              </div>
            </div>

            {/* REPS 巨大ネオンカード */}
            <div className="bg-gray-900/60 p-6 rounded-3xl border border-gray-700 text-center">
              <p className="text-gray-500 text-[10px] mb-4 font-black tracking-widest">REPS</p>
              <div className="flex items-center justify-between gap-4">
                <button onClick={() => setAddingItem({...addingItem, reps: Math.max(0, addingItem.reps - 1)})} className="w-12 h-12 bg-gray-800 rounded-full font-black text-xl active:scale-90">-</button>
                <div className="flex-1 flex justify-center">
                  <input type="number" value={addingItem.reps} onChange={(e) => setAddingItem({...addingItem, reps: Number(e.target.value)})} className="w-32 bg-transparent text-5xl font-black text-center text-amber-400 outline-none" />
                </div>
                <button onClick={() => setAddingItem({...addingItem, reps: addingItem.reps + 1})} className="w-12 h-12 bg-amber-600 rounded-full font-black text-xl active:scale-90 text-black">+</button>
              </div>
            </div>

            {/* NOTES */}
            <div>
              <label className="text-[10px] text-gray-500 block mb-1 font-black uppercase tracking-widest">NOTES</label>
              <textarea value={addingItem.notes} onChange={(e) => setAddingItem({...addingItem, notes: e.target.value})} className="w-full bg-gray-900 text-white p-3 rounded-xl border border-gray-700 text-sm italic" rows={2} placeholder="メモ..." />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setAddingItem(null)} className="flex-1 py-4 bg-gray-700 text-gray-300 rounded-2xl font-bold">Cancel</button>
              <button onClick={handleAddRecord} className="flex-1 py-4 bg-white text-gray-900 rounded-2xl font-black shadow-xl">ADD 🚀</button>
            </div>
          </div>
        </div>
      )}

      {/* メイン画面 */}
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">← Back</Link>
          <button 
            onClick={() => setAddingItem({ date: getTodayStr(), exercise: 'Bench Press', isCustom: false, weight: 60, reps: 10, notes: '', isWeightInputMode: false })}
            className="text-green-400 hover:text-green-300 text-sm font-bold flex items-center gap-1 border border-green-800 bg-green-900/30 px-3 py-1.5 rounded-lg active:scale-95 transition-all shadow-md"
          >
            + ADD PAST RECORD 📝
          </button>
        </div>

        <h1 className="text-2xl font-bold mb-6">HISTORY</h1>

        {loading ? (
          <p className="text-center text-gray-500 py-10">Loading...</p>
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
                        <button key={set.id} onClick={() => setEditingItem({id: set.id, exercise: 'bench', weight: set.weight, reps: set.reps, notes: set.notes})} className="bg-gray-900 px-2 py-1 rounded text-xs border border-gray-700 hover:bg-gray-700 hover:border-red-500 text-left">
                          <div>{set.weight}kg × {set.reps} <span className="text-gray-500">({set.e1rm})</span></div>
                          {set.notes && <div className="text-[10px] text-gray-400 italic mt-0.5 line-clamp-1">≫ {set.notes}</div>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {day.squat.length > 0 && (
                  <div className="mb-3">
                    <p className="text-blue-400 font-bold text-sm mb-1">SQUAT</p>
                    <div className="flex flex-wrap gap-2">
                      {day.squat.map((set) => (
                        <button key={set.id} onClick={() => setEditingItem({id: set.id, exercise: 'squat', weight: set.weight, reps: set.reps, notes: set.notes})} className="bg-gray-900 px-2 py-1 rounded text-xs border border-gray-700 hover:bg-gray-700 hover:border-blue-500 text-left">
                          <div>{set.weight}kg × {set.reps} <span className="text-gray-500">({set.e1rm})</span></div>
                          {set.notes && <div className="text-[10px] text-gray-400 italic mt-0.5 line-clamp-1">≫ {set.notes}</div>}
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
                        <button key={set.id} onClick={() => setEditingItem({id: set.id, exercise: 'deadlift', weight: set.weight, reps: set.reps, notes: set.notes})} className="bg-gray-900 px-2 py-1 rounded text-xs border border-gray-700 hover:bg-gray-700 hover:border-green-500 text-left">
                          <div>{set.weight}kg × {set.reps} <span className="text-gray-500">({set.e1rm})</span></div>
                          {set.notes && <div className="text-[10px] text-gray-400 italic mt-0.5 line-clamp-1">≫ {set.notes}</div>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {day.assistance.length > 0 && (
                  <div>
                    <p className="text-yellow-400 font-bold text-sm mb-2 uppercase tracking-widest">assistance</p>
                    <div className="space-y-4">
                      {Object.entries(
                        day.assistance.reduce((acc, set) => {
                          if (!acc[set.name]) acc[set.name] = [];
                          acc[set.name].push(set);
                          return acc;
                        }, {} as Record<string, OtherData[]>)
                      ).map(([exerciseName, sets]) => (
                        <div key={exerciseName} className="flex flex-col gap-1.5">
                          <p className="text-[14px] text-gray-300 ml-1 font-bold uppercase tracking-tighter">{exerciseName}</p>
                          <div className="flex flex-wrap gap-2">
                            {sets.map((set) => (
                              <button
                                key={set.id}
                                onClick={() => setEditingItem({id: set.id, exercise: set.name, weight: set.weight, reps: set.reps, notes: set.notes})}
                                className="bg-gray-900 px-2 py-1 rounded border border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-yellow-500 text-left transition-all active:scale-95"
                              >
                                <div className="text-xs text-white">{set.weight}kg × {set.reps}</div>
                                {set.notes && <div className="text-[9px] text-gray-500 italic mt-0.5 max-w-[80px] truncate">≫ {set.notes}</div>}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}