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

  // פונקציה שממירה את הקובץ לפורמט ש-Gemini יודע "לראות" (Base64)
  const processFileForGemini = async (file) => {
    return new Promise((resolve, reject) => {
      // אם הקובץ שוקל מעל 15MB, הדפדפן עלול לקרוס, לכן נשלח רק את השם שלו וניתן לגוגל לחפש
      if (file.size > 15 * 1024 * 1024) {
        resolve({ text: `[קובץ כבד מדי - שם הקובץ: ${file.name}]. חפש את הנתונים על חברה זו בגוגל.` });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result.split(',')[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type || "application/pdf"
          }
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const callGemini = async (filesParts, promptText) => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("מפתח API חסר.");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{ 
        parts: [
          { text: promptText },
          ...filesParts // כאן נכנסים הקבצים בצורה ויזואלית ל-AI
        ] 
      }],
      generationConfig: { temperature: 0.1 },
      tools: [{ "google_search": {} }] // שימוש בחיפוש גוגל חי
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "שגיאה בתקשורת מול השרת");

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // ניקוי JSON גם אם ה-AI מוסיף טקסט מקדים
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("ה-AI לא החזיר תשובה בפורמט תקין. ייתכן שהדוח אינו קריא.");
    
    return JSON.parse(jsonMatch[0]);
  };

  const startAnalysis = async () => {
    if (uploadedFiles.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // עיבוד כל הקבצים במקביל לפורמט מולטי-מודאלי
      const filesParts = await Promise.all(uploadedFiles.map(file => processFileForGemini(file)));

      const prompt = `
        You are a top-tier Global Financial Analyst and Portfolio Manager.
        I am providing you with documents (can be US 10-K/10-Q, Israeli ISA reports, Investor Presentations, or CEO letters).
        
        YOUR TASKS:
        1. Read the documents. Identify the company, market (US/Israel/Other), and ticker.
        2. Extract key insights from CEO letters/Presentations regarding strategy and sentiment.
        3. Extract hard financial numbers (Revenue, Net Income, Free Cash Flow, Debt, Equity).
        4. USE GOOGLE SEARCH to find the CURRENT stock price and missing historical 5Y averages if they are not in the documents.
        5. Perform an 8 Pillars analysis (Score 0-8) and calculate a 10Y DCF.
        
        Return ONLY valid JSON in Hebrew. Structure:
        {
          "companyName": "שם החברה",
          "ticker": "TICKER",
          "score": 0,
          "pillarsStatus": [
            {"id": 1, "status": "pass", "value": "מכפיל רווח: X. הסבר..."},
            {"id": 2, "status": "fail", "value": "ROIC: Y. הסבר..."},
            {"id": 3, "status": "pass", "value": "צמיחת הכנסות..."},
            {"id": 4, "status": "pass", "value": "צמיחת רווח..."},
            {"id": 5, "status": "pass", "value": "מניות..."},
            {"id": 6, "status": "pass", "value": "חוב..."},
            {"id": 7, "status": "pass", "value": "תזרים חופשי..."},
            {"id": 8, "status": "pass", "value": "מכפיל תזרים..."}
          ],
          "dcf": {"conservative": 0, "base": 0, "optimistic": 0, "marketPrice": 0, "marginOfSafety": 0},
          "analysisNotes": "סיכום האנליזה, כולל התייחסות לאסטרטגיה מהמצגת/דברי המנכ"ל, ומקור הנתונים."
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
        <div className="flex-1 text-center">
          <h1 className="text-4xl font-black mb-2">אנליסט השקעות חכם</h1>
          <p className="text-slate-500 font-medium">מנתח דוחות, מצגות משקיעים ודברי מנכ"ל - ארה"ב וישראל</p>
        </div>
        <button onClick={resetKey} className="bg-white p-3 rounded-full border shadow-sm hover:bg-red-50 transition-colors" title="החלף מפתח API">
          <Key size={20} className="text-slate-400" />
        </button>
      </header>

      {!analysisResult && !isAnalyzing ? (
        <div className="max-w-xl mx-auto bg-white border-2 border-slate-200 p-12 rounded-[2.5rem] text-center shadow-xl">
          <Files className="mx-auto text-indigo-500 mb-6 opacity-40" size={64} />
          <h3 className="text-2xl font-bold mb-4">העלאת מסמכי חברה</h3>
          <p className="text-slate-500 mb-8">ניתן להעלות קבצי PDF, דוחות 10-K, מצגות (עד 15MB לקובץ)</p>
          
          <input type="file" className="hidden" id="f" onChange={e => setUploadedFiles(Array.from(e.target.files))} multiple accept="application/pdf, text/plain" />
          <label htmlFor="f" className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold cursor-pointer hover:bg-indigo-700 shadow-lg inline-block transition-all hover:-translate-y-1">
            בחר קבצים לניתוח
          </label>
          
          {uploadedFiles.length > 0 && (
            <div className="mt-8 pt-8 border-t border-slate-100">
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {uploadedFiles.map((file, i) => (
                  <span key={i} className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">
                    {file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)
                  </span>
                ))}
              </div>
              <button onClick={startAnalysis} className="bg-slate-900 text-white w-full py-4 rounded-2xl font-bold hover:bg-black transition-all shadow-lg">
                התחל אנליזה מקיפה
              </button>
            </div>
          )}
        </div>
      ) : isAnalyzing ? (
        <div className="text-center py-20">
          <Loader2 className="animate-spin mx-auto text-indigo-600 mb-6" size={64} />
          <h2 className="text-2xl font-black text-slate-800">ה-AI קורא את המסמכים...</h2>
          <p className="text-slate-500 mt-2 font-medium">סורק דוחות, מחלץ תובנות אסטרטגיות ומשלים נתוני שוק מגוגל.</p>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto bg-white rounded-[3rem] shadow-2xl p-10 border border-slate-100 animate-in fade-in zoom-in duration-500">
          <div className="flex justify-between items-center mb-10 border-b border-slate-100 pb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg text-sm font-black tracking-widest">{analysisResult.ticker}</span>
              </div>
              <h2 className="text-5xl font-black text-slate-900">{analysisResult.companyName}</h2>
            </div>
            <div className="bg-slate-900 text-white rounded-[2.5rem] w-32 h-32 flex flex-col items-center justify-center shadow-xl">
              <span className="text-xs opacity-50 uppercase tracking-widest font-bold mb-1">ציון</span>
              <span className="text-5xl font-black leading-none">{analysisResult.score}<span className="text-2xl opacity-30">/8</span></span>
            </div>
          </div>
          
          <div className="bg-slate-50 p-6 rounded-3xl mb-10 border border-slate-100">
            <h4 className="font-black text-slate-800 mb-2">סיכום אסטרטגי ופיננסי:</h4>
            <p className="text-slate-600 font-medium leading-relaxed">"{analysisResult.analysisNotes}"</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {analysisResult.pillarsStatus.map(s => (
              <div key={s.id} className={`p-6 rounded-3xl border-2 transition-all hover:scale-105 ${s.status === 'pass' ? 'border-emerald-100 bg-white' : 'border-red-100 bg-white'}`}>
                <div className="flex justify-between mb-4">
                   {s.status === 'pass' ? <CheckCircle2 className="text-emerald-500" /> : <XCircle className="text-red-400" />}
                   <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Pillar {s.id}</span>
                </div>
                <div className="font-bold text-slate-700 text-sm leading-tight">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-indigo-600 rounded-[3rem] p-10 text-white text-center shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-20 -mt-20"></div>
             <p className="text-sm opacity-70 mb-2 font-black uppercase tracking-widest">הערכת שווי הוגן (10Y DCF)</p>
             <h3 className="text-7xl font-black mb-6 tracking-tighter">${analysisResult.dcf.base}</h3>
             
             <div className="flex justify-center gap-10 mb-8 font-bold opacity-80 text-sm uppercase tracking-widest">
                <span>תרחיש שמרני: ${analysisResult.dcf.conservative}</span>
                <span>מחיר שוק נוכחי: ${analysisResult.dcf.marketPrice}</span>
                <span>תרחיש אופטימי: ${analysisResult.dcf.optimistic}</span>
             </div>

             <div className="bg-white/20 px-8 py-4 rounded-full inline-block font-black text-2xl border border-white/20 backdrop-blur-md">
                מרווח ביטחון: {analysisResult.dcf.marginOfSafety}%
             </div>
          </div>
          
          <button onClick={() => {setAnalysisResult(null); setUploadedFiles([]);}} className="mt-12 text-slate-400 font-bold block mx-auto hover:text-indigo-600 transition-colors flex items-center gap-2">
            <X size={18} /> ניתוח דוח חדש
          </button>
        </div>
      )}
      
      {error && (
        <div className="max-w-xl mx-auto mt-8 flex items-center justify-center gap-3 text-red-600 font-bold bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm">
          <AlertCircle size={24} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default App;
