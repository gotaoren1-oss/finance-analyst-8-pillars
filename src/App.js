import React, { useState } from 'react';
import { 
  Loader2, CheckCircle2, XCircle, Files, Key, AlertCircle, TrendingUp, Info, LayoutDashboard, Search, Database
} from 'lucide-react';

const App = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState(null);

  const getApiKey = () => {
    let key = localStorage.getItem('finance_analyst_key');
    if (!key) {
      key = prompt("הכנס מפתח API של Gemini:");
      if (key) localStorage.setItem('finance_analyst_key', key);
    }
    return key;
  };

  const callGemini = async (filesParts, promptText) => {
    const apiKey = getApiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: promptText }, ...filesParts] }],
      generationConfig: { temperature: 0.1 },
      tools: [{ "google_search": {} }]
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "שגיאה בתקשורת");
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("ה-AI לא החזיר מבנה נתונים תקין.");
    return JSON.parse(jsonMatch[0]);
  };

  const startAnalysis = async () => {
    if (uploadedFiles.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const filesParts = await Promise.all(uploadedFiles.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ inlineData: { data: reader.result.split(',')[1], mimeType: file.type || "application/pdf" } });
          reader.readAsDataURL(file);
        });
      }));

      const prompt = `נתח את החברה וספק JSON בעברית הכולל: companyName, ticker, currency, score, pillarsStatus, dcf (conservative, base, optimistic, marketPrice, marginOfSafety), verdict (recommendation, reason), analysisNotes.`;
      const result = await callGemini(filesParts, prompt);
      setAnalysisResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-100 font-sans selection:bg-blue-500/30" dir="rtl">
      
      {/* באנר קבוע - מבנה נתונים אידיאלי */}
      <div className="sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur-md border-b border-blue-500/20 shadow-2xl overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            <Database className="text-blue-400" size={18} />
            <span className="font-black text-sm text-blue-400">סיכום מבנה נתונים אידיאלי:</span>
          </div>
          <div className="flex gap-6 text-[11px] font-medium min-w-max">
            <span className="text-slate-400"><b className="text-white">Earnings Transcript:</b> סנטימנט גבוה (מנבא מעולה)</span>
            <span className="text-slate-400"><b className="text-white">10-K/Q:</b> יציבות וחוב (טווח ארוך)</span>
            <span className="text-slate-400"><b className="text-white">Investor Deck:</b> חזון ומפת דרכים</span>
            <span className="text-slate-400"><b className="text-white">8-K:</b> אירועים חריגים</span>
          </div>
          <div className="hidden lg:block text-[10px] bg-blue-500/10 text-blue-300 px-3 py-1 rounded-full border border-blue-500/20">
            💡 טיפ: שיפור בסנטימנט המנכ"ל הוא המנבא הטוב ביותר לעלייה
          </div>
        </div>
      </div>

      {/* רקע וול סטריט יוקרתי */}
      <div className="relative pt-12 pb-20 px-4">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=80" 
            alt="Manhattan" 
            className="w-full h-full object-cover grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f1a] via-transparent to-[#0a0f1a]"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Header */}
          <header className="flex justify-between items-center mb-16">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <TrendingUp size={28} className="text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                WallStreet AI Terminal
              </h1>
            </div>
            <button onClick={() => localStorage.removeItem('finance_analyst_key')} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <Key size={20} className="text-slate-500" />
            </button>
          </header>

          {!analysisResult && !isAnalyzing ? (
            <div className="max-w-2xl mx-auto glass-effect p-16 rounded-[3rem] text-center border border-white/10 shadow-2xl">
              <LayoutDashboard className="mx-auto text-blue-500 mb-8 opacity-50" size={64} />
              <h2 className="text-3xl font-bold mb-4">העלאת נתונים למערכת</h2>
              <p className="text-slate-400 mb-10 leading-relaxed">העלה דוחות, תמלילי שיחות או מצגות משקיעים.<br/>ה-AI יבצע ניתוח סנטימנט והערכת שווי בזמן אמת.</p>
              
              <input type="file" className="hidden" id="f" onChange={e => setUploadedFiles(Array.from(e.target.files))} multiple />
              <label htmlFor="f" className="bg-blue-600 text-white px-12 py-5 rounded-2xl font-black cursor-pointer hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40 inline-block uppercase tracking-widest text-sm">
                Open Terminal / Upload Files
              </label>
              
              {uploadedFiles.length > 0 && (
                <button onClick={startAnalysis} className="block w-full mt-10 bg-emerald-600 text-white py-5 rounded-2xl font-black hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/40 uppercase tracking-widest text-sm">
                  Execute Full Analysis
                </button>
              )}
            </div>
          ) : isAnalyzing ? (
            <div className="text-center py-32">
              <Loader2 className="animate-spin mx-auto text-blue-500 mb-8" size={80} />
              <h2 className="text-3xl font-black text-white italic tracking-widest uppercase">Analyzing Market Data...</h2>
              <p className="text-blue-400/60 mt-4 font-mono">Cross-referencing 10-K, Sentiment and Market Price</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Verdict Header */}
              <div className="glass-effect rounded-[3rem] p-10 border border-white/10 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="bg-blue-500/20 text-blue-400 px-4 py-1 rounded-full text-sm font-black tracking-widest uppercase">{analysisResult.ticker}</span>
                    <span className="text-slate-500 font-mono text-sm opacity-50">Market Status: Live</span>
                  </div>
                  <h2 className="text-7xl font-black tracking-tighter text-white mb-2">{analysisResult.companyName}</h2>
                </div>
                <div className={`px-12 py-8 rounded-[2.5rem] text-center min-w-[260px] shadow-2xl ${
                  analysisResult.verdict.recommendation.includes('קנייה') ? 'bg-emerald-600/90 shadow-emerald-500/20' : 
                  analysisResult.verdict.recommendation.includes('מכירה') ? 'bg-red-600/90 shadow-red-500/20' : 'bg-amber-600/90 shadow-amber-500/20'
                }`}>
                  <div className="text-xs font-black uppercase tracking-[0.2em] mb-2 opacity-70 italic">Final Verdict</div>
                  <div className="text-5xl font-black leading-none">{analysisResult.verdict.recommendation}</div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* DCF Card */}
                <div className="lg:col-span-2 glass-effect-blue rounded-[3rem] p-12 text-white border border-blue-500/30 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10"><TrendingUp size={120} /></div>
                  <p className="text-sm font-black uppercase tracking-[0.3em] text-blue-300 mb-4">Intrinsic Fair Value (DCF)</p>
                  <h3 className="text-8xl font-black tracking-tighter mb-8">{analysisResult.currency}{analysisResult.dcf.base}</h3>
                  <div className="flex items-center gap-4 bg-white/10 w-fit px-8 py-4 rounded-3xl border border-white/10">
                    <span className="text-2xl font-black">Safety: {analysisResult.dcf.marginOfSafety}%</span>
                  </div>
                  <div className="mt-10 grid grid-cols-3 gap-6 text-[10px] font-black uppercase tracking-widest text-blue-300/60 border-t border-white/5 pt-8">
                    <div>Cons: {analysisResult.currency}{analysisResult.dcf.conservative}</div>
                    <div>Market: {analysisResult.currency}{analysisResult.dcf.marketPrice}</div>
                    <div>Opt: {analysisResult.currency}{analysisResult.dcf.optimistic}</div>
                  </div>
                </div>

                {/* Score and Notes */}
                <div className="flex flex-col gap-8">
                  <div className="glass-effect rounded-[2.5rem] p-8 border border-white/5 flex flex-col items-center justify-center h-1/2">
                    <div className="text-6xl font-black text-white mb-1">{analysisResult.score}/8</div>
                    <div className="text-xs font-black uppercase tracking-widest text-slate-500 italic">Pillars Score</div>
                  </div>
                  <div className="glass-effect rounded-[2.5rem] p-8 border border-white/5 flex-1 relative overflow-hidden bg-white/[0.02]">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Search size={40} /></div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-blue-400 mb-4 italic">Analyst Intelligence</h4>
                    <p className="text-sm leading-relaxed text-slate-300 font-medium italic">"{analysisResult.verdict.reason}"</p>
                  </div>
                </div>
              </div>

              {/* Pillars list - Compact */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {analysisResult.pillarsStatus.map(s => (
                  <div key={s.id} className="glass-effect p-6 rounded-3xl border border-white/5 flex items-center gap-4 transition-all hover:border-blue-500/40">
                    {s.status === 'pass' ? <CheckCircle2 className="text-emerald-500" size={18}/> : <XCircle className="text-red-500" size={18}/>}
                    <span className="text-[10px] font-bold text-slate-400 leading-tight uppercase tracking-tight">{s.value}</span>
                  </div>
                ))}
              </div>

              <button onClick={() => setAnalysisResult(null)} className="mt-12 block mx-auto text-slate-500 font-black tracking-widest uppercase text-xs hover:text-white transition-colors">Analyze Next Asset</button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .glass-effect {
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .glass-effect-blue {
          background: linear-gradient(135deg, rgba(30, 64, 175, 0.4), rgba(15, 23, 42, 0.9));
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
      `}</style>
    </div>
  );
};

export default App;
