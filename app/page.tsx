"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/**
 * BIG3 LOG APP - TOP PAGE
 * * 未来の自分へ：
 * このページは「認証済みユーザー」だけがアクセスできる聖域だ。
 * ログイン状態のチェック、各トレーニングへの導線、セッション破棄を担当している。
 */
export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true); // セッション確認中のチラつき防止フラグ

  /**
   * 1. ログインチェック (Authentication Guard)
   * ページが読み込まれた瞬間、Supabaseに「今誰かログインしてる？」と聞く。
   * セッションがない場合は /login へ強制送還する。
   */
  useEffect(() => {
    const checkUser = async () => {
      // getSession() で現在のセッション情報を取得
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // セッションがない＝未ログイン。ログイン画面へ飛ばす
        router.push("/login");
      } else {
        // ログイン済みなら、コンテンツの表示を許可する
        setLoading(false);
      }
    };
    checkUser();
  }, [router]);

  /**
   * 2. ログアウト処理 (Sign Out)
   * ボタンを押した時に実行。Supabaseのセッションを破棄してログイン画面に戻す。
   */
  const handleLogout = async () => {
    // Supabase側のセッションを無効化
    await supabase.auth.signOut();
    // 画面をログインへ戻す
    router.push("/login");
  };

  // セッションチェック中は何も表示せず、Loading画面を出す
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-green-500 flex items-center justify-center font-black italic animate-pulse">
        CONNECTING_SYSTEM...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center">
      
      {/* 🔴 ログアウトセクション：右上に配置して邪魔にならないように */}
      <div className="w-full max-w-md flex justify-end mb-8">
        <button 
          onClick={handleLogout}
          className="text-[10px] font-black italic tracking-widest text-red-500 border border-red-900/50 px-4 py-1 rounded-full bg-red-950/20 hover:bg-red-600 hover:text-white transition-all drop-shadow-[0_0_8px_rgba(220,38,38,0.4)]"
        >
          LOGOUT_SESSION
        </button>
      </div>

      {/* 🎨 タイトル：光の三原色グラデーション */}
      <h1 className="text-5xl font-black mb-16 tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-blue-500 to-green-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] text-center">
        BIG3 <span className="text-white">LOG</span>
      </h1>

      <div className="w-full max-w-md space-y-10">
        
        {/* 🔴 BENCH PRESS CARD: Red Neon */}
        <Link href="/bench">
          <div className="w-full h-32 bg-gray-800 border-2 border-red-600 rounded-[40px] flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_35px_rgba(220,38,38,0.5)] transition-all active:scale-95 group relative overflow-hidden">
            <span className="text-4xl font-black text-red-500 tracking-widest italic drop-shadow-[0_0_10px_rgba(220,38,38,0.6)]">BENCH</span>
            {/* ホバー時の光の走り */}
            <div className="absolute inset-0 bg-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity"/>
          </div>
        </Link>

        {/* 🔵 SQUAT CARD: Blue Neon */}
        <Link href="/squat">
          <div className="w-full h-32 bg-gray-800 border-2 border-blue-600 rounded-[40px] flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_35px_rgba(37,99,235,0.5)] transition-all active:scale-95 group relative overflow-hidden">
            <span className="text-4xl font-black text-blue-500 tracking-widest italic drop-shadow-[0_0_10px_rgba(37,99,235,0.6)]">SQUAT</span>
            <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity"/>
          </div>
        </Link>

        {/* 🟢 DEADLIFT CARD: Lime Neon */}
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

        {/* ⚪ HISTORY: 履歴閲覧（少し落ち着いたトーンで） */}
        <Link href="/history">
          <div className="w-full py-5 bg-gray-900 border border-gray-700 rounded-2xl flex items-center justify-center hover:bg-gray-800 transition-all active:scale-95 mt-8">
            <span className="text-sm font-bold text-gray-400 tracking-[0.3em] uppercase">View History 📝</span>
          </div>
        </Link>

      </div>

      {/* 🚀 フッター：エンジニアらしいバージョン表記 */}
      <p className="mt-20 text-[10px] text-gray-600 tracking-[0.5em] uppercase font-black italic">
        v1.4.5
      </p>
    </main>
  );
}