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
      key = prompt("הכנס מפתח API (Gemini):");
      if (key) localStorage.setItem('finance_analyst_key', key);
    }
    return key;
  };

  const callGemini = async (promptText) => {
    const apiKey = getApiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { temperature: 0.1 },
      tools: [{ "google_search": {} }] // הפעלת חיפוש אוטומטי להשלמת נתונים
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "שגיאה בשרת");

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("ה-AI לא הצליח לגבש ניתוח. נסה קובץ קטן יותר או רשום את שם החברה.");
    return JSON.parse(jsonMatch[0]);
  };

  const startAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // קריאת חלק מהקובץ כדי לא להעמיס (רק את ההתחלה והסוף איפה שהסיכומים)
      const filesSummary = await Promise.all(uploadedFiles.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target.result;
            // לוקחים את 5000 התווים הראשונים והאחרונים (שם בד"כ הנתונים)
            const summary = content.slice(0, 5000) + "\n... [LONG DOCUMENT] ...\n" + content.slice(-5000);
            resolve(`File: ${file.name}\nContent:\n${summary}`);
          };
          reader.readAsText(file);
        });
      }));

      const prompt = `
        עבוד כאנליסט פיננסי בכיר. לפניך נתונים מקבצים שהועלו:
        ${filesSummary.join('\n')}

        משימה:
        1. זהה את שם החברה והטיקר (למשל SOFI או TADIRAN).
        2. אם הקובץ ארוך מדי או חסרים נתונים (כמו בדוח 10-K של 300 עמודים), השתמש בכלי החיפוש של גוגל כדי למצוא את הנתונים הפיננסיים העדכניים ביותר ל-2024-2025.
        3. בצע ניתוח 8 עמודי תווך וחישוב DCF (שמרני, בסיס, אופטימי).
        4. החזר אך ורק פורמט JSON בעברית:
        {
          "companyName": "...",
          "ticker": "...",
          "score": 0,
          "pillarsStatus": [{"id": 1, "status": "pass/fail", "value": "..."}],
          "dcf": {"conservative": 0, "base": 0, "optimistic": 0, "marketPrice": 0, "marginOfSafety": 0},
          "analysisNotes": "תיאור קצר על החברה והדוח (ציין אם השתמשת בחיפוש חיצוני להשלמה)"
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
    <div className="min-h-screen bg-slate-50 p-8 text-right font-sans" dir="rtl">
      <header className="max-w-4xl mx-auto text-center mb-12">
        <h1 className="text-4xl font-black text-slate-900 italic">AUTOMATIC ANALYST 2.0</h1>
        <p className="text-slate-500">ניתוח אוטומטי של דוחות ענק (SEC/ISA)</p>
      </header>

      {!analysisResult && !isAnalyzing ? (
        <div className="max-w-xl mx-auto bg-white border-4 border-dashed border-slate-200 p-16 rounded-[3rem] text-center">
          <Files className="mx-auto text-indigo-500 mb-6 opacity-50" size={80} />
          <input type="file" className="hidden" id="f" onChange={e => setUploadedFiles(Array.from(e.target.files))} multiple />
          <label htmlFor="f" className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-bold cursor-pointer hover:bg-indigo-700 shadow-xl inline-block transition-transform hover:scale-105">
            העלה דוח (אפילו 300 עמודים)
          </label>
          {uploadedFiles.length > 0 && (
            <button onClick={startAnalysis} className="block w-full mt-6 bg-slate-900 text-white py-4 rounded-2xl font-bold">הפעל ניתוח אוטונומי</button>
          )}
        </div>
      ) : isAnalyzing ? (
        <div className="text-center py-20">
          <Loader2 className="animate-spin mx-auto text-indigo-600 mb-6" size={60} />
          <h2 className="text-2xl font-bold text-slate-800">ה-AI קורא את הדוח ומבצע חיפושים משלימים...</h2>
          <p className="text-slate-400 mt-2">זה עשוי לקחת עד 30 שניות בדוחות ארוכים</p>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto bg-white rounded-[3rem] shadow-2xl p-10 border border-slate-100">
          <div className="flex justify-between items-start border-b pb-8 mb-8">
            <div>
              <h2 className="text-6xl font-black text-slate-900">{analysisResult.ticker}</h2>
              <p className="text-2xl text-slate-500">{analysisResult.companyName}</p>
            </div>
            <div className="bg-slate-900 text-white rounded-full w-32 h-32 flex items-center justify-center text-4xl font-black">
              {analysisResult.score}/8
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {analysisResult.pillarsStatus.map(s => (
              <div key={s.id} className={`p-6 rounded-3xl border-2 ${s.status === 'pass' ? 'border-emerald-50 bg-emerald-50/30' : 'border-red-50 bg-red-50/30'} flex items-center gap-4`}>
                {s.status === 'pass' ? <CheckCircle2 className="text-emerald-500" /> : <XCircle className="text-red-400" />}
                <span className="font-bold text-slate-700">{s.value}</span>
              </div>
            ))}
          </div>

          <div className="bg-indigo-600 rounded-[2.5rem] p-10 text-white text-center">
             <p className="text-xl opacity-80 mb-2 font-bold uppercase tracking-widest">שווי הוגן מוערך (DCF)</p>
             <h3 className="text-6xl font-black mb-4">${analysisResult.dcf.base}</h3>
             <p className="text-lg font-medium opacity-90 italic">"{analysisResult.analysisNotes}"</p>
          </div>
          
          <button onClick={() => setAnalysisResult(null)} className="mt-8 text-slate-300 font-bold block mx-auto hover:text-red-500">נקה ונתח חברה אחרת</button>
        </div>
      )}
      
      {error && <div className="mt-6 text-center text-red-500 font-bold">שגיאה: {error}</div>}
    </div>
  );
};

export default App;
