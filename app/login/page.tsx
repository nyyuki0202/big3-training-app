"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // 既存のメール用スイッチ
  const [isEmailMode, setIsEmailMode] = useState(false); // 🆕 Googleとメールの切り替え用スイッチ

  // 🆕 Googleログイン（OAuth）の実装
  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  // ✅ 既存のメール認証ロジック（そのまま統合）
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (isSignUp) {
        result = await supabase.auth.signUp({ email, password });
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }

      if (result.error) throw result.error;

      router.push("/");
      router.refresh();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 font-black italic">
      {/* ネオンRGBタイトルの復活 */}
      <h1 className="text-5xl mb-10 text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-blue-500 to-green-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
       LOG IN
      </h1>

      {/* モード切替スイッチ：IT専攻らしい、状態遷移のUI */}
      <div className="flex bg-gray-800 p-1 rounded-2xl mb-10 w-full max-w-sm border border-gray-700">
        <button
          onClick={() => setIsEmailMode(false)}
          className={`flex-1 py-2 rounded-xl text-[10px] transition-all uppercase tracking-widest ${!isEmailMode ? "bg-gray-600 text-white shadow-lg" : "text-gray-500"}`}
        >
          Google Auth
        </button>
        <button
          onClick={() => setIsEmailMode(true)}
          className={`flex-1 py-2 rounded-xl text-[10px] transition-all uppercase tracking-widest ${isEmailMode ? "bg-gray-600 text-white shadow-lg" : "text-gray-500"}`}
        >
          Email Auth
        </button>
      </div>

      <div className="w-full max-w-sm min-h-[350px] flex flex-col items-center justify-center">
        {!isEmailMode ? (
          /* --- Googleログイン：爆速・怪物級エフェクト --- */
          <div className="w-full animate-in fade-in duration-500">
            <button
              onClick={handleGoogleLogin}
              className="group relative w-full py-8 bg-black border-2 border-white rounded-[40px] active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]"
            >
              <span className="relative z-10 flex items-center justify-center gap-4 text-2xl">
                <span className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse delay-75"></div>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse delay-150"></div>
                </span>
                GOOGLE LOGIN
              </span>
            </button>
            <p className="mt-8 text-center text-[10px] text-gray-500 tracking-[0.2em] leading-relaxed">
              スクワットしないやつ<br/>チキンレッグ
            </p>
          </div>
        ) : (
          /* --- 既存のメールログイン/登録：リデザイン版 --- */
          <form onSubmit={handleAuth} className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center text-xs text-gray-400 mb-2 tracking-widest uppercase">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 p-4 rounded-2xl text-sm focus:border-red-500 outline-none transition-all"
              placeholder="EMAIL"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 p-4 rounded-2xl text-sm focus:border-red-500 outline-none transition-all"
              placeholder="PASSWORD"
              required
              minLength={6}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-white text-black font-black text-xl rounded-2xl active:scale-95 shadow-xl disabled:opacity-50"
            >
              {loading ? "LOADING..." : isSignUp ? "SIGN UP" : "ENTER"}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-gray-500 hover:text-white text-[10px] underline tracking-widest"
              >
                {isSignUp ? "LOG IN INSTEAD" : "CREATE ACCOUNT"}
              </button>
            </div>
          </form>
        )}
      </div>

      <p className="mt-20 text-[10px] text-gray-600 tracking-[0.4em] uppercase">27-SOTSU Engineer Edition</p>
    </main>
  );
}