"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/**
 * BIG3 LOG APP - TOP PAGE (Final Robust Version)
 * 2027-SOTSU ENGINEER EDITION
 */
export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true); // ロード状態の管理

  /**
   * 1. ログインチェック (Initial Fetch + Real-time Listener)
   * 起動時の「一回限りの取得」と、その後の「状態変化」の両方をカバー。
   */
  useEffect(() => {
      let mounted = true;

      const checkAuth = async () => {
        // 1. まず現在のセッションを確認
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (session) {
          // セッションがあれば即座に表示
          setLoading(false);
        } else {
          /**
           * 💡 ポイント：ここで即座に router.push しない！
           * Google認証直後は getSession が一瞬 null を返すことがあるため、
           * 少し待って onAuthStateChange のイベントに判断を委ねる。
           */
          const timeout = setTimeout(() => {
            if (loading && mounted) {
              router.push("/login");
            }
          }, 1500); // 1.5秒の猶予（グレースタイム）を与える
          return () => clearTimeout(timeout);
        }
      };

      // 2. 認証状態の変化を監視
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;

        if (session) {
          // ログイン（SIGNED_INやINITIAL_SESSION）が確認できれば表示
          setLoading(false);
        } else if (event === "SIGNED_OUT") {
          // 明示的にログアウトした時だけ飛ばす
          router.push("/login");
        }
      });

      checkAuth();

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }, [router, loading]);

  /**
   * 2. ログアウト処理
   * Supabaseのセッションを破棄し、AuthGuardによって自動的にログイン画面へ遷移させる。
   */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    // onAuthStateChangeが SIGNED_OUT を検知して自動で移動するが、念のため手動でも遷移
    router.push("/login");
  };

  // ロード中の表示：エンジニアらしいサイバーな演出
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-green-500 flex items-center justify-center font-black italic animate-pulse">
        CONNECTING_SYSTEM...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center">
      
      {/* 🔴 ログアウト：右上にネオンレッドのアクセント */}
      <div className="w-full max-w-md flex justify-end mb-8">
        <button 
          onClick={handleLogout}
          className="text-[10px] font-black italic tracking-widest text-red-500 border border-red-900/50 px-4 py-1 rounded-full bg-red-950/20 hover:bg-red-600 hover:text-white transition-all drop-shadow-[0_0_8px_rgba(220,38,38,0.4)]"
        >
          LOGOUT_SESSION
        </button>
      </div>

      {/* 🎨 メインタイトル：RGBグラデーション */}
      <h1 className="text-5xl font-black mb-16 tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-blue-500 to-green-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] text-center">
        BIG3 <span className="text-white">LOG</span>
      </h1>

      {/* 各カードの間隔を space-y-10 で広げ、視認性を確保 */}
      <div className="w-full max-w-md space-y-10">
        
        {/* 🔴 BENCH PRESS: Red Neon */}
        <Link href="/bench">
          <div className="w-full h-32 bg-gray-800 border-2 border-red-600 rounded-[40px] flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_35px_rgba(220,38,38,0.5)] transition-all active:scale-95 group relative overflow-hidden">
            <span className="text-4xl font-black text-red-500 tracking-widest italic drop-shadow-[0_0_10px_rgba(220,38,38,0.6)]">BENCH</span>
            <div className="absolute inset-0 bg-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity"/>
          </div>
        </Link>

        {/* 🔵 SQUAT: Blue Neon */}
        <Link href="/squat">
          <div className="w-full h-32 bg-gray-800 border-2 border-blue-600 rounded-[40px] flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_35px_rgba(37,99,235,0.5)] transition-all active:scale-95 group relative overflow-hidden">
            <span className="text-4xl font-black text-blue-500 tracking-widest italic drop-shadow-[0_0_10px_rgba(37,99,235,0.6)]">SQUAT</span>
            <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity"/>
          </div>
        </Link>

        {/* 🟢 DEADLIFT: Lime Neon - /dead ではなく /deadlift に修正済み */}
        <Link href="/deadlift">
          <div className="w-full h-32 bg-gray-800 border-2 border-lime-500 rounded-[40px] flex items-center justify-center shadow-[0_0_20px_rgba(163,230,53,0.3)] hover:shadow-[0_0_35px_rgba(163,230,53,0.5)] transition-all active:scale-95 group relative overflow-hidden">
            <span className="text-4xl font-black text-lime-400 tracking-widest italic drop-shadow-[0_0_10px_rgba(163,230,53,0.6)] text-center">DEADLIFT</span>
            <div className="absolute inset-0 bg-lime-500/5 opacity-0 group-hover:opacity-100 transition-opacity"/>
          </div>
        </Link>

        {/* 🟠 ASSISTANCE: Orange Neon */}
        <Link href="/assistance">
          <div className="w-full h-24 bg-gray-800/50 border border-orange-600/50 rounded-3xl flex items-center justify-center hover:bg-orange-950/20 transition-all active:scale-95 mt-4 shadow-lg shadow-orange-950/20">
            <span className="text-xl font-black text-orange-500 tracking-widest italic">ASSISTANCE ✚</span>
          </div>
        </Link>

        {/* ⚪ HISTORY: シルバー/グレイ */}
        <Link href="/history">
          <div className="w-full py-5 bg-gray-900 border border-gray-700 rounded-2xl flex items-center justify-center hover:bg-gray-800 transition-all active:scale-95 mt-8">
            <span className="text-sm font-bold text-gray-400 tracking-[0.3em] uppercase">View History 📝</span>
          </div>
        </Link>

      </div>

      {/* 🚀 バージョン表記：チキンレッグを回避した証 */}
      <p className="mt-20 text-[10px] text-gray-600 tracking-[0.5em] uppercase font-black italic">
        27-SOTSU ENGINEER EDITION
      </p>
    </main>
  );
}