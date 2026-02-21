import React, { useState } from 'react';
import { 
  Loader2, CheckCircle2, XCircle, Files, Key, AlertCircle, TrendingUp, Info
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
      const filesParts = await Promise.all(uploadedFiles.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ inlineData: { data: reader.result.split(',')[1], mimeType: file.type || "application/pdf" } });
          reader.readAsDataURL(file);
        });
      }));

      const prompt = `
        נתח את המסמכים המצורפים עבור חברה ציבורית.
        1. זהה חברה, טיקר, ומטבע (₪ או $).
        2. בצע ניתוח 8 עמודי תווך וחישוב DCF.
        3. השתמש בחיפוש גוגל למחיר מניה עדכני.
        4. ספק המלצה סופית (קנייה/החזקה/מכירה) מבוססת על מרווח הביטחון וציון ה-8 עמודים.
        
        החזר JSON בלבד בעברית:
        {
          "companyName": "...",
          "ticker": "...",
          "currency": "...",
          "score": 0,
          "pillarsStatus": [{"id": 1, "status": "pass/fail", "value": "..."}],
          "dcf": {"conservative": 0, "base": 0, "optimistic": 0, "marketPrice": 0, "marginOfSafety": 0},
          "verdict": {"recommendation": "קנייה/החזקה/מכירה", "reason": "הסבר קצר של שורה אחת"},
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

  const getVerdictColor = (rec) => {
    if (rec?.includes("קנייה")) return "bg-emerald-500 text-white";
    if (rec?.includes("מכירה")) return "bg-red-500 text-white";
    return "bg-amber-500 text-white";
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-right font-sans" dir="rtl">
      <header className="max-w-5xl mx-auto mb-10 text-center">
        <h1 className="text-4xl font-black text-slate-900">אנליסט השקעות מקצועי</h1>
      </header>

      {!analysisResult && !isAnalyzing ? (
        <div className="max-w-xl mx-auto bg-white p-12 rounded-[2.5rem] text-center shadow-xl border">
          <Files className="mx-auto text-indigo-500 mb-6 opacity-40" size={64} />
          <h3 className="text-2xl font-bold mb-8">העלה דוחות (SoFi, תדיראן וכו')</h3>
          <input type="file" className="hidden" id="f" onChange={e => setUploadedFiles(Array.from(e.target.files))} multiple />
          <label htmlFor="f" className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold cursor-pointer hover:bg-indigo-700 inline-block">בחר קבצים</label>
          {uploadedFiles.length > 0 && <button onClick={startAnalysis} className="block w-full mt-6 bg-slate-900 text-white py-4 rounded-2xl font-bold">הפעל ניתוח והמלצה</button>}
        </div>
      ) : isAnalyzing ? (
        <div className="text-center py-20">
          <Loader2 className="animate-spin mx-auto text-indigo-600 mb-6" size={64} />
          <h2 className="text-2xl font-black italic">מגבש המלצת קנייה/מכירה...</h2>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
          {/* כרטיס ראשי */}
          <div className="bg-white rounded-[3rem] shadow-xl p-10 border relative overflow-hidden">
            <div className={`absolute top-0 left-0 px-10 py-3 font-black text-xl rounded-br-[2rem] shadow-lg ${getVerdictColor(analysisResult.verdict.recommendation)}`}>
              {analysisResult.verdict.recommendation}
            </div>
            
            <div className="flex justify-between items-end mt-8 border-b pb-8">
              <div>
                <span className="text-indigo-600 font-bold tracking-tighter">{analysisResult.ticker}</span>
                <h2 className="text-6xl font-black mt-2">{analysisResult.companyName}</h2>
              </div>
              <div className="text-center">
                <div className="text-5xl font-black">{analysisResult.score}/8</div>
                <div className="text-xs font-bold opacity-30 uppercase">Pillars Score</div>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {analysisResult.pillarsStatus.map(s => (
                <div key={s.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-600">
                  {s.status === 'pass' ? '✅' : '❌'} {s.value}
                </div>
               ))}
            </div>
          </div>

          {/* כרטיס DCF והמלצה */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-indigo-600 rounded-[3rem] p-10 text-white shadow-2xl">
              <div className="flex justify-between items-start mb-6">
                <TrendingUp size={40} className="opacity-50" />
                <div className="text-left">
                  <p className="text-xs opacity-70 font-bold uppercase">Fair Value (Base)</p>
                  <h3 className="text-6xl font-black">{analysisResult.currency}{analysisResult.dcf.base}</h3>
                </div>
              </div>
              <div className="flex justify-between border-t border-white/20 pt-6 text-sm font-bold">
                <span>מחיר שוק: {analysisResult.currency}{analysisResult.dcf.marketPrice}</span>
                <span className="bg-white/20 px-4 py-1 rounded-full text-xl font-black">Safety: {analysisResult.dcf.marginOfSafety}%</span>
              </div>
            </div>

            <div className="bg-white rounded-[3rem] p-10 border shadow-xl flex flex-col justify-center">
              <h4 className="text-xl font-black mb-4 flex items-center gap-2 underline decoration-indigo-500">
                <Info size={20} /> סיכום האנליסט:
              </h4>
              <p className="text-slate-700 font-medium leading-relaxed italic">
                "{analysisResult.verdict.reason}"
              </p>
            </div>
          </div>

          <button onClick={() => setAnalysisResult(null)} className="block mx-auto text-slate-400 font-bold hover:text-indigo-600 transition-colors py-10">ניתוח חברה חדשה</button>
        </div>
      )}
    </div>
  );
};

export default App;
