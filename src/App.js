import React, { useState } from 'react';
import { 
  BarChart3, ShieldCheck, Activity, Loader2, 
  CheckCircle2, XCircle, X, Files, Key, AlertCircle
} from 'lucide-react';

const App = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState(null);

  const getApiKey = () => {
    let key = localStorage.getItem('finance_analyst_key');
    if (!key) {
      key = prompt("הכנס מפתח API של Gemini:");
      if (key) localStorage.setItem('finance_analyst_key', key);
    }
    return key;
  };

  const resetKey = () => {
    localStorage.removeItem('finance_analyst_key');
    window.location.reload();
  };

  const processFileForGemini = async (file) => {
    return new Promise((resolve, reject) => {
      if (file.size > 15 * 1024 * 1024) {
        resolve({ text: `[File too large: ${file.name}]. Use Google Search for this company.` });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result.split(',')[1];
        resolve({
          inlineData: { data: base64Data, mimeType: file.type || "application/pdf" }
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const callGemini = async (filesParts, promptText) => {
    const apiKey = getApiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{ parts: [{ text: promptText }, ...filesParts] }],
      generationConfig: { temperature: 0.1 },
      tools: [{ "google_search": {} }]
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "שגיאה בתקשורת");
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("ה-AI לא החזיר מבנה נתונים תקין.");
    return JSON.parse(jsonMatch[0]);
  };

  const startAnalysis = async () => {
    if (uploadedFiles.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const filesParts = await Promise.all(uploadedFiles.map(file => processFileForGemini(file)));
      const prompt = `
        Analyze the attached documents (Reports/Presentations/CEO Letters).
        1. Identify company, market, and ticker.
        2. Extract financials and strategic insights.
        3. Use Google Search for current price and missing data.
        4. Detect the currency: Use "₪" for Israeli companies (Tadiran, etc.) and "$" for US companies (SoFi, etc.).
        
        Return ONLY valid JSON in Hebrew:
        {
          "companyName": "...",
          "ticker": "...",
          "currency": "₪ או $",
          "score": 0,
          "pillarsStatus": [{"id": 1, "status": "pass/fail", "value": "..."}],
          "dcf": {"conservative": 0, "base": 0, "optimistic": 0, "marketPrice": 0, "marginOfSafety": 0},
          "analysisNotes": "..."
        }
      `;
      const result = await callGemini(filesParts, prompt);
      setAnalysisResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-right font-sans" dir="rtl">
      <header className="max-w-5xl mx-auto mb-10 flex justify-between items-center text-slate-900">
        <div className="flex-1 text-center font-bold text-2xl">GLOBAL ANALYST 2.5</div>
        <button onClick={resetKey} className="bg-white p-3 rounded-full border shadow-sm"><Key size={20}/></button>
      </header>

      {!analysisResult && !isAnalyzing ? (
        <div className="max-w-xl mx-auto bg-white p-12 rounded-[2.5rem] text-center shadow-xl border">
          <Files className="mx-auto text-indigo-500 mb-6 opacity-40" size={64} />
          <h3 className="text-2xl font-bold mb-4 italic">העלה דוח, מצגת או דברי מנכ"ל</h3>
          <input type="file" className="hidden" id="f" onChange={e => setUploadedFiles(Array.from(e.target.files))} multiple />
          <label htmlFor="f" className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold cursor-pointer hover:bg-indigo-700 inline-block">בחר קבצים</label>
          {uploadedFiles.length > 0 && (
            <button onClick={startAnalysis} className="block w-full mt-6 bg-slate-900 text-white py-4 rounded-2xl font-bold">הפעל אנליסט</button>
          )}
        </div>
      ) : isAnalyzing ? (
        <div className="text-center py-20 animate-pulse">
          <Loader2 className="animate-spin mx-auto text-indigo-600 mb-6" size={64} />
          <h2 className="text-2xl font-black">מזהה חברה, מטבע ונתונים כספיים...</h2>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto bg-white rounded-[3rem] shadow-2xl p-10 border">
          <div className="flex justify-between items-center mb-10 border-b pb-8">
            <div>
              <span className="bg-slate-100 px-3 py-1 rounded text-sm font-bold">{analysisResult.ticker}</span>
              <h2 className="text-5xl font-black mt-2">{analysisResult.companyName}</h2>
            </div>
            <div className="bg-slate-900 text-white rounded-3xl w-24 h-24 flex items-center justify-center text-3xl font-bold">
              {analysisResult.score}/8
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {analysisResult.pillarsStatus.map(s => (
              <div key={s.id} className="p-4 rounded-2xl border bg-slate-50">
                <div className="flex justify-between mb-2">
                   {s.status === 'pass' ? <CheckCircle2 className="text-emerald-500" size={18} /> : <XCircle className="text-red-400" size={18} />}
                   <span className="text-[10px] font-bold opacity-30">PILLAR {s.id}</span>
                </div>
                <div className="font-bold text-xs text-slate-700 leading-tight">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-indigo-600 rounded-[3rem] p-10 text-white text-center shadow-xl">
             <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">הערכת שווי הוגן (DCF)</p>
             <h3 className="text-7xl font-black mb-6 tracking-tighter">
                {analysisResult.currency}{analysisResult.dcf.base}
             </h3>
             
             <div className="flex justify-center gap-6 mb-8 text-xs font-bold opacity-80 border-t border-white/20 pt-6">
                <span>שמרני: {analysisResult.currency}{analysisResult.dcf.conservative}</span>
                <span>מחיר שוק: {analysisResult.currency}{analysisResult.dcf.marketPrice}</span>
                <span>אופטימי: {analysisResult.currency}{analysisResult.dcf.optimistic}</span>
             </div>

             <div className="bg-white text-indigo-600 px-8 py-3 rounded-full inline-block font-black text-xl">
                מרווח ביטחון: {analysisResult.dcf.marginOfSafety}%
             </div>
             <p className="mt-8 italic opacity-90 text-sm max-w-2xl mx-auto">"{analysisResult.analysisNotes}"</p>
          </div>
          <button onClick={() => setAnalysisResult(null)} className="mt-8 block mx-auto text-slate-400 underline font-bold">ניתוח חדש</button>
        </div>
      )}
    </div>
  );
};

export default App;
