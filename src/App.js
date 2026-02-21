import React, { useState } from 'react';
import { 
  Loader2, AlertCircle, TrendingUp, Info, LayoutDashboard, Database, ShieldCheck 
} from 'lucide-react';

const App = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [error, setError] = useState(null);

  const API_KEY = "AIzaSyB270SKgNHn0lpP2Qvjy7KG5yKRwvSfDJM";

  const processFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      // הגנה מקריסת דפדפן: קבצים מעל 15MB לא יומרו לטקסט מלא
      if (file.size > 15 * 1024 * 1024) {
        resolve({ text: `File ${file.name} is too large. Base the analysis on real-time Google Search data.` });
        return;
      }

      reader.onload = () => {
        try {
          const base64Data = reader.result.split(',')[1];
          resolve({
            inlineData: { data: base64Data, mimeType: file.type || "application/pdf" }
          });
        } catch (e) {
          reject(new Error("שגיאה בהמרת הקובץ. נסה קובץ קטן יותר."));
        }
      };
      
      reader.onerror = () => reject(new Error("שגיאה בקריאת הקובץ מהמחשב."));
      reader.readAsDataURL(file);
    });
  };

  const startAnalysis = async () => {
    if (uploadedFiles.length === 0) return;
    
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const filesParts = await Promise.all(uploadedFiles.map(file => processFile(file)));
      
      const promptText = `
        Analyze these financial docs as a senior analyst. 
        Perform 8 Pillars analysis and calculate 10Y DCF. 
        Use Google Search for the latest stock price.
        Return ONLY valid JSON:
        {
          "companyName": "string",
          "ticker": "string",
          "currency": "string",
          "score": number,
          "pillarsStatus": [{"id": number, "status": "pass/fail", "value": "string"}],
          "dcf": {"conservative": number, "base": number, "optimistic": number, "marketPrice": number, "marginOfSafety": number},
          "verdict": {"recommendation": "קנייה/החזקה/מכירה", "reason": "Hebrew string"},
          "analysisNotes": "Hebrew string"
        }
      `;

      const requestBody = {
        contents: [{ parts: [{ text: promptText }, ...filesParts] }],
        tools: [{ google_search: {} }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      };

      // ניסיון ראשון: המודל העוצמתי (Gemini 2.5 Flash)
      let currentModel = "gemini-2.5-flash";
      let url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${API_KEY}`;
      
      let response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      let data = await response.json();

      // מנגנון אל-כשל (Fallback): אם נחסמנו בגלל מכסה, עוברים למודל הלייט
      if (!response.ok && (data.error?.message?.includes('quota') || data.error?.code === 429)) {
        console.warn("Quota exceeded on 2.5 Flash. Switching to 2.5 Flash-Lite...");
        currentModel = "gemini-2.5-flash-lite";
        url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${API_KEY}`;
        
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        
        data = await response.json();
      }

      // אם גם השני נכשל, זורקים שגיאה מסודרת
      if (!response.ok) {
        throw new Error(data.error?.message || "שגיאת שרת לא ידועה.");
      }

      let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("המודל לא החזיר נתונים. נסה מסמך קצר יותר.");

      // הגנה נוספת: ניקוי סימוני Markdown למקרה שהמודל החזיר אותם למרות ההנחיות
      rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

      setAnalysisResult(JSON.parse(rawText));
    } catch (err) {
      console.error("System Error:", err);
      // תרגום שגיאת המכסה לעברית מובנת
      if (err.message.includes('quota') || err.message.includes('limit: 0')) {
        setError("מכסת ה-API החינמית הסתיימה לחלוטין בשני המודלים. יש להמתין כשעה או להשתמש במפתח חדש.");
      } else {
        setError(`שגיאת מערכת: ${err.message}`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans" dir="rtl">
      <div className="bg-[#0a1224] border-b border-blue-500/20 px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-blue-400" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Engine: Gemini 2.5 Series</span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase">System Secure</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-600 rounded-3xl shadow-xl transform -rotate-2">
              <TrendingUp className="text-white" size={32} />
            </div>
            <h1 className="text-4xl font-black italic text-white uppercase tracking-tighter">WallSt<span className="text-blue-500">Terminal</span></h1>
          </div>
        </header>

        {!analysisResult && !isAnalyzing ? (
          <div className="max-w-xl mx-auto bg-slate-900/60 p-16 rounded-[3rem] text-center border border-white/5 shadow-2xl">
            <LayoutDashboard className="mx-auto text-blue-500/20 mb-6" size={64} />
            <h2 className="text-3xl font-bold text-white mb-4 italic">ניתוח נכס מקיף</h2>
            <p className="text-slate-400 mb-10 text-sm">העלה קובץ PDF (עד 15MB). המערכת תבחר אוטומטית את מודל ה-2.5 הזמין ביותר ותחשב שווי הוגן.</p>
            
            <input 
              type="file" 
              className="hidden" 
              id="file-upload" 
              onChange={e => setUploadedFiles(Array.from(e.target.files))} 
              multiple 
              accept="application/pdf"
            />
            
            <label htmlFor="file-upload" className="bg-white/5 border border-white/10 text-white px-10 py-5 rounded-2xl font-bold cursor-pointer hover:bg-white/10 transition-all inline-block mb-4">
              {uploadedFiles.length > 0 ? `${uploadedFiles.length} קבצים נבחרו` : 'בחר מסמכים'}
            </label>

            {uploadedFiles.length > 0 && (
              <button 
                onClick={startAnalysis} 
                className="block w-full bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-2xl font-black uppercase text-sm shadow-2xl shadow-blue-900/40 transition-all mt-6"
              >
                Launch Analysis
              </button>
            )}
          </div>
        ) : isAnalyzing ? (
          <div className="text-center py-32">
            <Loader2 className="animate-spin mx-auto text-blue-500 mb-8 opacity-40" size={100} />
            <h2 className="text-3xl font-black text-white italic animate-pulse">Deep Scanning In Progress...</h2>
            <p className="text-slate-500 mt-4 font-mono text-xs uppercase tracking-[0.3em]">Processing Financial Architecture</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-1000">
            <div className="bg-[#0a1224] rounded-[3rem] p-10 border border-white/10 flex flex-col md:flex-row justify-between items-center gap-10">
              <div>
                <span className="text-blue-400 font-bold tracking-widest text-xs uppercase">{analysisResult.ticker}</span>
                <h2 className="text-7xl font-black text-white uppercase tracking-tighter">{analysisResult.companyName}</h2>
              </div>
              <div className="bg-blue-600 px-16 py-10 rounded-[2.5rem] text-center min-w-[300px]">
                <div className="text-[10px] font-bold uppercase opacity-60 mb-2">Recommendation</div>
                <div className="text-5xl font-black">{analysisResult.verdict.recommendation}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-950 p-14 rounded-[3.5rem] text-white">
                <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-6">Intrinsic Value (Base Case)</p>
                <h3 className="text-[10rem] font-black leading-none">{analysisResult.currency}{analysisResult.dcf.base}</h3>
                <div className="mt-8 inline-block bg-white/10 px-6 py-3 rounded-xl border border-white/10">
                  <span className="font-bold uppercase italic">Margin of Safety: {analysisResult.dcf.marginOfSafety}%</span>
                </div>
              </div>
              
              <div className="bg-slate-900 p-10 rounded-[3.5rem] border border-white/5 flex flex-col justify-center italic">
                <h4 className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase mb-4"><Info size={16}/> Analyst Insight</h4>
                <p className="text-xl text-slate-300 leading-relaxed">"{analysisResult.verdict.reason}"</p>
              </div>
            </div>

            <button onClick={() => setAnalysisResult(null)} className="mx-auto block text-slate-500 underline text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">Start New Terminal Session</button>
          </div>
        )}

        {error && (
          <div className="max-w-xl mx-auto mt-10 bg-red-500/10 border border-red-500/20 p-8 rounded-[2.5rem] flex items-center gap-6 text-red-400 shadow-xl">
            <AlertCircle size={32} />
            <div className="text-sm font-bold leading-relaxed">
              <span className="block uppercase text-[10px] opacity-60 mb-1">System Notice</span>
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
