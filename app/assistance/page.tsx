"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

const DEFAULT_EXERCISES = [
  "Bulgarian Squat",
  "Cable Crossover",
  "Dumbbell Fly",
  "Dumbbell Row",
  "Incline Dumbbell Press",
  "Lat Pulldown",
  "Leg Curl",
  "Leg Extension",
  "Leg Press",
  "Romanian Deadlift",
  "Seated Row",
  "Side Lateral Raise",
  "Skull Crusher",
  "Tempo Bench Press"
];

export default function AssistancePage() {
  const router = useRouter();
  
  const [exerciseName, setExerciseName] = useState("");
  const [weight, setWeight] = useState(20);
  const [reps, setReps] = useState(10);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [masterExercises, setMasterExercises] = useState<string[]>(DEFAULT_EXERCISES);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const isFetched = useRef(false);

  useEffect(() => {
    const fetchCustomExercises = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("favorite_exercises")
        .select("name")
        .eq("user_id", session.user.id);

      if (!error && data) {
        const customNames = data.map((item) => item.name);
        const mergedSet = new Set([...DEFAULT_EXERCISES, ...customNames]);
        const sortedNames = Array.from(mergedSet).sort((a, b) => a.localeCompare(b));
        setMasterExercises(sortedNames);
      }
    };

    if (!isFetched.current) {
      fetchCustomExercises();
      isFetched.current = true;
    }
  }, []);

  const handleRecord = async () => {
    if (!exerciseName.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const trimmedName = exerciseName.trim();

      if (!masterExercises.includes(trimmedName)) {
        await supabase
          .from("favorite_exercises")
          .insert([{ user_id: session.user.id, name: trimmedName }]);
      }

      const { error } = await supabase.from("workouts").insert([
        {
          exercise: trimmedName,
          weight,
          reps,
          notes: notes.trim() || null,
          user_id: session.user.id,
        },
      ]);

      if (error) throw error;
      router.push("/");
    } catch (e) {
      console.error(e);
      setIsSubmitting(false);
    }
  };

  const filteredSuggestions = masterExercises.filter((ex) =>
    ex.toLowerCase().includes(exerciseName.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-gray-900 text-white p-4 pb-20 flex flex-col items-center">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div>
          <Link href="/" className="text-gray-400 hover:text-white text-sm">← Back to TOP</Link>
        </div>

        <h1 className="text-2xl font-bold text-center text-yellow-400 uppercase">assistance</h1>

        {/* 種目名入力 ＆ サジェスト */}
        <div className="relative">
          <label className="text-xs text-gray-400 block mb-1">Exercise Name</label>
          <input
            type="text"
            value={exerciseName}
            onChange={(e) => { setExerciseName(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
            placeholder="種目名を入力"
            className="w-full bg-gray-800 text-white p-3 rounded-xl border border-gray-700 focus:outline-none focus:border-yellow-500"
          />

          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-xl max-h-40 overflow-y-auto shadow-2xl">
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onMouseDown={() => { setExerciseName(suggestion); setShowSuggestions(false); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 border-b border-gray-700/50 last:border-none"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 元のデザイン通りの重量設定カード */}
        <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 text-center">
          <label className="text-xs text-gray-400 block mb-2">WEIGHT (kg)</label>
          <div className="flex items-center justify-between">
            <button onClick={() => setWeight(Math.max(0, weight - 2.5))} className="w-12 h-12 bg-gray-700 rounded-full font-bold hover:bg-gray-600">-2.5</button>
            <input type="number" step="0.25" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="w-24 bg-transparent text-center text-2xl font-bold focus:outline-none" />
            <button onClick={() => setWeight(weight + 2.5)} className="w-12 h-12 bg-yellow-500 text-gray-900 rounded-full font-bold hover:bg-yellow-400">+2.5</button>
          </div>
        </div>

        {/* 元のデザイン通りのレップ設定カード */}
        <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700 text-center">
          <label className="text-xs text-gray-400 block mb-2">REPS</label>
          <div className="flex items-center justify-between">
            <button onClick={() => setReps(Math.max(0, reps - 1))} className="w-12 h-12 bg-gray-700 rounded-full font-bold hover:bg-gray-600">-</button>
            <input type="number" value={reps} onChange={(e) => setReps(Number(e.target.value))} className="w-24 bg-transparent text-center text-2xl font-bold focus:outline-none" />
            <button onClick={() => setReps(reps + 1)} className="w-12 h-12 bg-yellow-500 text-gray-900 rounded-full font-bold hover:bg-yellow-400">+</button>
          </div>
        </div>

        {/* 備考欄 */}
        <div>
          <label className="text-xs text-gray-400 block mb-1">NOTES (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="メモを残せます"
            className="w-full bg-gray-800 text-white p-3 rounded-xl border border-gray-700 focus:outline-none focus:border-yellow-500"
            rows={2}
          />
        </div>

        <button
          onClick={handleRecord}
          disabled={isSubmitting || !exerciseName.trim()}
          className="w-full py-4 bg-yellow-500 text-gray-900 rounded-2xl font-bold hover:bg-yellow-400 disabled:opacity-50 transition-all text-lg"
        >
          {isSubmitting ? "RECORDING..." : "RECORD SET"}
        </button>
      </div>
    </main>
  );
}