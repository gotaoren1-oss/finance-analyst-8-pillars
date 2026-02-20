import React, { useState } from 'react';
import { 
  TrendingUp, DollarSign, BarChart3, ShieldCheck, Activity, 
  Layers, Wallet, Percent, AlertCircle, Loader2, 
  CheckCircle2, XCircle, X, Files 
} from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState('pillars');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState(null);

  const getApiKey = () => {
    return "AIzaSyCahUCjqsHk6EybVoWUb8Ujil6CH42wwGE"; // וודא שזה המפתח המדויק שלך
  };

  const processFileContent = (text, maxChars) => {
    const lines = text.split('\n');
    const filtered = lines.filter(line => /\d/.test(line) || /revenue|profit|income/i.test(line));
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
          reader.onerror = () => resolve("");
          reader.readAsText(file);
        });
      })
    );
    return contents.join('\n\n');
  };

  const callGemini = async (prompt, useSearch = false) => {
    const apiKey = getApiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 }
    };

    if (useSearch) {
      payload.tools = [{ "google_search": {} }];
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      referrerPolicy: "no-referrer" // עוזר לעקוף חסימות דפדפן מסוימות
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Gemini Error:", data);
      throw new Error(data.error?.message || "שגיאה בתקשורת עם גוגל");
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("ה-AI לא החזיר תשובה בפורמט תקין");
    return JSON.parse(jsonMatch[0]);
  };

  const startAnalysis = async () => {
    if (uploadedFiles.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const combinedData = await readAllFiles(uploadedFiles);
      
      // שלב 1: חיפוש נתוני שוק
      const searchPrompt = `Find ticker, price, 5Y avg P/E and P/FCF for: ${uploadedFiles.map(f=>f.name).join(', ')}. Return JSON ONLY: {"ticker": "string", "currentPrice": 0, "avgPE": 0, "avgPFCF": 0, "companyName": "Hebrew Name"}`;
      const marketData = await callGemini(searchPrompt, true);

      // שלב 2: ניתוח 8 עמודים
      const analysisPrompt = `DATA: ${combinedData}\nMARKET: ${JSON.stringify(marketData)}\nPerform 8 Pillars analysis and 10Y DCF in Hebrew. Return JSON ONLY: {"companyName": "...", "ticker": "...", "score": 0, "pillarsStatus": [{"id": 1, "status": "pass", "value": "..."}], "dcf": {"conservative": 0, "base": 0, "optimistic": 0, "marketPrice": 0, "marginOfSafety": 0}, "analysisNotes": "..."}`;
      const result = await callGemini(analysisPrompt, false);
      
      setAnalysisResult(result);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ה-JSX נשאר אותו דבר כמו קודם...
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-right" dir="rtl">
        {/* העתק את שאר ה-return מהקוד הקודם שנתתי לך */}
        <header className="max-w-6xl mx-auto mb-10 text-center">
        <h1 className="text-4xl font-black text-slate-900 mb-2">אנליסט 8 עמודי התווך</h1>
        <p className="text-slate-500 font-medium italic">Gemini 2.5 Pro Engine</p>
      </header>

      {!analysisResult && !isAnalyzing ? (
        <div className="max-w-xl mx-auto bg-white p-12 rounded-[2.5rem] border-2 border-slate-100 text-center shadow-xl">
            <Files className="mx-auto mb-6 text-indigo-400 opacity-40" size={64} />
            <h3 className="text-2xl font-bold mb-4 text-slate-800">ניתוח דוחות כספיים</h3>
            <p className="text-slate-500 mb-8">העלה קובץ טקסט לקבלת ניתוח עומק</p>
            <input type="file" className="hidden" id="file-up" onChange={(e) => setUploadedFiles(Array.from(e.target.files))} multiple />
            <label htmlFor="file-up" className="bg-indigo-600 text-white px-12 py-4 rounded-2xl cursor-pointer font-bold inline-block hover:bg-indigo-700 transition-all shadow-lg">בחירת קבצים</label>
            {uploadedFiles.length > 0 && (
                <div className="mt-8 pt-8 border-t border-slate-50">
                    <button onClick={startAnalysis} className="bg-slate-900 text-white w-full py-4 rounded-2xl font-bold hover:bg-black transition-all">נתח עכשיו</button>
                </div>
            )}
        </div>
      ) : isAnalyzing ? (
        <div className="text-center py-24">
            <Loader2 className="animate-spin text-indigo-600 mx-auto mb-6" size={64} />
            <h3 className="text-2xl font-black text-slate-800">מבצע חיפוש וניתוח...</h3>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto">
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex-1">
                    <h2 className="text-5xl font-black text-slate-900 mb-4">{analysisResult.companyName}</h2>
                    <p className="bg-slate-50 p-6 rounded-3xl text-slate-700 italic">"{analysisResult.analysisNotes}"</p>
                </div>
                <div className="bg-slate-900 text-white p-12 rounded-[4rem] text-center">
                    <div className="text-8xl font-black">{analysisResult.score}/8</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {analysisResult.pillarsStatus.map((s, idx) => (
                    <div key={idx} className={`p-8 rounded-[2.5rem] border bg-white ${s.status === 'pass' ? 'border-emerald-100' : 'border-red-100'}`}>
                        <div className="text-xs text-slate-400 font-bold mb-2">עמוד תווך {s.id}</div>
                        <div className="font-bold text-slate-800">{s.value}</div>
                    </div>
                ))}
            </div>
            
            <div className="mt-8 bg-indigo-600 text-white p-12 rounded-[4rem] text-center">
                <h3 className="text-2xl font-bold mb-4">מחיר הוגן (DCF): ${analysisResult.dcf?.base}</h3>
                <p>מרווח ביטחון: {analysisResult.dcf?.marginOfSafety}%</p>
            </div>

            <button onClick={() => setAnalysisResult(null)} className="mt-8 block mx-auto text-slate-400 font-bold underline">ניתוח חדש</button>
        </div>
      )}

      {error && (
        <div className="max-w-xl mx-auto mt-8 p-6 bg-red-50 border-2 border-red-100 text-red-700 rounded-3xl text-center">
            <p className="font-bold">שגיאה: {error}</p>
            <p className="text-xs mt-2 italic">ודא שהמפתח תקין ב-Google AI Studio</p>
        </div>
      )}
    </div>
  );
};

export default App;
