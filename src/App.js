import React, { useState } from 'react';
import { 
  Loader2, AlertCircle, TrendingUp, Info, LayoutDashboard, Database, ShieldCheck 
} from 'lucide-react';

const App = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState(null);

  const API_KEY = "AIzaSyB270SKgNHn0lpP2Qvjy7KG5yKRwvSfDJM";

  const processFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      if (file.size > 20 * 1024 * 1024) {
        resolve({ text: `File ${file.name} is large. Use search for its data.` });
        return;
      }
      reader.onload = () => {
        try {
          const base64Data = reader.result.split(',')[1];
          resolve({ inlineData: { data: base64Data, mimeType: file.type || "application/pdf" } });
        } catch (e) { reject(e); }
      };
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
      
      // שימוש ב-Gemini 2.0 Flash - הדגם החדש ביותר
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
      
      const promptText = `
        נתח את המסמכים כחוקר מניות. 
        1. חובה להשתמש בחיפוש גוגל למחיר מניה ונתוני שוק עדכניים.
        2. בצע ניתוח 8 Pillars וחישוב DCF.
        
        החזר אך ורק אובייקט JSON נקי ללא טקסט לפני או אחרי, במבנה הבא:
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
          tools: [{ google_search: {} }], // חיפוש גוגל פעיל
          generationConfig: {
            temperature: 0.2 // טמפרטורה נמוכה לדיוק ב-JSON
            // הסרנו את responseMimeType כדי למנוע את השגיאה
          }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Communication Error");

      let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      // פונקציית ניקוי ל-JSON: מחפשת את ה- { הראשון וה- } האחרון
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("המודל לא החזיר מבנה נתונים תקין.");
      
      const cleanJson = JSON.parse(jsonMatch[0]);
      setAnalysisResult(cleanJson);

    } catch (err) {
      console.error(err);
      setError(err.message.includes('quota') ? "חריגה ממכסת ה-API. גוגל מגבילה את המודל החדש בגרסה החינמית." : err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-16 border-b border-white/5 pb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg">
              <TrendingUp className="text-white" size={28} />
            </div>
            <h1 className="text-3xl font-black italic text-white uppercase tracking-tighter">Quant<span className="text-blue-500">Terminal</span></h1>
          </div>
          <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-full border border-white/5">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gemini 2.0 Flash Online</span>
          </div>
        </header>

        {!analysisResult && !isAnalyzing ? (
          <div className="max-w-xl mx-auto bg-slate-900/40 p-16 rounded-[3rem] text-center border border-white/10 shadow-2xl">
            <LayoutDashboard className="mx-auto text-blue-500/20 mb-6" size={64} />
            <h2 className="text-2xl font-bold text-white mb-4">מנוע ניתוח מניות</h2>
            <p className="text-slate-400 mb-10 text-sm italic">העלה דוח כספי (PDF). המערכת תבצע חיפוש שוק ותחשב שווי הוגן.</p>
            
            <input type="file" className="hidden" id="f" onChange={e => setUploadedFiles(Array.from(e.target.files))} multiple />
            <label htmlFor="f" className="bg-blue-600 hover:bg-blue-500 text-white px-12 py-5 rounded-2xl font-black cursor-pointer transition-all inline-block uppercase text-xs tracking-widest">
              בחר קבצים
            </label>

            {uploadedFiles.length > 0 && (
              <button onClick={startAnalysis} className="block w-full mt-8 bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-2xl font-black transition-all">
                הפעל אנליזה
              </button>
            )}
          </div>
        ) : isAnalyzing ? (
          <div className="text-center py-40">
            <Loader2 className="animate-spin mx-auto text-blue-500 mb-8" size={80} />
            <h2 className="text-3xl font-black text-white italic animate-pulse">Scanning Market Data...</h2>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-slate-900 rounded-[3rem] p-10 border border-white/10 flex flex-col md:flex-row justify-between items-center gap-10">
              <div>
                <span className="text-blue-400 font-bold text-xs">{analysisResult.ticker}</span>
                <h2 className="text-6xl font-black text-white uppercase">{analysisResult.companyName}</h2>
              </div>
              <div className={`px-16 py-8 rounded-[2rem] text-center border-2 ${
                analysisResult.verdict.recommendation.includes('קנייה') ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-red-500/10 border-red-500/50 text-red-400'
              }`}>
                <div className="text-xs uppercase font-bold opacity-50 mb-1 tracking-widest">Verdict</div>
                <div className="text-4xl font-black">{analysisResult.verdict.recommendation}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-gradient-to-br from-blue-700 to-indigo-950 p-12 rounded-[3.5rem] text-white border border-white/10 shadow-2xl">
                <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-6 italic">Intrinsic Fair Value (DCF)</p>
                <h3 className="text-[9rem] font-black leading-none">{analysisResult.currency}{analysisResult.dcf.base}</h3>
                <div className="mt-8 flex gap-4">
                    <div className="bg-white/10 px-6 py-3 rounded-xl border border-white/10 font-bold italic">Safety: {analysisResult.dcf.marginOfSafety}%</div>
                    <div className="bg-white/10 px-6 py-3 rounded-xl border border-white/10 font-bold italic">Market: {analysisResult.currency}{analysisResult.dcf.marketPrice}</div>
                </div>
              </div>
              
              <div className="bg-slate-900 p-10 rounded-[3rem] border border-white/5 flex flex-col justify-center italic text-slate-300">
                <h4 className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase mb-4"><Info size={16}/> Analyst Insight</h4>
                <p className="text-lg leading-relaxed">"{analysisResult.verdict.reason}"</p>
              </div>
            </div>

            <button onClick={() => setAnalysisResult(null)} className="mx-auto block text-slate-500 underline text-xs font-bold uppercase tracking-widest">New Session</button>
          </div>
        )}

        {error && (
          <div className="max-w-xl mx-auto mt-10 bg-red-500/10 border border-red-500/20 p-8 rounded-3xl flex items-center gap-4 text-red-400">
            <AlertCircle size={32} />
            <div className="text-sm font-bold tracking-wide leading-relaxed">
              <span className="block uppercase text-[10px] opacity-60 mb-1">System Error</span>
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
