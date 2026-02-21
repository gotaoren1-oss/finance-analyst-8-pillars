import React, { useState, useEffect } from 'react';
import { 
  Loader2, CheckCircle2, XCircle, Files, Key, AlertCircle, TrendingUp, Info, LayoutDashboard, Database
} from 'lucide-react';

const App = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState(null);

  // פונקציית עזר לחילוץ JSON בטוח
  const safeJsonParse = (str) => {
    try {
      const jsonMatch = str.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("JSON Parsing Error:", e);
      return null;
    }
  };

  const getApiKey = () => {
    let key = localStorage.getItem('finance_analyst_key');
    if (!key) {
      key = prompt("הכנס מפתח API של Gemini (מתחיל ב-AIza):");
      if (key) localStorage.setItem('finance_analyst_key', key);
    }
    return key;
  };

  const processFile = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      // אם הקובץ גדול מ-10MB, אנחנו נשלח רק את השם שלו וניתן ל-AI לחפש בגוגל כדי למנוע קריסה
      if (file.size > 10 * 1024 * 1024) {
        resolve({ text: `File: ${file.name} (Too large for direct upload). Please use Google Search to analyze ${file.name} financials.` });
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
      if (!apiKey) throw new Error("חסר מפתח API");

      const filesParts = await Promise.all(uploadedFiles.map(file => processFile(file)));
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      
      const promptText = `Analyze the attached financial documents. Identify company, ticker, and currency. 
      Perform 8 Pillars and 10Y DCF. Use Google Search for current price.
      Provide a final recommendation (קנייה/החזקה/מכירה) with a clear reason.
      Return ONLY a JSON object in Hebrew:
      {
        "companyName": "...", "ticker": "...", "currency": "...", "score": 0,
        "pillarsStatus": [{"id": 1, "status": "pass", "value": "..."}],
        "dcf": {"conservative": 0, "base": 0, "optimistic": 0, "marketPrice": 0, "marginOfSafety": 0},
        "verdict": {"recommendation": "קנייה/מכירה", "reason": "..."},
        "analysisNotes": "..."
      }`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }, ...filesParts] }],
          tools: [{ "google_search": {} }]
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "שגיאה בשרת");

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const result = safeJsonParse(rawText);

      if (!result) throw new Error("ה-AI החזיר תשובה לא תקינה. נסה שוב או העלה קובץ פשוט יותר.");
      setAnalysisResult(result);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050a14] text-slate-200 font-sans relative overflow-x-hidden" dir="rtl">
      
      {/* באנר קבוע - דרישת המערכת */}
      <div className="sticky top-0 z-50 bg-[#0a1224]/90 backdrop-blur-xl border-b border-blue-500/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <Database className="text-blue-400" size={18} />
            <span className="font-black text-xs text-blue-400 uppercase tracking-tighter">DATA ARCHITECTURE:</span>
          </div>
          <div className="flex gap-8 text-[10px] font-bold text-slate-400 shrink-0 uppercase">
            <span><b className="text-blue-200">Earnings Transcript:</b> סנטימנט ותחזיות</span>
            <span><b className="text-blue-200">10-K / 10-Q:</b> חוסן פיננסי וחוב</span>
            <span><b className="text-blue-200">Investor Deck:</b> אסטרטגיה וחזון</span>
            <span><b className="text-blue-200">8-K:</b> אירועי קצה</span>
          </div>
          <div className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-[9px] font-black border border-blue-500/20 shrink-0">
            SENTIMENT ANALYSIS ACTIVE
          </div>
        </div>
      </div>

      {/* תמונת רקע וול סטריט */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
        <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070" alt="Wall St" className="w-full h-full object-cover grayscale" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050a14] via-transparent to-[#050a14]"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-16 pb-24">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
              <TrendingUp className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-black italic tracking-tighter text-white">WALL STREET <span className="text-blue-500 underline decoration-blue-500/30">AI</span></h1>
              <p className="text-[10px] font-bold text-blue-400/60 tracking-[0.3em] uppercase">Premium Asset Terminal</p>
            </div>
          </div>
          <button onClick={() => {localStorage.removeItem('finance_analyst_key'); window.location.reload();}} className="p-3 hover:bg-white/5 rounded-full transition-all border border-white/5">
            <Key size={20} className="text-slate-500" />
          </button>
        </header>

        {!analysisResult && !isAnalyzing ? (
          <div className="max-w-xl mx-auto bg-[#0a1224]/60 backdrop-blur-md p-16 rounded-[3rem] text-center border border-white/5 shadow-2xl">
            <LayoutDashboard className="mx-auto text-blue-500/30 mb-8" size={64} />
            <h2 className="text-3xl font-bold text-white mb-4">הזן נתוני שוק</h2>
            <p className="text-slate-400 mb-12 text-sm leading-relaxed">העלה דוחות שנתיים, מצגות משקיעים או תמלילי שיחות רבעוניים לניתוח סנטימנט ו-DCF עמוק.</p>
            
            <input type="file" className="hidden" id="f" onChange={e => setUploadedFiles(Array.from(e.target.files))} multiple />
            <label htmlFor="f" className="bg-blue-600 text-white px-12 py-5 rounded-2xl font-black cursor-pointer hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40 inline-block uppercase text-xs tracking-widest">
              Upload / Select Assets
            </label>
            
            {uploadedFiles.length > 0 && (
              <button onClick={startAnalysis} className="block w-full mt-10 bg-emerald-600 text-white py-5 rounded-2xl font-black hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/40 uppercase text-xs tracking-widest">
                Run Professional Analysis
              </button>
            )}
          </div>
        ) : isAnalyzing ? (
          <div className="text-center py-40">
            <Loader2 className="animate-spin mx-auto text-blue-500 mb-8" size={80} />
            <h2 className="text-3xl font-black text-white italic tracking-[0.2em] uppercase animate-pulse">Processing Market Intelligence...</h2>
            <p className="text-blue-400/40 mt-4 font-mono text-xs uppercase">Reading 10-K / Performing Sentiment Analysis / Calculating Risk</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in zoom-in duration-700">
            
            {/* Recommendation Banner */}
            <div className="bg-[#0a1224]/80 backdrop-blur-md rounded-[3rem] p-10 border border-white/10 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-blue-500/20 text-blue-400 px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border border-blue-500/20">{analysisResult.ticker}</span>
                  <span className="text-emerald-500 font-mono text-[10px] uppercase tracking-widest animate-pulse">● System Live</span>
                </div>
                <h2 className="text-7xl font-black tracking-tighter text-white uppercase">{analysisResult.companyName}</h2>
              </div>
              <div className={`px-16 py-10 rounded-[2.5rem] text-center min-w-[300px] shadow-2xl border-2 ${
                analysisResult.verdict.recommendation.includes('קנייה') ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400' : 
                analysisResult.verdict.recommendation.includes('מכירה') ? 'bg-red-600/20 border-red-500/50 text-red-400' : 'bg-amber-600/20 border-amber-500/50 text-amber-400'
              }`}>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-60 italic">AI Final Verdict</div>
                <div className="text-6xl font-black leading-none tracking-tighter">{analysisResult.verdict.recommendation}</div>
              </div>
            </div>

            {/* DCF & Pillars Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-blue-900 rounded-[3rem] p-14 text-white shadow-2xl relative overflow-hidden border border-white/10">
                <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12"><TrendingUp size={200} /></div>
                <p className="text-xs font-black uppercase tracking-[0.4em] text-blue-200 mb-6 italic">Intrinsic Fair Value (10Y DCF)</p>
                <h3 className="text-[10rem] font-black tracking-tighter leading-none mb-10">{analysisResult.currency}{analysisResult.dcf.base}</h3>
                <div className="flex flex-wrap gap-4 mt-8">
                   <div className="bg-white/10 backdrop-blur-md px-10 py-4 rounded-3xl border border-white/10">
                     <span className="text-3xl font-black tracking-tight">MOS: {analysisResult.dcf.marginOfSafety}%</span>
                   </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-[#0a1224]/80 backdrop-blur-md rounded-[2.5rem] p-10 border border-white/5 text-center flex flex-col justify-center h-1/2">
                   <div className="text-7xl font-black text-white">{analysisResult.score}<span className="text-2xl opacity-20">/8</span></div>
                   <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-2">Pillars Stability Score</div>
                </div>
                <div className="bg-[#0a1224]/80 backdrop-blur-md rounded-[2.5rem] p-10 border border-blue-500/20 flex-1 flex flex-col justify-center italic">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2">
                     <Info size={14}/> Intelligence Note
                   </h4>
                   <p className="text-base leading-relaxed text-slate-300 font-medium">"{analysisResult.verdict.reason}"</p>
                </div>
              </div>
            </div>

            {/* Pillars Detail */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {analysisResult.pillarsStatus.map(s => (
                <div key={s.id} className="bg-[#0a1224]/40 backdrop-blur-sm p-6 rounded-3xl border border-white/5 flex items-center gap-4 hover:border-blue-500/30 transition-all group">
                  <div className={`p-2 rounded-lg ${s.status === 'pass' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                    {s.status === 'pass' ? <CheckCircle2 className="text-emerald-500" size={18}/> : <XCircle className="text-red-500" size={18}/>}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase leading-tight group-hover:text-white transition-colors">{s.value}</span>
                </div>
              ))}
            </div>

            <button onClick={() => setAnalysisResult(null)} className="mt-20 block mx-auto text-slate-600 font-black tracking-[0.3em] uppercase text-[10px] hover:text-white transition-all underline underline-offset-8">Analyze Next Asset</button>
          </div>
        )}

        {error && (
          <div className="max-w-xl mx-auto mt-10 bg-red-500/10 border border-red-500/20 p-6 rounded-3xl flex items-center gap-4 text-red-400 shadow-2xl">
            <AlertCircle size={24} />
            <div className="text-sm font-bold">CRITICAL ERROR: {error}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
