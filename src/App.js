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

  // פונקציה שמנקה את הטקסט ומסדרת אותו עבור ה-AI
  const preprocessText = (text) => {
    // הסרת רווחים כפולים ותווים מוזרים שנוצרים ב-PDF
    let cleaned = text.replace(/[\r\n]+/g, '\n').replace(/\s\s+/g, ' ');
    
    // זיהוי אם זה דוח ישראלי (לפי נוכחות עברית)
    const hasHebrew = /[\u0590-\u05FF]/.test(cleaned);
    
    if (hasHebrew) {
      // בדוחות ישראליים המספרים לפעמים מתהפכים ב-PDF - ה-AI יטפל בזה עם הוראה מתאימה
      return "[ISRAELI REPORT DETECTED]\n" + cleaned;
    }
    return "[US/INTERNATIONAL REPORT DETECTED]\n" + cleaned;
  };

  const callGemini = async (promptText) => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("חסר מפתח API");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { temperature: 0.1 }
    };

    // הוספת כלי חיפוש כדי להשלים נתונים חסרים מה-PDF
    payload.tools = [{ "google_search": {} }];

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "שגיאה בתקשורת");

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("ה-AI לא הצליח לעבד את הנתונים. נסה להעלות קובץ טקסט נקי.");
    
    return JSON.parse(jsonMatch[0]);
  };

  const startAnalysis = async () => {
    if (uploadedFiles.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const filesData = await Promise.all(uploadedFiles.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(preprocessText(e.target.result));
          reader.readAsText(file);
        });
      }));

      const combinedContent = filesData.join('\n').slice(0, 15000);

      const prompt = `
        You are a senior financial analyst. Analyze the following data:
        ${combinedContent}

        INSTRUCTIONS:
        1. If it's an Israeli report (Hebrew), note that numbers might be reversed due to PDF encoding.
        2. Perform 8 Pillars analysis (Score 0-8) and a 10-year DCF valuation.
        3. Use Google Search to find the CURRENT stock price and missing market data if not in the file.
        4. Return ONLY a JSON object in Hebrew:
        {
          "companyName": "שם החברה",
          "ticker": "TICKER",
          "score": 0,
          "pillarsStatus": [
            {"id": 1, "status": "pass/fail", "value": "נתון שנמצא"},
            {"id": 2, "status": "pass/fail", "value": "נתון שנמצא"},
            {"id": 3, "status": "pass/fail", "value": "נתון שנמצא"},
            {"id": 4, "status": "pass/fail", "value": "נתון שנמצא"},
            {"id": 5, "status": "pass/fail", "value": "נתון שנמצא"},
            {"id": 6, "status": "pass/fail", "value": "נתון שנמצא"},
            {"id": 7, "status": "pass/fail", "value": "נתון שנמצא"},
            {"id": 8, "status": "pass/fail", "value": "נתון שנמצא"}
          ],
          "dcf": {"conservative": 0, "base": 0, "optimistic": 0, "marketPrice": 0, "marginOfSafety": 0},
          "analysisNotes": "סיכום מקצועי בעברית כולל התייחסות למקור הדוח (ישראלי/אמריקאי)"
        }
      `;

      const result = await callGemini(prompt);
      setAnalysisResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-right font-sans" dir="rtl">
      {/* ... (אותו עיצוב Header ו-UI כמו קודם) ... */}
      <header className="max-w-6xl mx-auto mb-10 flex justify-between items-center text-slate-900">
        <div className="flex-1 text-center">
          <h1 className="text-4xl font-black mb-2">אנליסט רב-לאומי</h1>
          <p className="text-slate-500 font-medium tracking-tight">תומך בדוחות ישראליים (ISA) ואמריקאיים (SEC)</p>
        </div>
        <button onClick={resetKey} className="bg-white p-3 rounded-full border shadow-sm hover:bg-red-50 transition-colors">
          <Key size={20} className="text-slate-400" />
        </button>
      </header>

      {!analysisResult && !isAnalyzing ? (
        <div className="max-w-xl mx-auto bg-white p-12 rounded-[2.5rem] border-2 border-slate-100 text-center shadow-xl">
          <Files className="mx-auto mb-6 text-indigo-400 opacity-40" size={64} />
          <h3 className="text-2xl font-bold mb-4 text-slate-800">העלאת דוח (PDF/TXT)</h3>
          <p className="text-slate-500 mb-8">העלה דוח שנתי או רבעוני מכל סוג</p>
          <input type="file" className="hidden" id="file-up" onChange={(e) => setUploadedFiles(Array.from(e.target.files))} multiple />
          <label htmlFor="file-up" className="bg-indigo-600 text-white px-12 py-4 rounded-2xl cursor-pointer font-bold inline-block hover:bg-indigo-700 transition-all shadow-lg">בחירת קבצים</label>
          {uploadedFiles.length > 0 && (
            <div className="mt-8 pt-8 border-t">
              <button onClick={startAnalysis} className="bg-slate-900 text-white w-full py-4 rounded-2xl font-bold hover:bg-black transition-all">הפעל ניתוח משולב</button>
            </div>
          )}
        </div>
      ) : isAnalyzing ? (
        <div className="text-center py-24">
          <Loader2 className="animate-spin text-indigo-600 mx-auto mb-6" size={64} />
          <h3 className="text-2xl font-black text-slate-800">מנתח נתונים גלובליים...</h3>
          <p className="text-slate-400 mt-2">מתקן עברית הפוכה ובודק נתוני שוק בארה"ב/ישראל</p>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
          {/* תצוגת תוצאות - אותו מבנה כמו בגרסה הקודמת */}
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border mb-8 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex-1">
              <h2 className="text-5xl font-black text-slate-900 mb-4">{analysisResult.companyName}</h2>
              <p className="bg-slate-50 p-6 rounded-3xl text-slate-700 italic font-medium">"{analysisResult.analysisNotes}"</p>
            </div>
            <div className="bg-slate-900 text-white p-12 rounded-[4rem] text-center min-w-[200px]">
              <div className="text-8xl font-black">{analysisResult.score}/8</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {analysisResult.pillarsStatus.map((s, idx) => (
              <div key={idx} className={`p-8 rounded-[2.5rem] border bg-white ${s.status === 'pass' ? 'border-emerald-100' : 'border-red-100'}`}>
                <div className="flex justify-between mb-4">
                   {s.status === 'pass' ? <CheckCircle2 className="text-emerald-500" /> : <XCircle className="text-red-400" />}
                   <span className="text-[10px] font-black text-slate-300">Pillar {idx + 1}</span>
                </div>
                <div className="font-bold text-slate-800">{s.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-indigo-600 text-white p-12 rounded-[4rem] text-center shadow-2xl relative">
            <h3 className="text-3xl font-black mb-4 tracking-tighter italic">הערכת שווי DCF: ${analysisResult.dcf?.base}</h3>
            <div className="bg-white/20 px-8 py-3 rounded-full inline-block font-black text-2xl">
                Margin of Safety: {analysisResult.dcf?.marginOfSafety}%
            </div>
          </div>

          <button onClick={() => setAnalysisResult(null)} className="mt-12 block mx-auto text-slate-400 font-bold hover:text-indigo-600 transition-all">ניתוח חברה נוספת</button>
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
