"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { supabase } from '@/lib/supabaseClient';

export default function TrainerChat() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) setUserId(session.user.id);
    };
    getUserId();
  }, []);

  // 最新の AI SDK v4 仕様に合わせたフック
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: { userId }, // ログイン中のユーザーIDをサーバーに送る
  });

  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-80 h-96 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 flex justify-between items-center">
            <h3 className="font-bold text-sm">🔥 Geminiコーチ</h3>
            <button onClick={() => setIsOpen(false)} className="text-white">×</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user' ? 'bg-blue-600' : 'bg-gray-700 text-gray-200'
                }`}>
                  {/* 最新のテキスト表示形式 */}
                  {m.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* handleSubmit を使うことで、Enterキー送信なども自動で対応 */}
          <form onSubmit={handleSubmit} className="p-2 border-t border-gray-700 bg-gray-800">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="増量のアドバイスをくれ！"
                className="flex-1 bg-gray-900 text-white text-sm rounded-lg px-3 py-2 border border-gray-700 outline-none focus:border-blue-500"
              />
              <button 
                type="submit" 
                disabled={isLoading || !input.trim()} 
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