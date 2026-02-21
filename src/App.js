import React, { useState, useEffect } from 'react';
import { 
  Loader2, AlertCircle, TrendingUp, Info, LayoutDashboard, Database, ShieldCheck, Key 
} from 'lucide-react';

const App = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState(null);
  const [apiKey, setApiKey] = useState(localStorage.getItem('gemini_pro_key') || '');

  // פונקציה להזנת מפתח חדש במידה והנוכחי נחסם
  const updateKey = () => {
    const newKey = prompt("הכנס מפתח API חדש מ-Google AI Studio:");
    if (newKey) {
      localStorage.setItem('gemini_pro_key', newKey);
      setApiKey(newKey);
      window.location.reload();
    }
  };

  const processFile = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      if (file.size > 20 * 1024 * 1024) {
        resolve({ text: `File ${file.name} too large. Rely on Google Search.` });
        return;
      }
      reader.onload = () => resolve({
        inlineData: { data: reader.result.split(',')[1], mimeType: file.type || "application/pdf" }
      });
      reader.readAsDataURL(file);
    });
  };

  const startAnalysis = async () => {
    if (!apiKey) {
      updateKey();
      return;
    }
    if (uploadedFiles.length === 0) return;

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const filesParts = await Promise.all(uploadedFiles.map(file => processFile(file)));
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      
      const promptText = `
        נתח את המסמכים כחוקר מניות בכיר. 
        חובה להשתמש בחיפוש גוגל למחיר מניה (Ticker) ונתונים פיננסיים עדכניים ל-2025/2026.
        בצע ניתוח 8 Pillars וחישוב שווי הוגן DCF.
        החזר אך ורק אובייקט JSON במבנה הבא:
        {
          "companyName": "string",
          "ticker": "string",
          "currency": "string",
          "score": number,
          "pillarsStatus": [{"id": number, "status": "pass/fail", "value": "string"}],
          "dcf": {"conservative": number, "base": number, "optimistic": number, "marketPrice": number, "marginOfSafety": number},
          "verdict": {"recommendation": "קנייה/החזקה/מכירה", "reason": "Hebrew string"},
          "analysisNotes": "Hebrew string"
        }
      `;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }, ...filesParts] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.1 }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "שגיאת תקשורת");

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("המודל לא החזיר JSON תקין. נסה שוב.");

      setAnalysisResult(JSON.parse(jsonMatch[0]));
    } catch (err) {
      setError(err.message.includes('quota') ? "מכסת ה-API הסתיימה. נסה להחליף מפתח." : err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl">
              <TrendingUp className="text-white" size={28} />
            </div>
            <h1 className="text-3xl font-black text-white uppercase italic">Quant<span className="text-blue-500">Terminal</span></h1>
          </div>
          <button onClick={updateKey} className="flex items-center gap-2 bg-slate-900 border border-white/10 px-4 py-2 rounded-xl text-xs hover:bg-slate-800 transition-all">
            <Key size={14} />
            <span>{apiKey ? 'החלף מפתח API' : 'הזן מפתח API'}</span>
          </button>
        </header>

        {!analysisResult && !isAnalyzing ? (
          <div className="max-w-xl mx-auto bg-slate-900/50 p-16 rounded-[3rem] text-center border border-white/5 shadow-2xl">
            <LayoutDashboard className="mx-auto text-blue-500/20 mb-6" size={64} />
            <h2 className="text-2xl font-bold text-white mb-4">מערכת ניתוח 2.0 Pro</h2>
            <p className="text-slate-400 mb-10 text-sm">העלה דוח PDF. המערכת תבצע סריקת שוק ותחשב שווי פנימי.</p>
            
            <input type="file" className="hidden" id="f" onChange={e => setUploadedFiles(Array.from(e.target.files))} multiple />
            <label htmlFor="f" className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-5 rounded-2xl font-black cursor-pointer transition-all inline-block uppercase text-xs">
              בחר קבצים
            </label>

            {uploadedFiles.length > 0 && (
              <button onClick={startAnalysis} className="block w-full mt-6 bg-emerald-600 py-5 rounded-2xl font-black">
                הפעל אנליזה
              </button>
            )}
          </div>
        ) : isAnalyzing ? (
          <div className="text-center py-40">
            <Loader2 className="animate-spin mx-auto text-blue-500 mb-8" size={80} />
            <h2 className="text-3xl font-black text-white italic animate-pulse tracking-widest">EXECUTING ANALYSIS...</h2>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="bg-slate-900 rounded-[3rem] p-10 border border-white/10 flex justify-between items-center">
              <div>
                <span className="text-blue-400 font-bold text-xs tracking-widest uppercase">{analysisResult.ticker}</span>
                <h2 className="text-7xl font-black text-white uppercase tracking-tighter">{analysisResult.companyName}</h2>
              </div>
              <div className="bg-blue-600 px-16 py-10 rounded-[2.5rem] text-center shadow-2xl">
                <div className="text-xs font-bold opacity-60 mb-2 uppercase">Verdict</div>
                <div className="text-5xl font-black">{analysisResult.verdict.recommendation}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-gradient-to-br from-blue-700 to-indigo-950 p-14 rounded-[3.5rem] text-white shadow-3xl">
                <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-8 italic">Intrinsic Value (Base)</p>
                <h3 className="text-[10rem] font-black leading-none">{analysisResult.currency}{analysisResult.dcf.base}</h3>
                <div className="mt-8 flex gap-6">
                    <span className="bg-white/10 px-8 py-4 rounded-2xl font-bold border border-white/10 italic text-xl">Safety: {analysisResult.dcf.marginOfSafety}%</span>
                    <span className="bg-emerald-500/20 px-8 py-4 rounded-2xl font-bold border border-emerald-500/20 text-xl italic text-emerald-400">Market: {analysisResult.currency}{analysisResult.dcf.marketPrice}</span>
                </div>
              </div>
              <div className="bg-slate-900 p-12 rounded-[3rem] border border-white/5 flex flex-col justify-center italic text-slate-300">
                <h4 className="text-blue-400 font-bold text-xs uppercase mb-6 flex items-center gap-2"><Info size={16}/> Analyst Note</h4>
                <p className="text-xl leading-relaxed">"{analysisResult.verdict.reason}"</p>
              </div>
            </div>
            <button onClick={() => setAnalysisResult(null)} className="mx-auto block text-slate-600 underline text-xs font-bold uppercase tracking-[0.3em] hover:text-white transition-all">New Scan</button>
          </div>
        )}

        {error && (
          <div className="max-w-xl mx-auto mt-12 bg-red-500/10 border border-red-500/20 p-8 rounded-3xl flex items-center gap-6 text-red-400">
            <AlertCircle size={32} />
            <div className="text-sm font-bold uppercase tracking-wide">
              {error}
              <button onClick={updateKey} className="block mt-2 underline opacity-80">נסה להחליף מפתח API</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
