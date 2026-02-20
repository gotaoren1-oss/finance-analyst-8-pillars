import React, { useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  BarChart3, 
  ShieldCheck, 
  Activity, 
  Layers, 
  Wallet, 
  Percent,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  X,
  Files
} from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState('pillars');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState(null);

  // פונקציה לקבלת המפתח בצורה מאובטחת
  const getApiKey = () => {
    let key = localStorage.getItem('my_gemini_key');
    if (!key) {
      key = prompt("נא להזין מפתח API של Gemini (לשימוש בכלי החיפוש):");
      if (key) localStorage.setItem('my_gemini_key', key);
    }
    return key;
  };

  const processFileContent = (text, maxChars) => {
    const lines = text.split('\n');
    const filtered = lines.filter(line => {
      const hasNumber = /\d/.test(line);
      const isFin = /revenue|profit|income|debt|cash|roic|fcf|equity|shares|eps|margin|ebitda|asset|liability/i.test(line);
      return hasNumber && isFin;
    });
    return filtered.join(' ').replace(/\s\s+/g, ' ').slice(0, maxChars);
  };

  const readAllFiles = async (files) => {
    const totalLimit = 4000;
    const limitPerFile = Math.floor(totalLimit / files.length);

    const contents = await Promise.all(
      files.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(`[FILE: ${file.name}]\n${processFileContent(e.target.result, limitPerFile)}`);
          reader.readAsText(file);
        });
      })
    );
    return contents.join('\n\n');
  };

  const callGemini = async (prompt, useSearch = false) => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("מפתח API חסר");

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { 
        temperature: 0.1, // הורדנו טמפרטורה לדיוק מקסימלי בנתונים
        topP: 0.8,
        topK: 40
      }
    };

    // שימוש ב-Google Search רק אם נדרש
    if (useSearch) {
      payload.tools = [{ "google_search": {} }];
    }

    // שימוש במודל gemini-2.5-flash שנמצא ברשימה שלך
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json();
      if (response.status === 401) {
        localStorage.removeItem('my_gemini_key');
        throw new Error("המפתח לא תקין או פג תוקף. המפתח נמחק, נסה לרענן ולהזין שוב.");
      }
      throw new Error(errData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("ה-AI לא החזיר פורמט נתונים תקין. נסה שוב.");
    return JSON.parse(jsonMatch[0]);
  };

  const startAnalysis = async () => {
    if (uploadedFiles.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const combinedData = await readAllFiles(uploadedFiles);
      
      const searchPrompt = `Find the stock ticker and current market price for the company mentioned in these files: ${uploadedFiles.map(f=>f.name).join(', ')}. 
      Find 5Y average P/E and P/FCF. Return ONLY JSON: {"ticker": "string", "currentPrice": number, "avgPE": number, "avgPFCF": number, "companyName": "Hebrew Name"}`;
      
      const marketData = await callGemini(searchPrompt, true);

      const analysisPrompt = `DATA: ${combinedData}
      MARKET: ${JSON.stringify(marketData)}
      TASK: Perform 8 Pillars financial analysis and 10Y DCF valuation.
      LANGUAGE: Hebrew.
      FORMAT: Return ONLY JSON.
      Structure:
      {
        "companyName": "${marketData.companyName}",
        "ticker": "${marketData.ticker}",
        "score": 0,
        "pillarsStatus": [{"id": 1, "status": "pass", "value": "description"}],
        "dcf": {"conservative": 0, "base": 0, "optimistic": 0, "marketPrice": ${marketData.currentPrice}, "marginOfSafety": 0},
        "analysisNotes": "Summary in Hebrew"
      }`;

      const result = await callGemini(analysisPrompt, false);
      setAnalysisResult(result);
    } catch (err) {
      setError(err.message || "חלה שגיאה בתהליך הניתוח.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const pillars = [
    { id: 1, title: 'מכפיל רווח מול ממוצע', icon: <Activity className="text-blue-500" /> },
    { id: 2, title: 'ROIC (תשואה על ההון)', icon: <Percent className="text-emerald-500" /> },
    { id: 3, title: 'צמיחה בהכנסות', icon: <TrendingUp className="text-purple-500" /> },
    { id: 4, title: 'צמיחה ברווח נקי', icon: <BarChart3 className="text-indigo-500" /> },
    { id: 5, title: 'שינוי במצבת המניות', icon: <Layers className="text-orange-500" /> },
    { id: 6, title: 'חוב לטווח ארוך / תזרים', icon: <ShieldCheck className="text-red-500" /> },
    { id: 7, title: 'צמיחה בתזרים (FCF)', icon: <Wallet className="text-cyan-500" /> },
    { id: 8, title: 'מכפיל תזרים מול ממוצע', icon: <DollarSign className="text-yellow-500" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-right" dir="rtl">
      {/* כאן נשאר ה-JSX המקורי שלך (הוא מצוין!) */}
      <header className="max-w-6xl mx-auto mb-10 text-center">
        <h1 className="text-4xl font-black text-slate-900 mb-2 font-assistant">אנליסט 8 עמודי התווך</h1>
        <p className="text-slate-500 font-medium">ניתוח פונדמנטלי חכם (Gemini 2.5)</p>
      </header>

      {!analysisResult && !isAnalyzing ? (
        <div className="max-w-xl mx-auto bg-white p-12 rounded-[2.5rem] border-2 border-slate-100 text-center shadow-xl">
            <Files className="mx-auto mb-6 text-indigo-400 opacity-40" size={64} />
            <h3 className="text-2xl font-bold mb-4 text-slate-800">ניתוח דוחות כספיים</h3>
            <p className="text-slate-500 mb-8">העלה קובץ (PDF/TXT) לניתוח 8 עמודי התווך ו-DCF</p>
            <input type="file" className="hidden" id="file-up" onChange={(e) => setUploadedFiles(Array.from(e.target.files))} multiple />
            <label htmlFor="file-up" className="bg-indigo-600 text-white px-12 py-4 rounded-2xl cursor-pointer font-bold inline-block hover:bg-indigo-700 transition-all shadow-lg">בחירת קבצים</label>
            {uploadedFiles.length > 0 && (
                <div className="mt-8 pt-8 border-t border-slate-50">
                    <button onClick={startAnalysis} className="bg-slate-900 text-white w-full py-4 rounded-2xl font-bold hover:bg-black transition-all">נתח {uploadedFiles.length} קבצים עכשיו</button>
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                        {uploadedFiles.map((f, i) => <span key={i} className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500">{f.name}</span>)}
                    </div>
                </div>
            )}
        </div>
      ) : isAnalyzing ? (
        <div className="text-center py-24">
            <Loader2 className="animate-spin text-indigo-600 mx-auto mb-6" size={64} />
            <h3 className="text-2xl font-black text-slate-800 mb-2">מבצע חיפוש נתוני שוק וניתוח דוחות...</h3>
            <p className="text-slate-400">זה עשוי לקחת כ-20 שניות</p>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
            {/* ... שאר רכיבי התצוגה של analysisResult כפי שכתבת ... */}
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-black">{analysisResult.ticker}</span>
                        <span className="text-slate-300 text-sm italic">ניתוח פונדמנטלי - 2026 Edition</span>
                    </div>
                    <h2 className="text-5xl font-black text-slate-900 mb-6">{analysisResult.companyName}</h2>
                    <div className="bg-slate-50 p-6 rounded-3xl text-slate-700 border border-slate-100 leading-relaxed font-medium">
                        {analysisResult.analysisNotes}
                    </div>
                </div>
                <div className="bg-slate-900 text-white p-12 rounded-[4rem] text-center min-w-[220px] shadow-2xl">
                    <div className="text-xs opacity-40 font-bold uppercase mb-2">ציון סופי</div>
                    <div className="text-8xl font-black">{analysisResult.score}<span className="text-3xl opacity-20">/8</span></div>
                </div>
            </div>

            <div className="flex justify-center gap-4 mb-10">
                <button onClick={() => setActiveTab('pillars')} className={`px-10 py-3 rounded-2xl font-black transition-all ${activeTab === 'pillars' ? 'bg-indigo-600 text-white shadow-xl' : 'bg-white border text-slate-500'}`}>עמודי התווך</button>
                <button onClick={() => setActiveTab('dcf')} className={`px-10 py-3 rounded-2xl font-black transition-all ${activeTab === 'dcf' ? 'bg-indigo-600 text-white shadow-xl' : 'bg-white border text-slate-500'}`}>שווי הוגן</button>
            </div>

            {activeTab === 'pillars' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {pillars.map(p => {
                        const s = analysisResult.pillarsStatus.find(x => x.id === p.id);
                        return (
                            <div key={p.id} className={`p-8 rounded-[2.5rem] border bg-white shadow-sm ${s?.status === 'pass' ? 'border-emerald-100' : 'border-red-100'}`}>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="bg-slate-50 p-3 rounded-2xl">{p.icon}</div>
                                    {s?.status === 'pass' ? <CheckCircle2 className="text-emerald-500" size={32} /> : <XCircle className="text-red-300" size={32} />}
                                </div>
                                <div className="text-[10px] text-slate-400 font-black uppercase mb-2">{p.title}</div>
                                <div className="font-bold text-slate-800 text-lg leading-tight">{s?.value || 'נתון חסר'}</div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-slate-50 text-center">
                    <h2 className="text-3xl font-black text-slate-800 mb-12 uppercase tracking-tighter italic">הערכת שווי DCF (10 שנים)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                        <div className="p-8 bg-slate-50 rounded-3xl">
                            <div className="text-xs text-slate-400 font-bold mb-3 uppercase">תרחיש שמרני</div>
                            <div className="text-4xl font-black text-slate-500">${analysisResult.dcf.conservative}</div>
                        </div>
                        <div className="p-12 bg-indigo-600 text-white rounded-[4rem] scale-110 shadow-2xl border-4 border-indigo-500">
                            <div className="text-xs opacity-60 font-bold mb-3 uppercase">מחיר הוגן (Base)</div>
                            <div className="text-6xl font-black">${analysisResult.dcf.base}</div>
                        </div>
                        <div className="p-8 bg-slate-50 rounded-3xl">
                            <div className="text-xs text-slate-400 font-bold mb-3 uppercase">תרחיש אופטימי</div>
                            <div className="text-4xl font-black text-slate-500">${analysisResult.dcf.optimistic}</div>
                        </div>
                    </div>
                    <div className="bg-slate-900 text-white p-12 rounded-[3.5rem] flex flex-col md:flex-row justify-around items-center gap-10">
                        <div className="text-center">
                            <div className="text-xs opacity-40 font-bold mb-2 uppercase">מחיר שוק</div>
                            <div className="text-5xl font-black">${analysisResult.dcf.marketPrice}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs opacity-40 font-bold mb-2 uppercase">מרווח ביטחון</div>
                            <div className={`text-6xl font-black ${analysisResult.dcf.marginOfSafety > 20 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {analysisResult.dcf.marginOfSafety}%
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="text-center mt-12 pb-12">
                <button onClick={() => {setAnalysisResult(null); setUploadedFiles([]);}} className="text-slate-400 font-bold hover:text-indigo-600 flex items-center justify-center gap-2 mx-auto transition-all">
                    <X size={18} /> איפוס וניתוח חדש
                </button>
            </div>
        </div>
      )}

      {error && (
        <div className="max-w-xl mx-auto mt-8 p-6 bg-red-50 border-2 border-red-100 text-red-700 rounded-3xl flex items-center gap-4">
            <AlertCircle className="shrink-0" size={32} />
            <p className="font-bold leading-relaxed">{error}</p>
        </div>
      )}
    </div>
  );
};

export default App;
