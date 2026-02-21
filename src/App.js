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
      // הגנה מפני קבצי ענק (כמו ה-10K של SoFi) - אם הקובץ מעל 10MB נשלח רק הודעה ל-AI שיחפש לבד
      if (file.size > 10 * 1024 * 1024) {
        resolve({ text: `File ${file.name} is too large for upload. Use Google Search for its 2025 financials.` });
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
      
      // הכתובת המדויקת והיציבה ביותר
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      
      const promptText = `
        Analyze the attached financial documents. Use Google Search for the current stock price.
        Identify company, ticker, and currency (₪ or $).
        Perform 8 Pillars analysis and 10Y DCF.
        Provide a final recommendation (קנייה/החזקה/מכירה) with a strategic reason in Hebrew.
        
        Return ONLY a JSON object with this structure:
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
          tools: [{ google_search: {} }], // הפעלת חיפוש גוגל
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json" // זה מונע את ה"דף הלבן" - מבטיח JSON נקי
          }
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Connection Error");

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("No data returned from AI");
      
      setAnalysisResult(JSON.parse(rawText));
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050a14] text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden" dir="rtl">
      
      {/* באנר קבוע - מבנה נתונים אידיאלי */}
      <div className="sticky top-0 z-50 bg-[#0a1224]/90 backdrop-blur-xl border-b border-blue-500/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 shrink-0">
            <Database className="text-blue-400" size={18} />
            <span className="font-black text-xs text-blue-400 uppercase tracking-tighter">DATA STRUCTURE:</span>
          </div>
          <div className="flex gap-8 text-[10px] font-bold text-slate-400 shrink-0 uppercase">
            <span><b className="text-blue-200">Earnings Transcript:</b> סנטימנט וצמיחה</span>
            <span><b className="text-blue-200">10-K / 10-Q:</b> יציבות וחוב</span>
            <span><b className="text-blue-200">Investor Deck:</b> חזון ואסטרטגיה</span>
          </div>
          <div className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-[9px] font-black border border-blue-500/20 shrink-0">
            SEC & TASE LIVE SCAN
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-12 pb-24">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
              <TrendingUp className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-black italic tracking-tighter text-white uppercase leading-none">WallStreet <span className="text-blue-500 text-2xl">AI</span></h1>
              <p className="text-[10px] font-bold text-blue-400/60 tracking-[0.4em] uppercase mt-1">Professional Analyst Terminal</p>
            </div>
          </div>
          <button onClick={() => {localStorage.removeItem('finance_analyst_key'); window.location.reload();}} className="p-3 hover:bg-white/5 rounded-full border border-white/5">
            <Key size={18} className="text-slate-500" />
          </button>
        </header>

        {!analysisResult && !isAnalyzing ? (
          <div className="max-w-xl mx-auto bg-[#0a1224]/60 backdrop-blur-md p-16 rounded-[3.5rem] text-center border border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <LayoutDashboard className="mx-auto text-blue-500/30 mb-8" size={64} />
            <h2 className="text-3xl font-bold text-white mb-4">ניתוח נכס חכם</h2>
            <p className="text-slate-400 mb-12 text-sm leading-relaxed italic">העלה דוח שנתי, מצגת או תמליל שיחה.<br/>המערכת תבצע סריקת סנטימנט, חילוץ נתונים וחישוב שווי הוגן.</p>
            
            <input type="file" className="hidden" id="f" onChange={e => setUploadedFiles(Array.from(e.target.files))} multiple />
            <label htmlFor="f" className="bg-blue-600 text-white px-12 py-5 rounded-2xl font-black cursor-pointer hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40 inline-block uppercase text-xs tracking-widest">
              Select Documents
            </label>
            
            {uploadedFiles.length > 0 && (
              <button onClick={startAnalysis} className="block w-full mt-10 bg-emerald-600 text-white py-5 rounded-2xl font-black hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-900/40 uppercase text-xs">
                Launch Intelligence Suite
              </button>
            )}
          </div>
        ) : isAnalyzing ? (
          <div className="text-center py-40">
            <Loader2 className="animate-spin mx-auto text-blue-500 mb-8" size={80} />
            <h2 className="text-3xl font-black text-white italic tracking-[0.2em] uppercase animate-pulse">Running Terminal Protocols...</h2>
            <p className="text-blue-400/40 mt-4 font-mono text-[10px] uppercase tracking-widest">Scanning Tickers | Analyzing 10-K Data | Fetching Market Prices</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in zoom-in duration-1000">
            {/* כרטיס המלצה */}
            <div className="bg-[#0a1224]/80 backdrop-blur-md rounded-[3rem] p-10 border border-white/10 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-blue-500/20 text-blue-400 px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase border border-blue-500/20">{analysisResult.ticker}</span>
                  <span className="text-emerald-500 font-mono text-[10px] uppercase tracking-widest animate-pulse">● Market Data Connected</span>
                </div>
                <h2 className="text-7xl font-black tracking-tighter text-white uppercase">{analysisResult.companyName}</h2>
              </div>
              <div className={`px-16 py-10 rounded-[2.5rem] text-center min-w-[320px] shadow-2xl border-2 ${
                analysisResult.verdict.recommendation.includes('קנייה') ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400' : 
                analysisResult.verdict.recommendation.includes('מכירה') ? 'bg-red-600/20 border-red-500/50 text-red-400' : 'bg-amber-600/20 border-amber-500/50 text-amber-400'
              }`}>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-60 italic tracking-tighter">Analyst Verdict</div>
                <div className="text-6xl font-black leading-none tracking-tighter uppercase">{analysisResult.verdict.recommendation}</div>
              </div>
            </div>

            {/* כרטיס DCF */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 via-blue-800 to-indigo-950 rounded-[3.5rem] p-14 text-white shadow-2xl relative overflow-hidden border border-white/10">
                <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12"><TrendingUp size={200} /></div>
                <p className="text-[11px] font-black uppercase tracking-[0.5em] text-blue-200 mb-6 italic opacity-70">Fair Value Calculation (DCF)</p>
                <h3 className="text-[10rem] font-black tracking-tighter leading-none mb-10">{analysisResult.currency}{analysisResult.dcf.base}</h3>
                <div className="bg-white/10 backdrop-blur-md px-10 py-5 rounded-3xl border border-white/10 inline-block shadow-2xl">
                  <span className="text-3xl font-black tracking-tight uppercase">MOS: {analysisResult.dcf.marginOfSafety}%</span>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-[#0a1224]/80 backdrop-blur-md rounded-[2.5rem] p-10 border border-white/5 text-center flex flex-col justify-center h-1/2 shadow-xl">
                   <div className="text-8xl font-black text-white leading-none">{analysisResult.score}<span className="text-2xl opacity-20">/8</span></div>
                   <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mt-4 italic">8 Pillars Score</div>
                </div>
                <div className="bg-[#0a1224]/80 backdrop-blur-md rounded-[2.5rem] p-10 border border-blue-500/20 flex-1 flex flex-col justify-center italic text-slate-300 shadow-xl">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4 flex items-center gap-2 underline decoration-blue-500/30">
                     <Info size={14}/> Analyst Note
                   </h4>
                   <p className="text-base font-medium leading-relaxed italic">"{analysisResult.verdict.reason}"</p>
                </div>
              </div>
            </div>

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

            <button onClick={() => setAnalysisResult(null)} className="mt-20 block mx-auto text-slate-600 font-black uppercase text-[10px] tracking-[0.4em] hover:text-white transition-all underline underline-offset-8 decoration-blue-500">Analyze New Asset</button>
          </div>
        )}

        {error && (
          <div className="max-w-xl mx-auto mt-10 bg-red-500/10 border border-red-500/30 p-8 rounded-[2.5rem] flex items-center gap-6 text-red-400 shadow-3xl">
            <AlertCircle size={32} />
            <div className="text-sm font-black uppercase tracking-widest leading-relaxed italic">Model Sync Error: {error}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
