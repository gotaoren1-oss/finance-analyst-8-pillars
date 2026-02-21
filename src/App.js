import React, { useState } from 'react';
import { 
  Loader2, CheckCircle2, XCircle, Files, Key, AlertCircle, TrendingUp, Info, LayoutDashboard, Database
} from 'lucide-react';

const App = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState(null);

  const getApiKey = () => {
    let key = localStorage.getItem('finance_analyst_key');
    if (!key) {
      key = prompt("הכנס מפתח API של Gemini 1.5 Pro:");
      if (key) localStorage.setItem('finance_analyst_key', key);
    }
    return key;
  };

  const processFile = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      // Gemini 1.5 Pro יכול להתמודד עם קבצים גדולים, הגדלנו את הרף ל-30MB
      if (file.size > 30 * 1024 * 1024) {
        resolve({ text: `File ${file.name} is extremely large. Analyze via Google Search results for 2025/2026.` });
        return;
      }
      reader.onload = () => resolve({
        inlineData: { data: reader.result.split(',')[1], mimeType: file.type || "application/pdf" }
      });
      reader.readAsDataURL(file);
    });
  };

  const startAnalysis = async () => {
    if (uploadedFiles.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const apiKey = getApiKey();
      if (!apiKey) throw new Error("API Key Missing");

      const filesParts = await Promise.all(uploadedFiles.map(file => processFile(file)));
      
      // שימוש במודל ה-PRO המתקדם ביותר
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
      
      const promptText = `
        משימה: אנליסט וול סטריט בכיר.
        נתח את המסמכים המצורפים (דוחות כספיים/מצגות).
        1. חלץ: שם חברה, טיקר, מטבע דיווח.
        2. בצע: ניתוח 8 Pillars וחישוב DCF ל-10 שנים.
        3. השתמש ב-Google Search למחיר שוק עדכני ונתוני מתחרים.
        4. ספק המלצה סופית בעברית: קנייה, החזקה או מכירה.

        החזר אך ורק אובייקט JSON נקי במבנה הבא:
        {
          "companyName": "string",
          "ticker": "string",
          "currency": "string",
          "score": number,
          "pillarsStatus": [{"id": number, "status": "pass/fail", "value": "string"}],
          "dcf": {"conservative": number, "base": number, "optimistic": number, "marketPrice": number, "marginOfSafety": number},
          "verdict": {"recommendation": "string", "reason": "string"},
          "analysisNotes": "string"
        }
      `;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }, ...filesParts] }],
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.2, // טמפרטורה נמוכה לדיוק פיננסי
            responseMimeType: "application/json"
          }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Model Sync Failed");

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      setAnalysisResult(JSON.parse(rawText));
    } catch (err) {
      setError(err.message);
      console.error("Critical Error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050a14] text-slate-200 font-sans" dir="rtl">
      {/* באנר עליון קבוע */}
      <div className="sticky top-0 z-50 bg-[#0a1224]/95 backdrop-blur-xl border-b border-blue-500/20 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Database className="text-blue-400" size={18} />
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">System: Gemini 1.5 Pro Integrated</span>
          </div>
          <div className="hidden md:flex gap-8 text-[10px] font-bold text-blue-200/50 uppercase">
            <span>Fundamental Analysis</span>
            <span>Intrinsic Value (DCF)</span>
            <span>Sentiment Scanning</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-16 pb-24">
        <header className="flex justify-between items-center mb-20">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-600 rounded-3xl shadow-2xl shadow-blue-500/40 transform -rotate-3">
              <TrendingUp className="text-white" size={36} />
            </div>
            <div>
              <h1 className="text-5xl font-black italic tracking-tighter text-white">PRO <span className="text-blue-500">TERMINAL</span></h1>
              <p className="text-[11px] font-bold text-blue-400/60 tracking-[0.5em] uppercase">Asset Intelligence Engine</p>
            </div>
          </div>
          <button onClick={() => {localStorage.removeItem('finance_analyst_key'); window.location.reload();}} className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors border border-white/10">
            <Key size={20} className="text-slate-400" />
          </button>
        </header>

        {!analysisResult && !isAnalyzing ? (
          <div className="max-w-2xl mx-auto bg-gradient-to-b from-[#0a1224] to-[#050a14] p-20 rounded-[4rem] text-center border border-white/5 shadow-3xl">
            <LayoutDashboard className="mx-auto text-blue-500/20 mb-8" size={80} />
            <h2 className="text-4xl font-black text-white mb-6 italic">נתח דוח כספי</h2>
            <p className="text-slate-400 mb-12 text-lg font-light leading-relaxed">העלה את הקבצים הכבדים ביותר. מנוע ה-Pro ינתח כל עמוד בחיפוש אחר הזדמנויות השקעה.</p>
            
            <input type="file" className="hidden" id="f" onChange={e => setUploadedFiles(Array.from(e.target.files))} multiple />
            <label htmlFor="f" className="bg-blue-600 text-white px-16 py-6 rounded-2xl font-black cursor-pointer hover:bg-blue-500 transition-all shadow-2xl shadow-blue-900/40 inline-block text-sm uppercase tracking-widest">
              Upload Files
            </label>
            
            {uploadedFiles.length > 0 && (
              <button onClick={startAnalysis} className="block w-full mt-8 bg-emerald-600 text-white py-6 rounded-2xl font-black hover:bg-emerald-500 transition-all shadow-2xl shadow-emerald-900/40 text-sm uppercase">
                Execute Pro Analysis
              </button>
            )}
          </div>
        ) : isAnalyzing ? (
          <div className="text-center py-40">
            <div className="relative inline-block">
              <Loader2 className="animate-spin text-blue-500 mb-8 opacity-20" size={120} />
              <Loader2 className="animate-spin text-blue-400 absolute inset-0 m-auto" size={60} />
            </div>
            <h2 className="text-4xl font-black text-white italic tracking-[0.2em] uppercase animate-pulse">Deep Intelligence Sync...</h2>
            <p className="text-blue-400/40 mt-6 font-mono text-xs uppercase tracking-[0.3em]">Processing 300+ Pages | Real-Time Market Search | DCF Validation</p>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in zoom-in duration-1000">
            {/* כרטיס המלצה יוקרתי */}
            <div className="bg-[#0a1224]/80 backdrop-blur-2xl rounded-[3.5rem] p-12 border border-white/10 shadow-3xl flex flex-col lg:flex-row justify-between items-center gap-12">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <span className="bg-blue-500/10 text-blue-400 px-6 py-2 rounded-full text-xs font-black tracking-[0.2em] border border-blue-500/20">{analysisResult.ticker}</span>
                  <div className="flex gap-1">
                    {[1,2,3].map(i => <div key={i} className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" style={{animationDelay: `${i*0.2}s`}}></div>)}
                  </div>
                </div>
                <h2 className="text-8xl font-black tracking-tighter text-white uppercase leading-none">{analysisResult.companyName}</h2>
              </div>
              <div className={`px-20 py-12 rounded-[3rem] text-center min-w-[350px] shadow-3xl border-2 transform hover:scale-105 transition-transform ${
                analysisResult.verdict.recommendation.includes('קנייה') ? 'bg-emerald-600/10 border-emerald-500/50 text-emerald-400' : 
                analysisResult.verdict.recommendation.includes('מכירה') ? 'bg-red-600/10 border-red-500/50 text-red-400' : 'bg-amber-600/10 border-amber-500/50 text-amber-400'
              }`}>
                <div className="text-xs font-black uppercase tracking-[0.5em] mb-4 opacity-40 italic">Final Verdict</div>
                <div className="text-7xl font-black leading-none tracking-tighter uppercase">{analysisResult.verdict.recommendation}</div>
              </div>
            </div>

            {/* Grid של נתונים */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 bg-gradient-to-br from-blue-700 via-blue-900 to-[#050a14] rounded-[4rem] p-16 text-white shadow-3xl relative overflow-hidden border border-white/10">
                <div className="absolute -top-20 -right-20 opacity-5 rotate-12"><TrendingUp size={400} /></div>
                <p className="text-xs font-black uppercase tracking-[0.6em] text-blue-200 mb-8 italic">Intrinsic Value (DCF Model)</p>
                <h3 className="text-[12rem] font-black tracking-tighter leading-none mb-12">{analysisResult.currency}{analysisResult.dcf.base}</h3>
                <div className="flex gap-6">
                  <div className="bg-white/5 backdrop-blur-md px-10 py-5 rounded-3xl border border-white/10">
                    <span className="text-2xl font-black tracking-tighter uppercase">MOS: {analysisResult.dcf.marginOfSafety}%</span>
                  </div>
                  <div className="bg-emerald-500/20 px-10 py-5 rounded-3xl border border-emerald-500/20">
                    <span className="text-2xl font-black text-emerald-400 uppercase tracking-tighter">Market: {analysisResult.currency}{analysisResult.dcf.marketPrice}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-10">
                <div className="bg-[#0a1224]/80 backdrop-blur-xl rounded-[3rem] p-12 border border-white/5 text-center flex flex-col justify-center h-1/2 shadow-2xl hover:border-blue-500/30 transition-colors">
                   <div className="text-9xl font-black text-white leading-none tracking-tighter">{analysisResult.score}<span className="text-3xl opacity-20">/8</span></div>
                   <div className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 mt-6 italic">Pillars Stability Score</div>
                </div>
                <div className="bg-gradient-to-b from-[#0f172a] to-[#0a1224] rounded-[3rem] p-12 border border-blue-500/20 flex-1 flex flex-col justify-center shadow-2xl italic">
                   <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-400 mb-6 flex items-center gap-3 underline decoration-blue-500/30">
                     <Info size={16}/> Executive Analyst Note
                   </h4>
                   <p className="text-xl font-medium leading-relaxed text-slate-300 italic">"{analysisResult.verdict.reason}"</p>
                </div>
              </div>
            </div>

            <button onClick={() => setAnalysisResult(null)} className="mt-24 block mx-auto text-slate-600 font-black uppercase text-[11px] tracking-[0.5em] hover:text-white transition-all underline underline-offset-[12px] decoration-blue-500/50">Analyze Next Institutional Asset</button>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto mt-16 bg-red-900/10 border-2 border-red-500/20 p-10 rounded-[3rem] flex items-center gap-8 text-red-400 shadow-4xl backdrop-blur-md">
            <AlertCircle size={48} className="shrink-0" />
            <div>
              <div className="text-xs font-black uppercase tracking-widest mb-1 opacity-60">System Fault Detected</div>
              <div className="text-lg font-bold italic leading-tight">{error}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
