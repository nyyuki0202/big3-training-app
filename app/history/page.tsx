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

  // --- 1. データ取得ロジック (重量優先ソートに修正) ---
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

      // 💡 ロジック：重量(降順) > レップ(降順) でソート
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

  useEffect(() => { if (!isFetched.current) { fetchLogs(); isFetched.current = true; } }, []);

  // --- 2. 既存のExcel出力ロジック (完全移植) ---
  const executeDownload = async (filter: boolean) => {
    let targetData = tableData;
    if (filter) {
      targetData = tableData.filter(day => {
        const rowDate = day.date.replaceAll('/', '-'); 
        return rowDate >= (startDate || "0000-01-01") && rowDate <= (endDate || "9999-12-31");
      });
    }
    if (targetData.length === 0) { alert("指定された期間のデータがありません"); return; }

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

  // --- 3. 既存の編集・削除ロジック (完全移植) ---
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

  // --- 4. 新しい表示用サブコンポーネント ---
  const SmartSetList = ({ sets, colorClass, onEdit }: { sets: any[], colorClass: string, onEdit: any }) => {
    let prevWeight: number | null = null;
    const aggregated: any[] = [];
    sets.forEach((s) => {
      const last = aggregated[aggregated.length - 1];
      if (last && last.weight === s.weight && last.reps === s.reps && (last.name === s.name)) last.count++;
      else aggregated.push({ ...s, count: 1 });
    });

    return (
      <div className="flex flex-col gap-2">
        {aggregated.map((set, idx) => {
          const isSameWeight = set.weight === prevWeight;
          prevWeight = set.weight;
          return (
            <button key={idx} onClick={() => onEdit({id: set.id, exercise: set.name || '', weight: set.weight, reps: set.reps})}
              className={`flex items-center gap-3 bg-gray-900/40 p-2 rounded-lg border border-gray-800 hover:border-current transition-all ${colorClass}`}
            >
              <span className={`w-16 text-left font-black text-lg ${isSameWeight ? 'opacity-0' : 'text-white'}`}>{set.weight}kg</span>
              <span className="font-black text-lg">× {set.reps}</span>
              {set.count > 1 && <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700">{set.count} SETS</span>}
              {set.e1rm && <span className="ml-auto text-xs text-gray-600 italic">({set.e1rm})</span>}
            </button>
          );
        })}
      </div>
    );
  };

  // --- 5. レンダリング (モバイル/デスクトップ両対応) ---
  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 pb-20 font-black italic tracking-tighter">
      
      {/* Excelダウンロードモーダル */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-800 w-full max-w-sm p-6 rounded-2xl border border-gray-600 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-center border-b border-gray-700 pb-2 text-green-500">DOWNLOAD EXCEL 📊</h3>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-gray-400 block mb-1">Start</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-gray-900 text-white p-2 rounded-lg border border-gray-700" /></div>
                <div><label className="text-xs text-gray-400 block mb-1">End</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-gray-900 text-white p-2 rounded-lg border border-gray-700" /></div>
              </div>
              <button onClick={() => executeDownload(true)} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold">指定期間をDL</button>
              <button onClick={() => executeDownload(false)} className="w-full py-2 bg-gray-700 text-gray-300 rounded-xl font-bold text-sm">全期間をDL</button>
            </div>
            <button onClick={() => setShowDownloadModal(false)} className="w-full text-gray-500 text-sm underline">Cancel</button>
          </div>
        </div>
      )}

      {/* 編集モーダル */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gray-800 w-full max-w-md p-6 rounded-2xl border border-gray-600 shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-center border-b border-gray-700 pb-2 text-blue-500">EDIT RECORD ✏️</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-gray-400 block mb-1">WEIGHT (kg)</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setEditingItem({...editingItem, weight: editingItem.weight - 2.5})} className="w-12 h-12 bg-gray-700 rounded-full">-2.5</button>
                  <input type="number" value={editingItem.weight} onChange={(e) => setEditingItem({...editingItem, weight: Number(e.target.value)})} className="flex-1 bg-gray-900 text-white text-center text-2xl font-bold p-2 rounded-lg border border-gray-700" />
                  <button onClick={() => setEditingItem({...editingItem, weight: editingItem.weight + 2.5})} className="w-12 h-12 bg-blue-600 rounded-full">+2.5</button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">REPS</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setEditingItem({...editingItem, reps: Math.max(0, editingItem.reps - 1)})} className="w-12 h-12 bg-gray-700 rounded-full">-</button>
                  <input type="number" value={editingItem.reps} onChange={(e) => setEditingItem({...editingItem, reps: Number(e.target.value)})} className="flex-1 bg-gray-900 text-white text-center text-2xl font-bold p-2 rounded-lg border border-gray-700" />
                  <button onClick={() => setEditingItem({...editingItem, reps: editingItem.reps + 1})} className="w-12 h-12 bg-blue-600 rounded-full">+</button>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 py-3 bg-red-900/50 text-red-400 border border-red-800 rounded-xl font-bold">DELETE</button>
              <button onClick={handleUpdate} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">UPDATE</button>
            </div>
            <button onClick={() => setEditingItem(null)} className="w-full mt-4 text-gray-500 text-sm underline">Cancel</button>
          </div>
        </div>
      )}

      {/* メインヘッダー */}
      <div className="flex justify-between items-center mb-10 max-w-4xl mx-auto">
        <Link href="/" className="text-gray-500 hover:text-white text-xs tracking-widest">← RETURN_TO_MATRIX</Link>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowDownloadModal(true)} className="text-green-500 border border-green-900/50 bg-green-950/20 px-3 py-1 rounded-full text-xs">XLSX_EXPORT</button>
          <h1 className="text-3xl font-black italic bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-500">HISTORY</h1>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 animate-pulse text-green-500">SYNCING_DATA...</div>
      ) : (
        <div className="space-y-12 max-w-2xl mx-auto">
          {tableData.map((day) => (
            <div key={day.date} className="relative pl-6 border-l border-gray-800">
              <div className="absolute -left-[5px] top-0 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              <h2 className="text-xl mb-6 text-gray-400">{day.date}</h2>

              {day.bench.length > 0 && (
                <div className="mb-8">
                  <p className="text-red-500 text-sm mb-3 tracking-widest">BENCH_PRESS</p>
                  <SmartSetList sets={day.bench} colorClass="text-red-500" onEdit={setEditingItem} />
                </div>
              )}
              {day.squat.length > 0 && (
                <div className="mb-8">
                  <p className="text-blue-500 text-sm mb-3 tracking-widest">SQUAT</p>
                  <SmartSetList sets={day.squat} colorClass="text-blue-500" onEdit={setEditingItem} />
                </div>
              )}
              {day.deadlift.length > 0 && (
                <div className="mb-8">
                  <p className="text-lime-500 text-sm mb-3 tracking-widest">DEADLIFT</p>
                  <SmartSetList sets={day.deadlift} colorClass="text-lime-500" onEdit={setEditingItem} />
                </div>
              )}
              {day.assistance.length > 0 && (
                <div className="mb-8">
                  <p className="text-orange-500 text-sm mb-3 tracking-widest">ASSISTANCE_PLUS</p>
                  <SmartSetList sets={day.assistance} colorClass="text-orange-500" onEdit={setEditingItem} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}