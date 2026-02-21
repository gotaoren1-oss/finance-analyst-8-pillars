import React, { useState, useEffect } from 'react';
import { 
  Loader2, CheckCircle2, XCircle, Key, AlertCircle, TrendingUp, Info, LayoutDashboard, Database, ShieldCheck
} from 'lucide-react';

const App = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState(null);

  // מפתח ה-API החדש שלך מוזן כאן כברירת מחדל
  const API_KEY = "AIzaSyB270SKgNHn0lpP2Qvjy7KG5yKRwvSfDJM";

  const processFile = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      if (file.size > 25 * 1024 * 1024) { // הגדלה ל-25MB עבור דוחות כבדים
        resolve({ text: `File ${file.name} is large. Analyzing core financial sections via search.` });
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
      const filesParts = await Promise.all(uploadedFiles.map(file => processFile(file)));
      
      // שימוש במודל 2.0 Flash בגרסת v1beta
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
      
      const promptText = `
        משימה: אנליסט בכיר בוול-סטריט.
        נתח את המסמכים המצורפים וחשב שווי הוגן (DCF).
        השתמש ב-Google Search כדי למצוא את מחיר המניה העדכני ביותר עבור הטיקר המזוהה.
        
        החזר אך ורק אובייקט JSON במבנה הבא:
        {
          "companyName": "string",
          "ticker": "string",
          "currency": "string",
          "score": number,
          "pillarsStatus": [{"id": number, "status": "pass/fail", "value": "string"}],
          "dcf": {"conservative": number, "base": number, "optimistic": number, "marketPrice": number, "marginOfSafety": number},
          "verdict": {"recommendation": "קנייה/החזקה/מכירה", "reason": "string"},
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
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        if (data.error?.message?.includes('quota')) throw new Error("מכסת ה-API החדשה נוצלה. גוגל מגבילה את כמות הטוקנים לדוחות ארוכים.");
        throw new Error(data.error?.message || "Error");
      }

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      setAnalysisResult(JSON.parse(rawText));
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-blue-500/30" dir="rtl">
      
      {/* Header Bar */}
      <div className="bg-[#0a1224]/80 backdrop-blur-md border-b border-blue-500/20 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-emerald-500" size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Secure | API Key Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-emerald-500 uppercase">Gemini 2.0 Flash Engine</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-12 pb-24">
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-600 rounded-3xl shadow-2xl shadow-blue-500/40 transform -rotate-2">
              <TrendingUp className="text-white" size={36} />
            </div>
            <div>
              <h1 className="text-5xl font-black italic tracking-tighter text-white uppercase">WallSt <span className="text-blue-500">Pro</span></h1>
              <p className="text-[11px] font-bold text-blue-400/50 tracking-[0.4em] uppercase">Intelligence Terminal v2.0</p>
            </div>
          </div>
        </header>

        {!analysisResult && !isAnalyzing ? (
          <div className="max-w-2xl mx-auto bg-slate-900/40 backdrop-blur-xl p-20 rounded-[4rem] text-center border border-white/5 shadow-3xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <LayoutDashboard className="mx-auto text-blue-500/20 mb-8" size={80} />
            <h2 className="text-3xl font-black text-white mb-4">ניתוח נכס מבוסס מודל 2.0</h2>
            <p className="text-slate-400 mb-12 text-lg font-light italic">המנוע המתקדם ביותר מוכן לניתוח הדוחות שלך.</p>
            
            <input type="file" className="hidden" id="f" onChange={e => setUploadedFiles(Array.from(e.target.files))} multiple />
            <label htmlFor="f" className="bg-blue-600 text-white px-16 py-6 rounded-2xl font-black cursor-pointer hover:bg-blue-500 transition-all shadow-2xl shadow-blue-900/40 inline-block text-sm uppercase tracking-widest">
              Upload PDF Reports
            </label>
            
            {uploadedFiles.length > 0 && (
              <button onClick={startAnalysis} className="block w-full mt-10 bg-emerald-600 text-white py-6 rounded-2xl font-black hover:bg-emerald-500 transition-all shadow-2xl shadow-emerald-900/40 text-sm uppercase">
                Execute Intelligence Scan
              </button>
            )}
          </div>
        ) : isAnalyzing ? (
          <div className="text-center py-40">
            <Loader2 className="animate-spin mx-auto text-blue-500 mb-8 opacity-40" size={100} />
            <h2 className="text-4xl font-black text-white italic tracking-[0.2em] uppercase animate-pulse">Scanning 10-K Architecture...</h2>
            <p className="text-blue-400/40 mt-6 font-mono text-xs uppercase tracking-[0.5em]">Real-Time Google Search Enabled</p>
          </div>
        ) : (
          <div className="space-y-10 animate-in fade-in zoom-in duration-1000">
            {/* Verdict Card */}
            <div className="bg-[#0a1224]/80 backdrop-blur-2xl rounded-[3.5rem] p-12 border border-white/10 shadow-3xl flex flex-col lg:flex-row justify-between items-center gap-12">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-6">
                  <span className="bg-blue-500/10 text-blue-400 px-6 py-2 rounded-full text-xs font-black tracking-widest border border-blue-500/20">{analysisResult.ticker}</span>
                  <span className="text-emerald-500 font-mono text-[10px] uppercase tracking-widest animate-pulse">● Live Link Established</span>
                </div>
                <h2 className="text-8xl font-black tracking-tighter text-white uppercase leading-none">{analysisResult.companyName}</h2>
              </div>
              <div className={`px-20 py-12 rounded-[3rem] text-center min-w-[350px] shadow-3xl border-2 ${
                analysisResult.verdict.recommendation.includes('קנייה') ? 'bg-emerald-600/10 border-emerald-500/50 text-emerald-400' : 
                analysisResult.verdict.recommendation.includes('מכירה') ? 'bg-red-600/10 border-red-500/50 text-red-400' : 'bg-amber-600/10 border-amber-500/50 text-amber-400'
              }`}>
                <div className="text-xs font-black uppercase tracking-[0.5em] mb-4 opacity-40">Institutional Verdict</div>
                <div className="text-7xl font-black uppercase leading-none">{analysisResult.verdict.recommendation}</div>
              </div>
            </div>

            {/* DCF & Pillars */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2 bg-gradient-to-br from-blue-700 via-blue-900 to-[#020617] rounded-[4rem] p-16 text-white shadow-3xl border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12"><TrendingUp size={300} /></div>
                <p className="text-xs font-black uppercase tracking-[0.6em] text-blue-200 mb-8 italic">Fair Value (DCF Model)</p>
                <h3 className="text-[11rem] font-black tracking-tighter leading-none mb-10">{analysisResult.currency}{analysisResult.dcf.base}</h3>
                <div className="flex gap-6">
                  <div className="bg-white/5 backdrop-blur-md px-10 py-5 rounded-3xl border border-white/10">
                    <span className="text-2xl font-black tracking-tighter uppercase">Margin: {analysisResult.dcf.marginOfSafety}%</span>
                  </div>
                  <div className="bg-emerald-500/20 px-10 py-5 rounded-3xl border border-emerald-500/20">
                    <span className="text-2xl font-black text-emerald-400 uppercase tracking-tighter italic">Price: {analysisResult.currency}{analysisResult.dcf.marketPrice}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-10">
                <div className="bg-slate-900/80 backdrop-blur-xl rounded-[3rem] p-12 border border-white/5 text-center flex flex-col justify-center h-1/2 shadow-2xl">
                   <div className="text-9xl font-black text-white leading-none tracking-tighter">{analysisResult.score}<span className="text-3xl opacity-20">/8</span></div>
                   <div className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 mt-6">Stability Score</div>
                </div>
                <div className="bg-gradient-to-b from-slate-900 to-black rounded-[3rem] p-12 border border-blue-500/20 flex-1 flex flex-col justify-center shadow-2xl">
                   <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-blue-400 mb-6 flex items-center gap-3">
                     <Info size={16}/> Strategic Insight
                   </h4>
                   <p className="text-xl font-medium leading-relaxed text-slate-300 italic">"{analysisResult.verdict.reason}"</p>
                </div>
              </div>
            </div>

            <button onClick={() => setAnalysisResult(null)} className="mt-24 block mx-auto text-slate-600 font-black uppercase text-[11px] tracking-[0.5em] hover:text-white transition-all underline underline-offset-[12px] decoration-blue-500/50 uppercase">New Institutional Scan</button>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto mt-16 bg-red-900/10 border-2 border-red-500/20 p-10 rounded-[3rem] flex items-center gap-8 text-red-400 shadow-4xl backdrop-blur-md animate-bounce">
            <AlertCircle size={48} className="shrink-0" />
            <div>
              <div className="text-xs font-black uppercase tracking-widest mb-1 opacity-60">Engine Halt</div>
              <div className="text-lg font-bold italic">{error}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
