import React, { useState } from 'react';
import { 
  TrendingUp, DollarSign, BarChart3, ShieldCheck, Activity, 
  Layers, Wallet, Percent, AlertCircle, Loader2, 
  CheckCircle2, XCircle, X, Files, Key 
} from 'lucide-react';

const App = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState(null);

  const getApiKey = () => {
    let key = localStorage.getItem('finance_analyst_key');
    if (!key) {
      key = prompt("נא להזין את מפתח ה-API של Gemini:");
      if (key) localStorage.setItem('finance_analyst_key', key);
    }
    return key;
  };

  const resetKey = () => {
    localStorage.removeItem('finance_analyst_key');
    window.location.reload();
  };

  const cleanJson = (text) => {
    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1) return null;
      const jsonStr = text.substring(start, end + 1);
      return JSON.parse(jsonStr);
    } catch (e) {
      return null;
    }
  };

  const callGemini = async (promptText, useSearch = false) => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("חסר מפתח API");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{ parts: [{ text: promptText + "\n\nReturn ONLY valid JSON." }] }],
      generationConfig: { temperature: 0.1 }
    };

    if (useSearch) {
      payload.tools = [{ "google_search": {} }];
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "שגיאה בתקשורת");

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const result = cleanJson(text);
    
    if (!result) throw new Error("ה-AI לא החזיר מבנה נתונים תקין. נסה שוב.");
    return result;
  };

  const startAnalysis = async () => {
    if (uploadedFiles.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const filesData = await Promise.all(uploadedFiles.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsText(file);
        });
      }));

      const combinedContent = filesData.join('\n').slice(0, 10000);

      const prompt = `
        Analyze the following data: ${combinedContent}
        Perform 8 Pillars analysis and 10Y DCF in Hebrew.
        Return ONLY a JSON object:
        {
          "companyName": "שם החברה",
          "ticker": "TICKER",
          "score": 8,
          "pillarsStatus": [
            {"id": 1, "status": "pass", "value": "תיאור"},
            {"id": 2, "status": "pass", "value": "תיאור"},
            {"id": 3, "status": "pass", "value": "תיאור"},
            {"id": 4, "status": "pass", "value": "תיאור"},
            {"id": 5, "status": "pass", "value": "תיאור"},
            {"id": 6, "status": "pass", "value": "תיאור"},
            {"id": 7, "status": "pass", "value": "תיאור"},
            {"id": 8, "status": "pass", "value": "תיאור"}
          ],
          "dcf": {"conservative": 100, "base": 120, "optimistic": 140, "marketPrice": 110, "marginOfSafety": 10},
          "analysisNotes": "סיכום מקצועי בעברית"
        }
      `;

      const result = await callGemini(prompt, true);
      setAnalysisResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-right" dir="rtl">
      <header className="max-w-6xl mx-auto mb-10 flex justify-between items-center">
        <div className="flex-1 text-center">
          <h1 className="text-4xl font-black text-slate-900 mb-2">אנליסט 8 עמודי התווך</h1>
          <p className="text-slate-500 font-medium tracking-tight">גרסה יציבה ומאובטחת</p>
        </div>
        <button onClick={resetKey} className="bg-white p-3 rounded-full shadow-sm border hover:bg-red-50" title="איפוס מפתח">
          <Key size={20} />
        </button>
      </header>

      {!analysisResult && !isAnalyzing ? (
        <div className="max-w-xl mx-auto bg-white p-12 rounded-[2.5rem] border-2 border-slate-100 text-center shadow-xl">
          <Files className="mx-auto mb-6 text-indigo-400 opacity-40" size={64} />
          <h3 className="text-2xl font-bold mb-4 text-slate-800">ניתוח דוחות</h3>
          <p className="text-slate-500 mb-8 font-medium italic underline decoration-indigo-200">העלה קבצי TXT או פשוט רשום את שם החברה בקובץ</p>
          <input type="file" className="hidden" id="file-up" onChange={(e) => setUploadedFiles(Array.from(e.target.files))} multiple />
          <label htmlFor="file-up" className="bg-indigo-600 text-white px-12 py-4 rounded-2xl cursor-pointer font-bold inline-block hover:bg-indigo-700 transition-all shadow-lg">בחירת קבצים</label>
          {uploadedFiles.length > 0 && (
            <div className="mt-8 pt-8 border-t">
              <button onClick={startAnalysis} className="bg-slate-900 text-white w-full py-4 rounded-2xl font-bold hover:bg-black transition-all">נתח עכשיו</button>
            </div>
          )}
        </div>
      ) : isAnalyzing ? (
        <div className="text-center py-24">
          <Loader2 className="animate-spin text-indigo-600 mx-auto mb-6" size={64} />
          <h3 className="text-2xl font-black text-slate-800">מבצע חיפוש נתוני שוק וניתוח...</h3>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border mb-8 flex flex-col md:flex-row justify-between items-center gap-8 font-assistant">
            <div className="flex-1">
              <h2 className="text-5xl font-black text-slate-900 mb-4">{analysisResult.companyName}</h2>
              <p className="bg-slate-50 p-6 rounded-3xl text-slate-700 italic leading-relaxed font-medium">"{analysisResult.analysisNotes}"</p>
            </div>
            <div className="bg-slate-900 text-white p-12 rounded-[4rem] text-center min-w-[200px]">
              <div className="text-8xl font-black">{analysisResult.score}/8</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {analysisResult.pillarsStatus.map((s, idx) => (
              <div key={idx} className={`p-8 rounded-[2.5rem] border bg-white ${s.status === 'pass' ? 'border-emerald-100' : 'border-red-100'}`}>
                <div className="flex justify-between mb-4 text-slate-300">
                   {s.status === 'pass' ? <CheckCircle2 className="text-emerald-500" /> : <XCircle className="text-red-400" />}
                   <span className="text-[10px] font-black uppercase">בדיקה {idx + 1}</span>
                </div>
                <div className="font-bold text-slate-800 leading-tight">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-indigo-600 text-white p-12 rounded-[4rem] text-center shadow-2xl relative overflow-hidden">
            <h3 className="text-3xl font-black mb-4 italic tracking-tight">הערכת שווי DCF: ${analysisResult.dcf?.base}</h3>
            <div className="flex justify-center gap-8 mb-6 font-bold opacity-80">
                <span>שמרני: ${analysisResult.dcf?.conservative}</span>
                <span>אופטימי: ${analysisResult.dcf?.optimistic}</span>
            </div>
            <div className="bg-white/20 px-8 py-3 rounded-full inline-block font-black text-2xl border-2 border-white/10">
                מרווח ביטחון: {analysisResult.dcf?.marginOfSafety}%
            </div>
          </div>

          <button onClick={() => setAnalysisResult(null)} className="mt-12 block mx-auto text-slate-400 font-bold hover:text-indigo-600 transition-all flex items-center gap-2">
            <X size={18} /> ניתוח חברה חדשה
          </button>
        </div>
      )}

      {error && (
        <div className="max-w-xl mx-auto mt-8 p-6 bg-red-50 border-2 border-red-100 text-red-700 rounded-3xl text-center shadow-lg">
          <AlertCircle className="mx-auto mb-2 text-red-500" size={32} />
          <p className="font-bold">{error}</p>
        </div>
      )}
    </div>
  );
};

export default App;
