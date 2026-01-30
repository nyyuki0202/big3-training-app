"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // ログインか登録かの切り替え

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (isSignUp) {
        // 新規登録
        result = await supabase.auth.signUp({ email, password });
      } else {
        // ログイン
        result = await supabase.auth.signInWithPassword({ email, password });
      }

      if (result.error) throw result.error;

      // 成功したらトップページへ
      router.push("/");
      router.refresh(); // 状態を更新
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700">
        <h1 className="text-3xl font-bold text-center mb-8">
          {isSignUp ? "JOIN US 🔥" : "WELCOME BACK 💪"}
        </h1>

        <form onSubmit={handleAuth} className="space-y-6">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700 text-white p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="muscles@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-700 text-white p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-white text-black font-bold text-xl rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {loading ? "Loading..." : isSignUp ? "Sign Up" : "Log In"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-gray-400 hover:text-white text-sm underline"
          >
            {isSignUp
              ? "すでにアカウントをお持ちの方はこちら (Log In)"
              : "アカウントを作成する (Sign Up)"}
          </button>
        </div>
      </div>
    </main>
  );
}