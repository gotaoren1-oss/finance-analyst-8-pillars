import React, { useState, useEffect } from 'react';
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
  const [activeTab, setActiveTab] = useState('pillars');

  // פונקציה מאובטחת לקבלת המפתח - נשמר רק מקומית אצל המשתמש
  const getApiKey = () => {
    let key = localStorage.getItem('finance_analyst_key');
    if (!key) {
      key = prompt("נא להזין את מפתח ה-API החדש של Gemini:");
      if (key) {
        localStorage.setItem('finance_analyst_key', key);
      }
    }
    return key;
  };

  const resetKey = () => {
    localStorage.removeItem('finance_analyst_key');
    alert("המפתח נמחק מהזיכרון המקומי.");
    window.location.reload();
  };

  const processFileContent = (text, maxChars) => {
    return text.replace(/\s\s+/g, ' ').slice(0, maxChars);
  };

  const readAllFiles = async (files) => {
    const totalLimit = 5000;
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

  const callGemini = async (promptText, useSearch = false) => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("לא הוזן מפתח API. לא ניתן להמשיך.");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
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
    
    if (!response.ok) {
      if (data.error?.message?.includes("API key was reported as leaked")) {
        localStorage.removeItem('finance_analyst_key');
      }
      throw new Error(data.error?.message || "שגיאה בתקשורת עם השרת");
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("ה-AI לא החזיר מבנה נתונים תקין.");
    return JSON.parse(jsonMatch[0]);
  };

  const startAnalysis = async () => {
    if (uploadedFiles.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const combinedData = await readAllFiles(uploadedFiles);
      
      const searchPrompt = `Find ticker, price, 5Y avg P/E and P/FCF for: ${uploadedFiles.map(f=>f.name).join(', ')}. Return JSON: {"ticker": "...", "currentPrice": 0, "avgPE": 0, "avgPFCF": 0, "companyName": "..."}`;
      const marketData = await callGemini(searchPrompt, true);

      const analysisPrompt = `DATA: ${combinedData}\nMARKET: ${JSON.stringify(marketData)}\nPerform 8 Pillars and DCF. Hebrew language. Return JSON ONLY: {"companyName": "...", "ticker": "...", "score": 0, "pillarsStatus": [{"id": 1, "status": "pass", "value": "..."}], "dcf": {"conservative": 0, "base": 0, "optimistic": 0, "marketPrice": 0, "marginOfSafety": 0}, "analysisNotes": "..."}`;
      const result = await callGemini(analysisPrompt, false);
      
      setAnalysisResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-right font-sans" dir="rtl">
      <header className="max-w-6xl mx-auto mb-10 flex justify-between items-center">
        <div className="flex-1 text-center">
            <h1 className="text-4xl font-black text-slate-900 mb-2">אנליסט 8 עמודי התווך</h1>
            <p className="text-slate-500 font-medium">ניתוח פונדמנטלי מאובטח</p>
        </div>
        <button onClick={resetKey} className="bg-white p-3 rounded-full shadow-sm border hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all" title="החלף מפתח">
            <Key size={20} />
        </button>
      </header>

      {!analysisResult && !isAnalyzing ? (
        <div className="max-w-xl mx-auto bg-white p-12 rounded-[2.5rem] border-2 border-slate-100 text-center shadow-xl">
            <Files className="mx-auto mb-6 text-indigo-400 opacity-40" size={64} />
            <h3 className="text-2xl font-bold mb-4 text-slate-800">העלאת דוחות</h3>
            <p className="text-slate-500 mb-8">בחר קבצי טקסט לניתוח</p>
            <input type="file" className="hidden" id="file-up" onChange={(e) => setUploadedFiles(Array.from(e.target.files))} multiple />
            <label htmlFor="file-up" className="bg-indigo-600 text-white px-12 py-4 rounded-2xl cursor-pointer font-bold inline-block hover:bg-indigo-700 transition-all shadow-lg">בחירת קבצים</label>
            {uploadedFiles.length > 0 && (
                <div className="mt-8 pt-8 border-t">
                    <button onClick={startAnalysis} className="bg-slate-900 text-white w-full py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-lg">הפעל ניתוח</button>
                </div>
            )}
        </div>
      ) : isAnalyzing ? (
        <div className="text-center py-24">
            <Loader2 className="animate-spin text-indigo-600 mx-auto mb-6" size={64} />
            <h3 className="text-2xl font-black text-slate-800">מבצע חישובים וחיפוש נתוני שוק...</h3>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto animate-in fade-in">
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border mb-8 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex-1 text-right">
                    <h2 className="text-5xl font-black text-slate-900 mb-4">{analysisResult.companyName}</h2>
                    <p className="bg-slate-50 p-6 rounded-3xl text-slate-700 italic leading-relaxed">"{analysisResult.analysisNotes}"</p>
                </div>
                <div className="bg-slate-900 text-white p-12 rounded-[4rem] text-center min-w-[200px]">
                    <div className="text-8xl font-black">{analysisResult.score}/8</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {analysisResult.pillarsStatus.map((s, idx) => (
                    <div key={idx} className={`p-8 rounded-[2.5rem] border bg-white ${s.status === 'pass' ? 'border-emerald-100' : 'border-red-100'}`}>
                        <div className="text-[10px] text-slate-400 font-bold mb-2 uppercase tracking-tighter">עמוד תווך {idx + 1}</div>
                        <div className="font-bold text-slate-800 text-lg leading-tight">{s.value}</div>
                    </div>
                ))}
            </div>

            <div className="mt-8 bg-indigo-600 text-white p-12 rounded-[4rem] text-center shadow-2xl">
                <h3 className="text-3xl font-black mb-4 italic">הערכת שווי DCF: ${analysisResult.dcf?.base}</h3>
                <div className="inline-block bg-white/20 px-6 py-2 rounded-full font-black text-xl">
                    מרווח ביטחון: {analysisResult.dcf?.marginOfSafety}%
                </div>
            </div>

            <button onClick={() => setAnalysisResult(null)} className="mt-12 block mx-auto text-slate-400 font-bold hover:text-indigo-600 transition-all flex items-center gap-2">
                <X size={18}/> ניתוח חברה חדשה
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
