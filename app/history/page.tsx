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
  "Face Pull", "Iso-Lateral Row", "Hack Squat", "Narrow Press", "Smith Narrow Press",
  "Smith Squat", "Smith Shoulder Press", "Smith Incline Press", "Dumbbell Preacher Curl",
  "One-hand Dumbbell Row", "One-hand Arm Curl", "Barbbell Curl", "Dumbbell Press",
  "Incline Dumbbell Press","Incline Bench Press", "Incline Dumbbell Curl", "Lying Triceps Extension",
  "Lateral Raise", "Chin-Up", "Dips", "Lat Pulldown","Seated Row","Shoulder Press", 
  "Leg Extension", "Bulgarian Squat", "Leg Curl", "Leg Press", "Romanian Deadlift",
  "Tempo Deadlift", "Tempo Bench Press", "Tempo Squat", "T-Bar Row",
  "bench", "squat", "deadlift"
];

const calculateE1RM = (weight: number, reps: number) => {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
};

export default function HistoryPage() {
  const [allLogs, setAllLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 現在のリアルタイムな年月（例: "2026/08"）
  const currentRealYearMonth = (() => {
    const now = new Date();
    return `${now.getFullYear()}/${(`00${now.getMonth() + 1}`).slice(-2)}`;
  })();

  // 表示する年月を管理するState（初期値は今月）
  const [targetYearMonth, setTargetYearMonth] = useState(currentRealYearMonth);
  
  const [editingItem, setEditingItem] = useState<{id: number, exercise: string, weight: number, reps: number, notes?: string} | null>(null);
  const [addingItem, setAddingItem] = useState<{
    date: string;
    isCustomMode: boolean;
    exercise: string;
    customExercise: string;
    weight: number;
    reps: number;
    notes: string;
    isWeightInputMode: boolean;
  } | null>(null);

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
        const exerciseLower = log.exercise ? log.exercise.toLowerCase().trim().replace(/[\s_-]+/g, '') : "";
        const currentE1RM = calculateE1RM(log.weight, log.reps);
        const setData: SetData = { id: log.id, weight: log.weight, reps: log.reps, e1rm: currentE1RM, notes: log.notes };

        if (exerciseLower.includes('bench') && !exerciseLower.includes('incline') && !exerciseLower.includes('decline') && !exerciseLower.includes('smith')) {
          dayEntry.bench.push(setData);
        } else if (exerciseLower.includes('squat') && !exerciseLower.includes('bulgarian') && !exerciseLower.includes('hack') && !exerciseLower.includes('smith')) {
          dayEntry.squat.push(setData);
        } else if (exerciseLower.includes('deadlift') && !exerciseLower.includes('romanian')) {
          dayEntry.deadlift.push(setData);
        } else {
          dayEntry.assistance.push({
            id: log.id,
            name: log.exercise,
            weight: log.weight,
            reps: log.reps,
            notes: log.notes
          });
        }
      });

      const processedData = Array.from(groupedMap.values()).reverse();
      setAllLogs(processedData);
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

  const handleAddRecord = async () => {
    if (!addingItem) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const finalName = addingItem.isCustomMode ? addingItem.customExercise.trim() : addingItem.exercise;
    if (!finalName) return;

    if (addingItem.isCustomMode && !masterExercises.includes(finalName)) {
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

  // 選択されている年月のデータだけに絞り込む
  const displayedData = allLogs.filter((day) => day.date.startsWith(targetYearMonth));

  // 前後の月を計算するためのロジック（YYYY/MM の文字列からDateオブジェクトを生成して計算）
  const [yStr, mStr] = targetYearMonth.split('/');
  const currentDateObj = new Date(Number(yStr), Number(mStr) - 1, 1);
  
  const prevDateObj = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth() - 1, 1);
  const nextDateObj = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth() + 1, 1);

  const prevYearMonth = `${prevDateObj.getFullYear()}/${(`00${prevDateObj.getMonth() + 1}`).slice(-2)}`;
  const nextYearMonth = `${nextDateObj.getFullYear()}/${(`00${nextDateObj.getMonth() + 1}`).slice(-2)}`;

  // 未来（今月より後）には行けないようにガード
  const canGoNext = nextYearMonth <= currentRealYearMonth;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredSuggestions = masterExercises.filter((ex) =>
    ex.toLowerCase().includes(addingItem?.customExercise.toLowerCase() || "")
  );

  return (
    <main className="min-h-screen bg-gray-900 text-white relative p-4 pb-28">
      
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

      {/* 過去ログ追加モーダル */}
      {addingItem && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-gray-800/95 w-full max-w-md p-6 rounded-[32px] border border-gray-700 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-center text-orange-500 italic tracking-tighter uppercase">ADD PAST RECORD</h3>
            <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-700/50">
              <p className="text-gray-500 text-[10px] mb-2 text-center font-black italic tracking-widest">DATE</p>
              <input type="date" value={addingItem.date} onChange={(e) => setAddingItem({...addingItem, date: e.target.value})} className="w-full bg-gray-900 text-white p-3 rounded-xl border border-gray-700 font-bold text-center text-sm" />
            </div>
            <div className="bg-gray-800/50 p-5 rounded-3xl border border-gray-700/50 shadow-xl relative">
              <p className="text-gray-500 text-[10px] mb-3 text-center font-black italic tracking-widest">MENU</p>
              {!addingItem.isCustomMode ? (
                <select value={addingItem.exercise} onChange={(e) => setAddingItem({...addingItem, exercise: e.target.value})} className="w-full bg-gray-900 text-white p-3 rounded-xl border border-gray-700 font-bold appearance-none text-sm">
                  {masterExercises.map(opt => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}
                </select>
              ) : (
                <div className="relative">
                  <input type="text" placeholder="EXERCISE NAME..." value={addingItem.customExercise} onChange={(e) => { setAddingItem({...addingItem, customExercise: e.target.value}); setShowSuggestions(true); }} onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 250)} className="w-full bg-gray-900 text-white p-3 rounded-xl border border-orange-500 outline-none font-bold text-sm" />
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-2 bg-gray-900 border border-gray-700 rounded-xl max-h-40 overflow-y-auto shadow-2xl">
                      {filteredSuggestions.map((suggestion) => (
                        <button key={suggestion} onMouseDown={() => { setAddingItem({...addingItem, customExercise: suggestion}); setShowSuggestions(false); }} className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-gray-800 border-b border-gray-800/50 font-bold">
                          {suggestion.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button onClick={() => setAddingItem({...addingItem, isCustomMode: !addingItem.isCustomMode})} className="text-orange-500 text-[10px] underline w-full text-center mt-3 uppercase font-black">
                {addingItem.isCustomMode ? "Select from list" : "Enter custom exercise"}
              </button>
            </div>
            <div className="bg-gray-800/80 p-6 rounded-[32px] border border-gray-700 shadow-xl relative">
              <p className="text-gray-500 text-[10px] mb-4 text-center font-black italic tracking-widest">WEIGHT (kg)</p>
              <div className="flex items-center justify-between gap-4">
                <button onClick={() => setAddingItem({...addingItem, weight: Math.max(0, addingItem.weight - 2.5)})} className="w-12 h-12 bg-gray-700 rounded-full text-xl font-black active:scale-90">-</button>
                <div className="flex-1 flex justify-center">
                  <div className="text-6xl font-black text-center text-orange-500">{addingItem.weight}</div>
                </div>
                <button onClick={() => setAddingItem({...addingItem, weight: addingItem.weight + 2.5})} className="w-12 h-12 bg-orange-600 rounded-full text-xl font-black active:scale-90">+</button>
              </div>
            </div>
            <div className="bg-gray-800/80 p-6 rounded-[32px] border border-gray-700 shadow-xl">
              <p className="text-gray-500 text-[10px] mb-4 text-center font-black italic tracking-widest">REPS</p>
              <div className="flex items-center justify-between gap-4">
                <button onClick={() => setAddingItem({...addingItem, reps: Math.max(0, addingItem.reps - 1)})} className="w-12 h-12 bg-gray-700 rounded-full text-2xl font-bold active:scale-90">-</button>
                <div className="flex-1 text-6xl font-black text-center text-amber-400">{addingItem.reps}</div>
                <button onClick={() => setAddingItem({...addingItem, reps: addingItem.reps + 1})} className="w-12 h-12 bg-amber-600 rounded-full text-2xl font-bold text-black active:scale-90">+</button>
              </div>
            </div>
            <div className="bg-gray-800/50 p-5 rounded-3xl border border-gray-700/50 shadow-xl">
              <p className="text-gray-500 text-[10px] mb-2 text-center font-black italic tracking-widest">NOTES (OPTIONAL)</p>
              <textarea value={addingItem.notes} onChange={(e) => setAddingItem({...addingItem, notes: e.target.value})} placeholder="メモを入力..." className="w-full bg-gray-900 text-white p-3 rounded-xl border border-gray-700 outline-none font-bold text-sm" rows={2} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setAddingItem(null)} className="flex-1 py-4 bg-gray-700 text-gray-300 rounded-2xl font-bold">Cancel</button>
              <button onClick={handleAddRecord} className="flex-1 py-4 bg-white text-black font-black text-lg rounded-2xl">ADD 🚀</button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-gray-400 hover:text-white text-sm">← Back</Link>
          <button 
            onClick={() => setAddingItem({ date: new Date().toISOString().slice(0, 10), isCustomMode: false, exercise: DEFAULT_EXERCISES[0], customExercise: '', weight: 60, reps: 10, notes: '', isWeightInputMode: false })}
            className="text-green-400 hover:text-green-300 text-sm font-bold flex items-center gap-1 border border-green-800 bg-green-900/30 px-3 py-1.5 rounded-lg active:scale-95 transition-all shadow-md"
          >
            + ADD PAST RECORD 📝
          </button>
        </div>

        {/* ヘッダー部分：現在の表示月と、左右の月移動ボタン（手書きイラストのイメージ） */}
        <div className="flex justify-between items-center mb-6 bg-gray-800/60 p-4 rounded-2xl border border-gray-700/60 shadow-lg">
          <button 
            onClick={() => { setTargetYearMonth(prevYearMonth); scrollToTop(); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl border border-gray-700 text-sm transition-all active:scale-95 shadow"
          >
            <span>←</span>
            <span>{prevDateObj.getMonth() + 1}月</span>
          </button>

          <h1 className="text-xl font-black text-orange-400 tracking-wider">
            {targetYearMonth.replace('/', '年')}月
          </h1>

          <button 
            onClick={() => { if (canGoNext) { setTargetYearMonth(nextYearMonth); scrollToTop(); } }}
            disabled={!canGoNext}
            className={`flex items-center gap-1.5 px-3 py-2 font-bold rounded-xl border text-sm transition-all shadow ${
              canGoNext 
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700 active:scale-95' 
                : 'bg-gray-900/40 text-gray-600 border-gray-800 cursor-not-allowed opacity-50'
            }`}
          >
            <span>{nextDateObj.getMonth() + 1}月</span>
            <span>→</span>
          </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-500 py-10">Loading...</p>
        ) : displayedData.length === 0 ? (
          <p className="text-center text-gray-500 py-10">この月の記録はありません</p>
        ) : (
          <div className="space-y-4">
            {displayedData.map((day) => (
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
                        <button key={set.id} onClick={() => setEditingItem({id: set.id, exercise: 'bench', weight: set.weight, reps: set.reps, notes: set.notes})} className="bg-gray-900 px-2 py-1 rounded text-xs border border-gray-700 hover:bg-gray-700 text-left">
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
                        <button key={set.id} onClick={() => setEditingItem({id: set.id, exercise: 'squat', weight: set.weight, reps: set.reps, notes: set.notes})} className="bg-gray-900 px-2 py-1 rounded text-xs border border-gray-700 hover:bg-gray-700 text-left">
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
                        <button key={set.id} onClick={() => setEditingItem({id: set.id, exercise: 'deadlift', weight: set.weight, reps: set.reps, notes: set.notes})} className="bg-gray-900 px-2 py-1 rounded text-xs border border-gray-700 hover:bg-gray-700 text-left">
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
                              <button key={set.id} onClick={() => setEditingItem({id: set.id, exercise: set.name, weight: set.weight, reps: set.reps, notes: set.notes})} className="bg-gray-900 px-2 py-1 rounded border border-gray-700 text-gray-300 hover:bg-gray-700 text-left">
                                <div className="text-xs text-white">{set.weight}kg × {set.reps}</div>
                                {set.notes && <div className="text-[9px] text-gray-500 italic mt-0.5 truncate">≫ {set.notes}</div>}
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

            {/* 一番下における過去月へのショートカットボタン */}
            <button 
              onClick={() => { setTargetYearMonth(prevYearMonth); scrollToTop(); }}
              className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-2xl border border-gray-700 shadow-lg text-sm transition-all mt-6"
            >
              📅 {prevDateObj.getMonth() + 1}月の記録を見る →
            </button>
          </div>
        )}
      </div>

      {/* 画面右下に常駐する「一番上に戻る」矢印ボタン */}
      <button 
        onClick={scrollToTop}
        className="fixed bottom-6 right-6 w-12 h-12 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-full shadow-2xl flex items-center justify-center text-xl active:scale-90 transition-all z-50 border border-orange-400/30"
        title="一番上へ"
      >
        ↑
      </button>
    </main>
  );
}