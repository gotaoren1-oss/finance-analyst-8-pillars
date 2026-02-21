import React, { useState } from 'react';
import { Loader2, Key, AlertCircle, TrendingUp, Info, LayoutDashboard, Database } from 'lucide-react';

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
      // צמצום קבצים ל-15MB כדי לא לחנוק את המכסה של ה-Tokens
      if (file.size > 15 * 1024 * 1024) {
        resolve({ text: `File ${file.name} is too big. Search online for its 2025/2026 stats.` });
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
      
      // שימוש ב-1.5 Flash - המודל היחיד שיעבוד לך עכשיו ברציפות
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      
      const promptText = `
        נתח את המסמכים המצורפים כאנליסט פיננסי.
        1. בצע חיפוש Google Search למחיר מניה עדכני.
        2. חשב שווי הוגן DCF וציון 8 Pillars.
        3. החזר תשובה בעברית (קנייה/החזקה/מכירה).

        חובה להחזיר JSON בלבד במבנה:
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
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (data.error?.message?.includes('quota')) {
          throw new Error("גוגל חסמה את המודל לזמן קצר. נסה להעלות קובץ קטן יותר או להמתין 5 דקות.");
        }
        throw new Error(data.error?.message || "שגיאת תקשורת");
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
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-8" dir="rtl">
      <header className="max-w-6xl mx-auto flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-blue-500" size={32} />
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">WallStreet <span className="text-blue-500">AI</span></h1>
        </div>
        <div className="text-[10px] font-mono text-slate-500">Mode: Stable (1.5 Flash)</div>
      </header>

      {!analysisResult && !isAnalyzing ? (
        <div className="max-w-xl mx-auto bg-slate-900/50 p-12 rounded-[2.5rem] text-center border border-white/5">
          <LayoutDashboard className="mx-auto text-blue-500/20 mb-6" size={60} />
          <h2 className="text-2xl font-bold text-white mb-6">התחל ניתוח חדש</h2>
          <input type="file" className="hidden" id="f" onChange={e => setUploadedFiles(Array.from(e.target.files))} multiple />
          <label htmlFor="f" className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-xl font-bold cursor-pointer transition-all inline-block text-sm">
            בחר דוחות (PDF)
          </label>
          {uploadedFiles.length > 0 && (
            <button onClick={startAnalysis} className="block w-full mt-6 bg-emerald-600 py-4 rounded-xl font-bold">
              הפעל אנליזה
            </button>
          )}
        </div>
      ) : isAnalyzing ? (
        <div className="text-center py-24">
          <Loader2 className="animate-spin mx-auto text-blue-500 mb-6" size={64} />
          <h2 className="text-xl font-bold animate-pulse uppercase italic">מנתח נתוני שוק...</h2>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/10 flex justify-between items-center">
            <div>
                <span className="text-blue-400 text-xs font-bold tracking-widest">{analysisResult.ticker}</span>
                <h2 className="text-5xl font-black text-white uppercase">{analysisResult.companyName}</h2>
            </div>
            <div className="bg-blue-600 p-8 rounded-2xl text-center">
                <div className="text-xs opacity-70 uppercase font-bold mb-1">Verdict</div>
                <div className="text-4xl font-black">{analysisResult.verdict.recommendation}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-700 to-indigo-900 p-10 rounded-[2.5rem] text-white">
                <div className="text-xs font-bold opacity-60 uppercase mb-4">Fair Value (DCF)</div>
                <div className="text-8xl font-black">{analysisResult.currency}{analysisResult.dcf.base}</div>
                <div className="mt-4 text-xl opacity-80">Safety Margin: {analysisResult.dcf.marginOfSafety}%</div>
            </div>
            <div className="bg-slate-900 p-10 rounded-[2.5rem] border border-white/10 italic">
                <div className="flex items-center gap-2 text-blue-400 mb-4 font-bold uppercase text-xs"><Info size={16}/> Analyst Note</div>
                <p className="text-lg leading-relaxed text-slate-300">"{analysisResult.verdict.reason}"</p>
            </div>
          </div>
          <button onClick={() => setAnalysisResult(null)} className="block mx-auto text-slate-500 underline text-sm pt-8">ניתוח נוסף</button>
        </div>
      )}

      {error && (
        <div className="max-w-xl mx-auto mt-8 bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-center gap-4 text-red-400">
          <AlertCircle size={24} />
          <div className="text-sm font-bold">{error}</div>
        </div>
      )}
    </div>
  );
};

export default App;
