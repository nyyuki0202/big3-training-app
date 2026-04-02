"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// --- 型定義 ---
type SetData = { id: number; weight: number; reps: number; e1rm: number; };
type OtherData = { id: number; name: string; weight: number; reps: number; };
type DailyLog = { date: string; bench: SetData[]; squat: SetData[]; deadlift: SetData[]; assistance: OtherData[]; };

const calculateE1RM = (weight: number, reps: number) => {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
};

export default function HistoryPage() {
  const router = useRouter();
  const [tableData, setTableData] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<{id: number, exercise: string, weight: number, reps: number} | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const isFetched = useRef(false);

  // --- 1. データ取得：重量優先ソート ---
  const fetchLogs = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { 
      router.push("/login"); 
      return; 
    }

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

        if (log.exercise === 'bench') day.bench.push({ id: log.id, weight: log.weight, reps: log.reps, e1rm });
        else if (log.exercise === 'squat') day.squat.push({ id: log.id, weight: log.weight, reps: log.reps, e1rm });
        else if (log.exercise === 'deadlift') day.deadlift.push({ id: log.id, weight: log.weight, reps: log.reps, e1rm });
        else day.assistance.push({ id: log.id, name: log.exercise, weight: log.weight, reps: log.reps });
      });

      const processed = Array.from(groupedMap.values()).map(entry => {
        (['bench', 'squat', 'deadlift'] as const).forEach(key => {
          // 重量(降) > レップ(降) でソート
          entry[key].sort((a, b) => b.weight - a.weight || b.reps - a.reps);
        });
        return entry;
      });
      setTableData(processed);
    }
    setLoading(false);
  };

  useEffect(() => { if (!isFetched.current) { fetchLogs(); isFetched.current = true; } }, []);

  // --- 2. Excel出力ロジック (完全版) ---
  const executeDownload = async (filter: boolean) => {
    let targetData = tableData;
    if (filter) {
      targetData = tableData.filter(day => {
        const rowDate = day.date.replaceAll('/', '-'); 
        return rowDate >= (startDate || "0000-01-01") && rowDate <= (endDate || "9999-12-31");
      });
    }
    if (targetData.length === 0) { alert("指定期間のデータがありません"); return; }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Workout Log');
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'BENCH PRESS', key: 'bench', width: 22 },
      { header: 'PV', key: 'bench_pv', width: 6 },
      { header: 'SQUAT', key: 'squat', width: 22 },
      { header: 'PV', key: 'squat_pv', width: 6 },
      { header: 'DEADLIFT', key: 'deadlift', width: 22 },
      { header: 'PV', key: 'deadlift_pv', width: 6 },
      { header: 'assistance (Memo)', key: 'assistance', width: 45 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    for (let i = 1; i <= 8; i++) {
      const cell = worksheet.getCell(1, i);
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    let currentRowIdx = 2; 
    targetData.forEach((day) => {
      const startRow = currentRowIdx;
      for (let i = 0; i < 3; i++) worksheet.addRow(['', '', '', '', '', '', '', '']);

      const dateCell = worksheet.getCell(`A${startRow}`);
      dateCell.value = day.date;
      const assistanceCell = worksheet.getCell(`H${startRow}`);
      assistanceCell.value = day.assistance.length > 0 ? day.assistance.map(o => `${o.name}: ${o.weight}kg x ${o.reps}`).join('\n') : "-";

      const exercises = [
        { key: 'bench', colLetter: 'B', pvCol: 'C' },
        { key: 'squat', colLetter: 'D', pvCol: 'E' },
        { key: 'deadlift', colLetter: 'F', pvCol: 'G' }
      ] as const;

      exercises.forEach(({ key, colLetter, pvCol }) => {
        const sets = day[key];
        for (let i = 0; i < 3; i++) {
          const rowNum = startRow + i;
          const mainCell = worksheet.getCell(`${colLetter}${rowNum}`);
          const pvCell = worksheet.getCell(`${pvCol}${rowNum}`);
          if (sets[i]) {
            mainCell.value = `${sets[i].weight} kg  ${sets[i].reps} rep`;
            pvCell.value = sets[i].e1rm;
            pvCell.font = { bold: true };
          } else {
            mainCell.value = "-"; pvCell.value = "-";
            mainCell.font = { color: { argb: 'FFAAAAAA' } };
            pvCell.font = { color: { argb: 'FFAAAAAA' } };
          }
          mainCell.alignment = { vertical: 'middle', horizontal: 'center' };
          pvCell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });

      worksheet.mergeCells(`A${startRow}:A${startRow + 2}`);
      dateCell.alignment = { vertical: 'top', horizontal: 'center', wrapText: true };
      dateCell.font = { bold: true };
      worksheet.mergeCells(`H${startRow}:H${startRow + 2}`);
      assistanceCell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
      currentRowIdx += 3;
    });

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `workout_log_${filter ? 'range' : 'all'}_${new Date().toISOString().slice(0,10)}.xlsx`);
    setShowDownloadModal(false);
  };

  // --- 3. 編集・削除ロジック ---
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

  // --- 4. ネオンUI維持・スマート表示コンポーネント ---
  const NeonSetList = ({ sets, colorTheme, onEdit }: { sets: any[], colorTheme: 'red' | 'blue' | 'green' | 'orange', onEdit: any }) => {
    let prevWeight: number | null = null;
    const aggregated: any[] = [];
    sets.forEach((s) => {
      const last = aggregated[aggregated.length - 1];
      // 重量・レップ・(補助種目の場合は名前)が同じなら集約
      if (last && last.weight === s.weight && last.reps === s.reps && (!('name' in s) || last.name === s.name)) last.count++;
      else aggregated.push({ ...s, count: 1 });
    });

    const theme = {
      red: "border-red-600 text-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]",
      blue: "border-blue-600 text-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.3)]",
      green: "border-lime-500 text-lime-400 shadow-[0_0_15px_rgba(163,230,53,0.3)]",
      orange: "border-orange-600 text-orange-500 shadow-[0_0_15px_rgba(234,88,12,0.3)]"
    };

    return (
      <div className="flex flex-col gap-4">
        {aggregated.map((set, idx) => {
          const isSameWeight = set.weight === prevWeight;
          prevWeight = set.weight;
          return (
            <div key={idx} className="flex flex-col gap-1">
              {/* 💡 補助種目名の復元 */}
              {'name' in set && !isSameWeight && (
                <span className="text-[10px] text-gray-500 ml-3 uppercase font-black tracking-widest">{set.name}</span>
              )}
              
              <button onClick={() => onEdit({id: set.id, exercise: set.name || '', weight: set.weight, reps: set.reps})}
                className={`w-full flex items-center justify-between bg-gray-800/60 border-2 ${theme[colorTheme]} rounded-2xl px-6 py-4 active:scale-95 transition-all group`}
              >
                <div className="flex items-center gap-5">
                  {/* 💡 重量省略：前回と同じなら透明度を下げる */}
                  <span className={`text-2xl font-black italic ${isSameWeight ? 'opacity-20' : 'opacity-100'}`}>
                    {set.weight}<span className="text-xs ml-1">KG</span>
                  </span>
                  <span className="text-2xl font-black italic">× {set.reps}</span>
                  {set.count > 1 && (
                    <span className="text-[10px] bg-white/10 px-3 py-1 rounded-full font-black">
                      {set.count} SETS
                    </span>
                  )}
                </div>
                {set.e1rm && <span className="text-xs text-gray-600 font-normal italic">({set.e1rm})</span>}
              </button>
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
          <div className="bg-gray-800 w-full max-w-md p-8 rounded-[40px] border-2 border-blue-600 shadow-[0_0_30px_rgba(37,99,235,0.3)]">
            <h3 className="text-2xl font-black mb-8 text-center text-blue-500 italic tracking-widest">EDIT_DATA</h3>
            <div className="space-y-8 mb-10">
              <div>
                <label className="text-[10px] text-gray-500 block mb-2 ml-4 tracking-widest">WEIGHT_KG</label>
                <div className="flex items-center gap-4">
                  <button onClick={() => setEditingItem({...editingItem, weight: editingItem.weight - 2.5})} className="w-14 h-14 bg-gray-700 rounded-full font-black text-xl hover:bg-gray-600 transition-colors">-</button>
                  <input type="number" value={editingItem.weight} onChange={(e) => setEditingItem({...editingItem, weight: Number(e.target.value)})} className="flex-1 bg-gray-900 text-white text-center text-3xl font-black p-4 rounded-3xl border border-gray-700 focus:border-blue-500 focus:outline-none" />
                  <button onClick={() => setEditingItem({...editingItem, weight: editingItem.weight + 2.5})} className="w-14 h-14 bg-blue-600 rounded-full font-black text-xl hover:bg-blue-500 transition-colors">+</button>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-2 ml-4 tracking-widest">REPS_COUNT</label>
                <div className="flex items-center gap-4">
                  <button onClick={() => setEditingItem({...editingItem, reps: Math.max(0, editingItem.reps - 1)})} className="w-14 h-14 bg-gray-700 rounded-full font-black text-xl hover:bg-gray-600">-</button>
                  <input type="number" value={editingItem.reps} onChange={(e) => setEditingItem({...editingItem, reps: Number(e.target.value)})} className="flex-1 bg-gray-900 text-white text-center text-3xl font-black p-4 rounded-3xl border border-gray-700 focus:border-blue-500 focus:outline-none" />
                  <button onClick={() => setEditingItem({...editingItem, reps: editingItem.reps + 1})} className="w-14 h-14 bg-blue-600 rounded-full font-black text-xl hover:bg-blue-500">+</button>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={handleDelete} className="flex-1 py-4 bg-red-900/20 text-red-500 border border-red-900/50 rounded-3xl font-black tracking-widest hover:bg-red-600 hover:text-white transition-all">DELETE</button>
              <button onClick={handleUpdate} className="flex-1 py-4 bg-blue-600 text-white rounded-3xl font-black tracking-widest shadow-lg shadow-blue-900/40 hover:scale-105 transition-all">UPDATE</button>
            </div>
            <button onClick={() => setEditingItem(null)} className="w-full mt-6 text-gray-600 text-xs tracking-[0.3em] uppercase hover:text-white transition-colors">Cancel_process</button>
          </div>
        </div>
      )}

      {/* ダウンロードモーダル */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-gray-800 w-full max-w-sm p-8 rounded-[40px] border-2 border-green-600 shadow-[0_0_30px_rgba(22,163,74,0.3)]">
            <h3 className="text-2xl font-black mb-6 text-center text-green-500 italic">XLSX_EXPORT</h3>
            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[8px] text-gray-500 mb-1 ml-2">START_DATE</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-gray-900 text-white p-3 rounded-2xl border border-gray-700 text-xs" /></div>
                <div><label className="text-[8px] text-gray-500 mb-1 ml-2">END_DATE</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-gray-900 text-white p-3 rounded-2xl border border-gray-700 text-xs" /></div>
              </div>
              <button onClick={() => executeDownload(true)} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black tracking-widest">EXPORT_RANGE</button>
              <button onClick={() => executeDownload(false)} className="w-full py-3 bg-gray-700 text-gray-400 rounded-2xl font-black text-[10px] tracking-widest">EXPORT_ALL_DATA</button>
            </div>
            <button onClick={() => setShowDownloadModal(false)} className="w-full text-gray-600 text-[10px] tracking-widest uppercase">Close</button>
          </div>
        </div>
      )}

      {/* メインヘッダー */}
      <header className="flex justify-between items-end mb-16 max-w-2xl mx-auto border-b-2 border-gray-800 pb-6">
        <Link href="/" className="text-[10px] text-gray-600 hover:text-white tracking-[0.4em] transition-colors">← EXIT_SYSTEM</Link>
        <div className="text-right">
          <button onClick={() => setShowDownloadModal(true)} className="text-[10px] text-green-500 mb-2 border-2 border-green-900/50 px-3 py-1 rounded-full font-black bg-green-950/20 hover:bg-green-600 hover:text-white transition-all">DATA_LINK</button>
          <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-800 leading-none tracking-tighter italic">HISTORY</h1>
        </div>
      </header>

      {/* 履歴リスト */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 animate-pulse">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-blue-500 text-xs font-black tracking-[0.5em]">BOOTING_LOG_SYSTEM...</p>
        </div>
      ) : (
        <div className="space-y-24 max-w-2xl mx-auto">
          {tableData.map((day) => (
            <section key={day.date} className="relative">
              <div className="flex items-center gap-6 mb-12">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-gray-800" />
                <h2 className="text-2xl text-gray-500 tracking-[0.3em] font-black italic">{day.date}</h2>
                <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-gray-800" />
              </div>

              <div className="space-y-12">
                {day.bench.length > 0 && (
                  <div>
                    <p className="text-red-600 text-[10px] mb-4 ml-4 tracking-[0.6em] font-black">BENCH_PRESS</p>
                    <NeonSetList sets={day.bench} colorTheme="red" onEdit={setEditingItem} />
                  </div>
                )}
                {day.squat.length > 0 && (
                  <div>
                    <p className="text-blue-600 text-[10px] mb-4 ml-4 tracking-[0.6em] font-black">SQUAT_LOG</p>
                    <NeonSetList sets={day.squat} colorTheme="blue" onEdit={setEditingItem} />
                  </div>
                )}
                {day.deadlift.length > 0 && (
                  <div>
                    <p className="text-lime-500 text-[10px] mb-4 ml-4 tracking-[0.6em] font-black">DEADLIFT_LOG</p>
                    <NeonSetList sets={day.deadlift} colorTheme="green" onEdit={setEditingItem} />
                  </div>
                )}
                {day.assistance.length > 0 && (
                  <div>
                    <p className="text-orange-600 text-[10px] mb-4 ml-4 tracking-[0.6em] font-black">ASSISTANCE_PLUS</p>
                    <NeonSetList sets={day.assistance} colorTheme="orange" onEdit={setEditingItem} />
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