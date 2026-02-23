"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { supabase } from '@/lib/supabaseClient'; // ▼ 追加

export default function TrainerChat() {
  const [input, setInput] = useState("");
  const [userId, setUserId] = useState<string | null>(null); // ▼ ID保持用

  // ▼ 追加：ログインユーザーのIDを取得
  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUserId(session.user.id);
    };
    getUserId();
  }, []);

  const { messages, sendMessage, status } = useChat({
    api: '/api/chat',
    body: { userId }, // ▼ APIにログイン中のユーザーIDを送る
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() === "") return;
    sendMessage({ text: input });
    setInput("");
  };

  const isLoading = status === 'submitted' || status === 'streaming';

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!mounted) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-80 h-96 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white">
          {/* ヘッダー */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 flex justify-between items-center">
            <h3 className="font-bold text-sm">🔥 Geminiコーチ</h3>
            <button onClick={() => setIsOpen(false)} className="text-white">×</button>
          </div>

          {/* メッセージ表示部 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user' ? 'bg-blue-600' : 'bg-gray-700 text-gray-200'
                }`}>
                  {/* AI SDK v6 用のレンダリング */}
                  {m.parts.map((part, i) => (
                    part.type === 'text' ? <span key={i}>{part.text}</span> : null
                  ))}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* 入力フォーム */}
          <form onSubmit={handleSubmit} className="p-2 border-t border-gray-700 bg-gray-800">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="増量のアドバイスをくれ！"
                className="flex-1 bg-gray-900 text-white text-sm rounded-lg px-3 py-2 border border-gray-700"
              />
              <button 
                type="submit" 
                disabled={isLoading} 
                className="bg-blue-600 text-white rounded-lg px-3 py-2 font-bold disabled:opacity-50"
              >
                {isLoading ? '...' : '↑'}
              </button>
            </div>
          </form>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-3xl hover:scale-110 transition-transform"
      >
        💪
      </button>
    </div>
  );
}