import React, { useState } from 'react';
import { 
  Loader2, CheckCircle2, XCircle, Key, AlertCircle, TrendingUp, Info, LayoutDashboard, Database
} from 'lucide-react';

const App = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState(null);

  const getApiKey = () => {
    let key = localStorage.getItem('finance_analyst_key');
    if (!key) {
      key = prompt("הכנס מפתח API (מ-Google AI Studio):");
      if (key) localStorage.setItem('finance_analyst_key', key);
    }
    return key;
  };

  const processFile = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      if (file.size > 20 * 1024 * 1024) {
        resolve({ text: `File ${file.name} too large. Use web search for this company.` });
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
      
      // שימוש במודל 2.0 Flash החדש ביותר
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      
      const promptText = `
        נתח את המסמכים המצורפים כחוקר מניות בכיר. 
        1. בצע חיפוש Google Search למחיר מניה עדכני (Ticker).
        2. נתח דוחות כספיים וספק ציון 8 Pillars.
        3. חשב שווי הוגן DCF (Conservative, Base, Optimistic).
        4. החזר המלצה בעברית (קנייה/החזקה/מכירה) ונימוק אסטרטגי.

        החזר אך ורק JSON במבנה הבא:
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
          tools: [{ google_search: {} }], // חיפוש גוגל מובנה
          generationConfig: {
            temperature: 1, // Gemini 2.0 עובד מצוין בטמפרטורה גבוהה ליצירתיות בתוך JSON
            responseMimeType: "application/json"
          }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Model Sync Error");

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      setAnalysisResult(JSON.parse(rawText));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans" dir="rtl">
      {/* Top Status Bar */}
      <div className="bg-blue-600/10 border-b border-blue-500/20 px-6 py-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-blue-400" />
          <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase">Engine: Gemini 2.0 Flash</span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono">Status: Connected to v1beta</div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="flex justify-between items-center mb-20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl">
              <TrendingUp className="text-white" size={32} />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">Quant<span className="text-blue-500">Terminal</span></h1>
          </div>
          <button onClick={() => {localStorage.removeItem('finance_analyst_key'); window.location.reload();}} className="p-2 hover:bg-white/5 rounded-full border border-white/10 transition-colors">
            <Key size={18} className="text-slate-500" />
          </button>
        </header>

        {!analysisResult && !isAnalyzing ? (
          <div className="max-w-xl mx-auto bg-slate-900/50 backdrop-blur-xl p-16 rounded-[3rem] text-center border border-white/5 shadow-2xl">
            <LayoutDashboard className="mx-auto text-blue-500/20 mb-6" size={60} />
            <h2 className="text-3xl font-bold text-white mb-4">ניתוח דוחות מבוסס 2.0</h2>
            <p className="text-slate-400 mb-10 text-sm">העלה דוחות PDF (עד 20MB) לניתוח שווי עמוק וסריקת שוק בזמן אמת.</p>
            <input type="file" className="hidden" id="f" onChange={e => setUploadedFiles(Array.from(e.target.files))} multiple />
            <label htmlFor="f" className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-5 rounded-2xl font-black cursor-pointer transition-all inline-block uppercase text-xs tracking-widest">
              Select Assets
            </label>
            {uploadedFiles.length > 0 && (
              <button onClick={startAnalysis} className="block w-full mt-8 bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-2xl font-black uppercase text-xs transition-all">
                Run Analysis
              </button>
            )}
          </div>
        ) : isAnalyzing ? (
          <div className="text-center py-40">
            <Loader2 className="animate-spin mx-auto text-blue-500 mb-8" size={80} />
            <h2 className="text-3xl font-black text-white italic tracking-[0.2em] uppercase animate-pulse">Processing Market Intelligence...</h2>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-700">
            {/* Main Result Card */}
            <div className="bg-slate-900/80 backdrop-blur-md rounded-[3rem] p-10 border border-white/10 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-blue-500/20 text-blue-400 px-4 py-1 rounded-full text-[10px] font-black tracking-widest">{analysisResult.ticker}</span>
                </div>
                <h2 className="text-7xl font-black tracking-tighter text-white uppercase">{analysisResult.companyName}</h2>
              </div>
              <div className={`px-16 py-10 rounded-[2.5rem] text-center min-w-[300px] border-2 shadow-2xl ${
                analysisResult.verdict.recommendation.includes('קנייה') ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 
                analysisResult.verdict.recommendation.includes('מכירה') ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-amber-500/10 border-amber-500/50 text-amber-400'
              }`}>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-50 italic">System Verdict</div>
                <div className="text-6xl font-black leading-none">{analysisResult.verdict.recommendation}</div>
              </div>
            </div>

            {/* DCF Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-900 rounded-[3.5rem] p-14 text-white shadow-2xl border border-white/10 relative overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-200 mb-6 italic">Intrinsic Value (DCF Model)</p>
                <h3 className="text-[10rem] font-black tracking-tighter leading-none mb-10">{analysisResult.currency}{analysisResult.dcf.base}</h3>
                <div className="flex gap-4">
                    <div className="bg-white/10 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/10">
                        <span className="font-bold">Margin of Safety: {analysisResult.dcf.marginOfSafety}%</span>
                    </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-8">
                <div className="bg-slate-900/80 rounded-[2.5rem] p-10 border border-white/5 flex-1 flex flex-col justify-center text-center">
                    <div className="text-7xl font-black text-white">{analysisResult.score}/8</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">Pillars Score</div>
                </div>
                <div className="bg-slate-900/80 rounded-[2.5rem] p-10 border border-blue-500/20 flex-1 flex flex-col justify-center italic text-slate-300">
                    <div className="flex items-center gap-2 text-blue-400 mb-3">
                        <Info size={16} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Analyst Note</span>
                    </div>
                    <p className="text-base leading-relaxed">"{analysisResult.verdict.reason}"</p>
                </div>
              </div>
            </div>

            <button onClick={() => setAnalysisResult(null)} className="mt-10 block mx-auto text-slate-600 font-black uppercase text-xs hover:text-white transition-all underline underline-offset-8">New Scan</button>
          </div>
        )}

        {error && (
          <div className="max-w-xl mx-auto mt-10 bg-red-500/10 border border-red-500/20 p-6 rounded-3xl flex items-center gap-4 text-red-400">
            <AlertCircle size={24} />
            <div className="text-sm font-bold uppercase tracking-widest">Critical Error: {error}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
