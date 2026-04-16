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

        const entry = { id: log.id, weight: log.weight, reps: log.reps, notes: log.notes, e1rm };

        if (log.exercise === 'bench') day.bench.push(entry);
        else if (log.exercise === 'squat') day.squat.push(entry);
        else if (log.exercise === 'deadlift') day.deadlift.push(entry);
        else day.assistance.push({ ...entry, name: log.exercise });
      });

      // 💡 ロジック修正：重量(降順) > レップ(降順) でソート
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

  // --- 2. 既存のロジック (Excel, 編集, 削除) ---
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

  const handleDelete = async () => {
    if (!editingItem) return;
    if (!confirm("本当にこの記録を削除しますか？")) return;
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

  // --- 3. 旧デザインを復元したリストコンポーネント (集約・備考追加) ---
  const OldMatrixNeonList = ({ sets, title, colorTheme, onEdit }: { sets: any[], title: string, colorTheme: 'red' | 'blue' | 'green' | 'yellow', onEdit: any }) => {
    let prevWeight: number | null = null;
    const aggregated: any[] = [];
    
    // 同一セットの集約ロジック
    sets.forEach((s) => {
      const last = aggregated[aggregated.length - 1];
      if (last && last.weight === s.weight && last.reps === s.reps && (!('name' in s) || last.name === s.name)) {
        last.count++;
        // 💡 備考を集約
        if (s.notes) {
          last.allNotes = (last.allNotes || "") + " / " + s.notes;
        }
      } else {
        aggregated.push({ ...s, count: 1, allNotes: s.notes });
      }
    });

    const themes = {
      red: "border-red-600/50 text-red-500 shadow-[0_0_10px_rgba(220,38,38,0.2)]",
      blue: "border-blue-600/50 text-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.2)]",
      green: "border-green-600/50 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.2)]",
      yellow: "border-yellow-600/50 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.2)]"
    };

    return (
      <div className="flex flex-col gap-5">
        {/* 💡 旧種目ヘッダー復元 */}
        <p className={`text-lg font-black uppercase ${themes[colorTheme].split(' ')[1]}`}>{title}</p>
        
        {/* 💡 記録ボタンリスト。旧デザインと同じく横並び */}
        <div className="flex flex-wrap gap-2">
          {aggregated.map((set, idx) => {
            const isSameWeight = set.weight === prevWeight;
            prevWeight = set.weight;
            
            return (
              <button key={idx} onClick={() => onEdit({id: set.id, exercise: set.name || title, weight: set.weight, reps: set.reps, notes: set.notes})}
                className={`bg-gray-800 border-2 ${themes[colorTheme]} rounded-xl active:scale-95 transition-all shadow-md`}
              >
                {/* BIG3とアシスタンスでスタイルを分ける */}
                {title === "assistance" ? (
                  // 💡 アシスタンス用スタイル (2行構成)
                  <div className="px-4 py-2 flex flex-col gap-1 items-start">
                    <span className="text-sm font-black italic text-gray-100">{set.name} :</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black italic text-white">{set.weight}kg x {set.reps}</span>
                      {set.count > 1 && <span className="text-[9px] text-gray-500">({set.count} set)</span>}
                    </div>
                    {/* 💡 備考がある時だけ表示 */}
                    {set.allNotes && (
                      <p className="text-[9px] text-gray-500 italic border-l border-gray-700 pl-2">≫ {set.allNotes}</p>
                    )}
                  </div>
                ) : (
                  // 💡 BIG3用スタイル (1行構成)
                  <div className="px-3 py-2 flex flex-col items-center gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black italic text-white">{set.weight}kg x {set.reps}</span>
                      <span className="text-xs text-gray-700 font-normal italic">({set.e1rm})</span>
                    </div>
                    {/* 💡 備考がある時だけ表示 */}
                    {set.allNotes && (
                      <p className="text-[9px] text-gray-500 italic max-w-[80px] truncate">≫ {set.allNotes}</p>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 pb-20 font-black italic tracking-tighter">
      {/* 編集モーダル類 */}
      {editingItem && ( <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md">...</div> )}
      {showDownloadModal && ( <div className="...">...DLモーダル...</div> )}

      {/* 💡 ヘッダー：旧デザイン復元 */}
      <div className="mb-10 max-w-2xl mx-auto relative border-b border-gray-800 pb-4">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-3xl font-black italic text-gray-200">{tableData[0]?.date || "HISTORY"}</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowDownloadModal(true)} className="text-[10px] text-green-500 border border-green-900/50 px-3 py-1 rounded-full">XLSX_DATA</button>
            <div className="flex items-center gap-1 text-xs text-gray-600">
              Tap to Edit 👆
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 animate-pulse text-green-500">BOOTING_ARCHIVE...</div>
      ) : (
        <div className="space-y-16 max-w-2xl mx-auto">
          {tableData.map((day) => (
            <div key={day.date} className="relative">
              {/* 日付セクション */}
              <div className="flex items-center gap-4 mb-10 border-b border-gray-800 pb-4">
                <h2 className="text-2xl font-bold text-gray-400 tracking-tighter">{day.date}</h2>
                <div className="h-[1px] flex-1 bg-gray-800" />
              </div>

              {/* 各種目リスト (旧コンポーネントを使用) */}
              <div className="space-y-12">
                {day.bench.length > 0 && <OldMatrixNeonList sets={day.bench} title="BENCH PRESS" colorTheme="red" onEdit={setEditingItem} />}
                {day.squat.length > 0 && <OldMatrixNeonList sets={day.squat} title="SQUAT" colorTheme="blue" onEdit={setEditingItem} />}
                {day.deadlift.length > 0 && <OldMatrixNeonList sets={day.deadlift} title="DEADLIFT" colorTheme="green" onEdit={setEditingItem} />}
                {day.assistance.length > 0 && <OldMatrixNeonList sets={day.assistance} title="assistance" colorTheme="yellow" onEdit={setEditingItem} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}