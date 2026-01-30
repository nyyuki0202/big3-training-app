import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 gap-6 bg-gray-900">
      <h1 className="text-4xl font-bold text-white mb-4">BIG3 LOG</h1>
      
      {/* BENCH PRESS BUTTON */}
      <Link href="/bench" className="w-full max-w-md">
        <div className="w-full h-32 bg-red-600 hover:bg-red-500 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer">
          <span className="text-3xl font-black text-white tracking-wider">BENCH PRESS</span>
        </div>
      </Link>

      {/* SQUAT BUTTON */}
      <Link href="/squat" className="w-full max-w-md">
        <div className="w-full h-32 bg-blue-600 hover:bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer">
          <span className="text-3xl font-black text-white tracking-wider">SQUAT</span>
        </div>
      </Link>

      {/* DEADLIFT BUTTON */}
      <Link href="/deadlift" className="w-full max-w-md">
        <div className="w-full h-32 bg-green-600 hover:bg-green-500 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer">
          <span className="text-3xl font-black text-white tracking-wider">DEADLIFT</span>
        </div>
      </Link>

      {/* ASSISTANCE BUTTON (New!) */}
      <Link href="/assistance" className="w-full max-w-md">
        <div className="w-full h-24 bg-yellow-600 hover:bg-yellow-500 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer mt-4">
          <span className="text-2xl font-black text-black tracking-wider">ASSISTANCE ✚</span>
        </div>
      </Link>

      {/* HISTORY BUTTON */}
      <Link href="/history" className="w-full max-w-md mt-8">
        <div className="w-full py-4 border-2 border-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-800 transition-colors">
          <span className="text-xl font-bold text-gray-400 tracking-wider">VIEW HISTORY 📝</span>
        </div>
      </Link>
    </main>
  );
}