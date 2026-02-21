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
      key = prompt("הכנס מפתח API של Gemini (מ-Google AI Studio):");
      if (key) localStorage.setItem('finance_analyst_key', key);
    }
    return key;
  };

  const processFile = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      if (file.size > 10 * 1024 * 1024) {
        resolve({ text: `File: ${file.name} is too large. Identify company and use search.` });
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
      if (!apiKey) throw new Error("מפתח API חסר");

      const filesParts = await Promise.all(uploadedFiles.map(file => processFile(file)));
      
      // שינוי ל-v1 ושימוש במודל יציב
      const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      
      const promptText = `
        נתח את המסמכים המצורפים עבור חברה ציבורית.
        השתמש בחיפוש גוגל למחיר מניה עדכני.
        החזר אך ורק אובייקט JSON תקני בעברית עם המבנה הבא:
        {
          "companyName": "שם החברה",
          "ticker": "TICKER",
          "currency": "₪ או $",
          "score": 0-8,
          "pillarsStatus": [{"id": 1, "status": "pass/fail", "value": "הסבר"}],
          "dcf": {"conservative": 0, "base": 0, "optimistic": 0, "marketPrice": 0, "marginOfSafety": 0},
          "verdict": {"recommendation": "קנייה/החזקה/מכירה", "reason": "נימוק אסטרטגי"},
          "analysisNotes": "סיכום האנליסט"
        }
      `;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }, ...filesParts] }]
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        // אם המודל לא נמצא, נסה את הגרסה החלופית (v1beta)
        throw new Error(data.error?.message || "שגיאה ב-API");
      }

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("ה-AI לא החזיר מבנה נתונים תקין.");
      
      setAnalysisResult(JSON.parse(jsonMatch[0]));
    } catch (err) {
      setError("שגיאה: " + err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050a14] text-slate-200 font-sans" dir="rtl">
      {/* באנר המבנה האידיאלי */}
      <div className="sticky top-0 z-50 bg-[#0a1224]/90 backdrop-blur-xl border-b border-blue-500/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <Database className="text-blue-400" size={18} />
            <span className="font-black text-xs text-blue-400">DATA STRUCTURE:</span>
          </div>
          <div className="flex gap-8 text-[10px] font-bold text-slate-400 shrink-0">
            <span><b>Earnings Transcript:</b> סנטימנט גבוה</span>
            <span><b>10-K / 10-Q:</b> יציבות פיננסית</span>
            <span><b>Investor Deck:</b> חזון ואסטרטגיה</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-24">
        {/* Header */}
        <header className="flex justify-between items-center mb-20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg">
              <TrendingUp className="text-white" size={32} />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase">WallStreet AI</h1>
          </div>
          <button onClick={() => {localStorage.removeItem('finance_analyst_key'); window.location.reload();}} className="p-2 border border-white/5 rounded-full"><Key size={20}/></button>
        </header>

        {!analysisResult && !isAnalyzing ? (
          <div className="max-w-xl mx-auto bg-[#0a1224]/60 backdrop-blur-md p-16 rounded-[3rem] text-center border border-white/10 shadow-2xl">
            <LayoutDashboard className="mx-auto text-blue-500/30 mb-8" size={64} />
            <h2 className="text-3xl font-bold text-white mb-4 italic">העלה דוח לניתוח</h2>
            <p className="text-slate-400 mb-10 text-sm">העלה דוחות של SoFi, תדיראן או כל חברה אחרת.</p>
            <input type="file" className="hidden" id="f" onChange={e => setUploadedFiles(Array.from(e.target.files))} multiple />
            <label htmlFor="f" className="bg-blue-600 text-white px-12 py-5 rounded-2xl font-black cursor-pointer hover:bg-blue-500 inline-block uppercase text-xs">Upload Assets</label>
            {uploadedFiles.length > 0 && (
              <button onClick={startAnalysis} className="block w-full mt-8 bg-emerald-600 text-white py-5 rounded-2xl font-black italic">Execute Analysis</button>
            )}
          </div>
        ) : isAnalyzing ? (
          <div className="text-center py-40 animate-pulse">
            <Loader2 className="animate-spin mx-auto text-blue-500 mb-8" size={80} />
            <h2 className="text-3xl font-black text-white italic tracking-[0.2em] uppercase">Reading Market Data...</h2>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-700">
            {/* תוצאות האנליזה */}
            <div className="bg-[#0a1224]/80 backdrop-blur-md rounded-[3rem] p-10 border border-white/10 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4 text-blue-400 font-bold uppercase tracking-widest text-xs">
                  <span>{analysisResult.ticker}</span>
                  <span className="opacity-30">|</span>
                  <span>System Analysis Live</span>
                </div>
                <h2 className="text-7xl font-black tracking-tighter text-white">{analysisResult.companyName}</h2>
              </div>
              <div className={`px-16 py-10 rounded-[2.5rem] text-center min-w-[300px] shadow-2xl border-2 ${
                analysisResult.verdict.recommendation.includes('קנייה') ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400' : 
                analysisResult.verdict.recommendation.includes('מכירה') ? 'bg-red-600/20 border-red-500/50 text-red-400' : 'bg-amber-600/20 border-amber-500/50 text-amber-400'
              }`}>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-60 italic">Verdict</div>
                <div className="text-6xl font-black tracking-tighter leading-none">{analysisResult.verdict.recommendation}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-blue-900 rounded-[3rem] p-14 text-white shadow-2xl border border-white/10">
                <p className="text-xs font-black uppercase tracking-[0.4em] text-blue-200 mb-4 italic">Intrinsic Fair Value (DCF)</p>
                <h3 className="text-[10rem] font-black tracking-tighter leading-none mb-10">{analysisResult.currency}{analysisResult.dcf.base}</h3>
                <div className="bg-white/10 backdrop-blur-md px-10 py-4 rounded-3xl border border-white/10 inline-block">
                  <span className="text-3xl font-black">Margin of Safety: {analysisResult.dcf.marginOfSafety}%</span>
                </div>
              </div>
              <div className="space-y-8">
                <div className="bg-[#0a1224]/80 backdrop-blur-md rounded-[2.5rem] p-10 border border-white/5 text-center flex flex-col justify-center h-1/2">
                   <div className="text-7xl font-black text-white">{analysisResult.score}/8</div>
                   <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">Pillars Score</div>
                </div>
                <div className="bg-[#0a1224]/80 backdrop-blur-md rounded-[2.5rem] p-10 border border-blue-500/20 flex-1 italic text-slate-300">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4">Analyst Summary</h4>
                   <p className="text-base font-medium">"{analysisResult.verdict.reason}"</p>
                </div>
              </div>
            </div>
            <button onClick={() => setAnalysisResult(null)} className="mt-10 block mx-auto text-slate-600 font-black uppercase text-xs underline underline-offset-8">New Analysis</button>
          </div>
        )}

        {error && (
          <div className="max-w-xl mx-auto mt-10 bg-red-500/10 border border-red-500/20 p-6 rounded-3xl flex items-center gap-4 text-red-400 shadow-2xl">
            <AlertCircle size={24} />
            <div className="text-sm font-bold uppercase tracking-widest">Error: {error}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
