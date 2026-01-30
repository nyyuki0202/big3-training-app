"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true); // チェック中かどうか

  // ▼ 追加：ログインチェック処理
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // ログインしてないなら、ログイン画面へ強制送還！
        router.push("/login");
      } else {
        setLoading(false); // ログインOKなら画面を表示
      }
    };
    checkUser();
  }, [router]);

  if (loading) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
  }
  // ▲ ここまでが追加・変更点

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center">
      
      {/* ログアウトボタン（右上に追加） */}
      <div className="w-full max-w-md flex justify-end mb-4">
        <button 
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/login");
          }}
          className="text-xs text-gray-500 hover:text-white underline"
        >
          LOG OUT
        </button>
      </div>

      <h1 className="text-4xl font-black mb-12 tracking-tighter italic">
        BIG3 LOG <span className="text-red-600">APP</span>
      </h1>

      <div className="w-full max-w-md space-y-6">
        
        {/* BENCH PRESS */}
        <Link href="/bench">
          <div className="w-full h-32 bg-red-600 hover:bg-red-500 rounded-3xl flex items-center justify-center shadow-lg shadow-red-900/50 transition-transform active:scale-95 cursor-pointer relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"/>
            <span className="text-4xl font-black text-black tracking-widest italic">BENCH</span>
          </div>
        </Link>

        {/* SQUAT */}
        <Link href="/squat">
          <div className="w-full h-32 bg-blue-600 hover:bg-blue-500 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-900/50 transition-transform active:scale-95 cursor-pointer relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"/>
            <span className="text-4xl font-black text-black tracking-widest italic">SQUAT</span>
          </div>
        </Link>

        {/* DEADLIFT */}
        <Link href="/deadlift">
          <div className="w-full h-32 bg-green-600 hover:bg-green-500 rounded-3xl flex items-center justify-center shadow-lg shadow-green-900/50 transition-transform active:scale-95 cursor-pointer relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"/>
            <span className="text-3xl font-black text-black tracking-widest italic">DEADLIFT</span>
          </div>
        </Link>

        {/* ASSISTANCE BUTTON */}
        <Link href="/assistance" className="w-full max-w-md block">
          <div className="w-full h-24 bg-yellow-600 hover:bg-yellow-500 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer mt-4">
            <span className="text-2xl font-black text-black tracking-wider">ASSISTANCE ✚</span>
          </div>
        </Link>

        {/* HISTORY BUTTON */}
        <Link href="/history" className="w-full max-w-md mt-8 block">
          <div className="w-full py-4 border-2 border-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-800 transition-colors">
            <span className="text-xl font-bold text-gray-400 tracking-wider">VIEW HISTORY 📝</span>
          </div>
        </Link>

      </div>
    </main>
  );
}