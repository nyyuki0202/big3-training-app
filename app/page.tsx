"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

/**
 * BIG3 LOG APP - TOP PAGE (Matrix System v2.0.0)
 * 2027-SOTSU ENGINEER EDITION
 * ロード画面で止まるバグと、Googleログイン後の強制送還バグを修正済み。
 */
export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // 💡 ポイント1: 重複チェックを防ぐための盾（ガード）
  const isChecked = useRef(false);

  useEffect(() => {
    // A. 認証状態の変化をリアルタイム監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // セッションが確認できれば即座に表示許可
        setLoading(false);
      } else if (event === "SIGNED_OUT") {
        // 明示的にログアウトした時だけログイン画面へ飛ばす
        router.push("/login");
      }
    });

    // B. 初期起動時の「粘り強い」セッション確認
    const initAuth = async () => {
      if (isChecked.current) return;
      isChecked.current = true;

      // 1回目の確認
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setLoading(false);
      } else {
        /**
         * 💡 ポイント2: 2秒の「チキンレッグ猶予」
         * Google認証から戻った直後はクッキーの反映にラグがあるため、
         * 2秒待ってから最終判定を下す。
         */
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (!retrySession) {
            // 2秒待ってもセッションがなければ、本当に未ログインとみなす
            router.push("/login");
          } else {
            setLoading(false);
          }
        }, 2000);
      }
    };

    initAuth();

    // クリーンアップ処理
    return () => {
      subscription.unsubscribe();
    };
  }, [router]); // ⚠️ 依存配列に loading を入れてはいけない！

  /**
   * ログアウト処理
   */
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // セッションチェック中のサイバー演出
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-green-500 flex items-center justify-center font-black italic animate-pulse">
        CONNECTING_SYSTEM...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center">
      
      {/* 🔴 ログアウト：右上のネオンレッド */}
      <div className="w-full max-w-md flex justify-end mb-8">
        <button 
          onClick={handleLogout}
          className="text-[10px] font-black italic tracking-widest text-red-500 border border-red-900/50 px-4 py-1 rounded-full bg-red-950/20 hover:bg-red-600 hover:text-white transition-all drop-shadow-[0_0_8px_rgba(220,38,38,0.4)]"
        >
          LOGOUT_SESSION
        </button>
      </div>

      {/* 🎨 タイトル：RGBグラデーション */}
      <h1 className="text-5xl font-black mb-16 tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-blue-500 to-green-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] text-center">
        BIG3 <span className="text-white">LOG</span>
      </h1>

      {/* 空間を space-y-16 で広く使い、ネオンを映えさせる */}
      <div className="w-full max-w-md space-y-16">
        
        {/* 🔴 BENCH PRESS CARD */}
        <Link href="/bench">
          <div className="w-full h-32 bg-gray-800 border-2 border-red-600 rounded-[40px] flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_35px_rgba(220,38,38,0.5)] transition-all active:scale-95 group relative overflow-hidden">
            <span className="text-4xl font-black text-red-500 tracking-widest italic drop-shadow-[0_0_10px_rgba(220,38,38,0.6)]">BENCH</span>
            <div className="absolute inset-0 bg-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity"/>
          </div>
        </Link>

        {/* 🔵 SQUAT CARD */}
        <Link href="/squat">
          <div className="w-full h-32 bg-gray-800 border-2 border-blue-600 rounded-[40px] flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_35px_rgba(37,99,235,0.5)] transition-all active:scale-95 group relative overflow-hidden">
            <span className="text-4xl font-black text-blue-500 tracking-widest italic drop-shadow-[0_0_10px_rgba(37,99,235,0.6)]">SQUAT</span>
            <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity"/>
          </div>
        </Link>

        {/* 🟢 DEADLIFT CARD: /dead リンク問題修正済み */}
        <Link href="/deadlift">
          <div className="w-full h-32 bg-gray-800 border-2 border-lime-500 rounded-[40px] flex items-center justify-center shadow-[0_0_20px_rgba(163,230,53,0.3)] hover:shadow-[0_0_35px_rgba(163,230,53,0.5)] transition-all active:scale-95 group relative overflow-hidden">
            <span className="text-4xl font-black text-lime-400 tracking-widest italic drop-shadow-[0_0_10px_rgba(163,230,53,0.6)] text-center">DEADLIFT</span>
            <div className="absolute inset-0 bg-lime-500/5 opacity-0 group-hover:opacity-100 transition-opacity"/>
          </div>
        </Link>

        {/* 🟠 ASSISTANCE */}
        <Link href="/assistance">
          <div className="w-full h-24 bg-gray-800/50 border border-orange-600/50 rounded-3xl flex items-center justify-center hover:bg-orange-950/20 transition-all active:scale-95 mt-4 shadow-lg shadow-orange-950/20">
            <span className="text-xl font-black text-orange-500 tracking-widest italic">ASSISTANCE ✚</span>
          </div>
        </Link>

        {/* ⚪ HISTORY */}
        <Link href="/history">
          <div className="w-full py-5 bg-gray-900 border border-gray-700 rounded-2xl flex items-center justify-center hover:bg-gray-800 transition-all active:scale-95 mt-8">
            <span className="text-sm font-bold text-gray-400 tracking-[0.3em] uppercase">View Training History 📝</span>
          </div>
        </Link>

      </div>

      <p className="mt-20 text-[10px] text-gray-600 tracking-[0.5em] uppercase font-black italic">
        v1.4.6
      </p>
    </main>
  );
}