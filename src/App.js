import React, { useState } from 'react';

const StockAnalyzer = () => {
  // --- 1. הגדרת משתנים (States) ---
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const API_KEY = "הכנס_כאן_את_המפתח_שלך"; // וודא שהמפתח שלך כאן

  // --- 2. פונקציית עזר לעיבוד קבצים (המרת קובץ לפורמט של ג'מיני) ---
  const processFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result.split(',')[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // --- 3. הפונקציה המרכזית: ניתוח הנתונים ---
  const startAnalysis = async () => {
    if (uploadedFiles.length === 0) {
      setError("נא להעלות קבצים קודם");
      return;
    }
    
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null); // איפוס תוצאות קודמות כדי למנוע בלבול

    try {
      const filesParts = await Promise.all(uploadedFiles.map(file => processFile(file)));
      
      const promptText = `Analyze financial data, provide DCF and 8 Pillars. Return JSON only.`;
      
      // הכנת גוף הבקשה (שימוש ב-googleSearch בפורמט הנכון)
      const requestBody = {
        contents: [{ parts: [{ text: promptText }, ...filesParts] }],
        tools: [{ googleSearch: {} }], 
        generationConfig: { 
          temperature: 0.1, 
          responseMimeType: "application/json" 
        }
      };

      // ניסיון ראשון - Gemini 2.0 Flash
      let modelName = "gemini-2.0-flash";
      let url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
      
      let response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      let data = await response.json();

      // אם יש שגיאת מכסה (Quota), עוברים ל-1.5 פלאש
      if (!response.ok && (response.status === 429 || JSON.stringify(data).includes('quota'))) {
        console.log("Switching to fallback model (1.5 Flash)...");
        modelName = "gemini-1.5-flash";
        url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        data = await response.json();
      }

      if (!response.ok) throw new Error(data.error?.message || "שגיאה בתקשורת עם השרת");

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("לא התקבלו נתונים מהמודל");

      // ניקוי ופענוח JSON
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(cleanJson);
      
      setAnalysisResult(parsedData); // שמירת האובייקט ב-State

    } catch (err) {
      console.error("Analysis Error:", err);
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- 4. חלק התצוגה (JSX) ---
  return (
    <div className="p-8 max-w-4xl mx-auto font-sans text-right" dir="rtl">
      <h1 className="text-3xl font-bold mb-6 text-blue-800">ניתוח דוחות פיננסיים</h1>
      
      <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
        <input 
          type="file" 
          multiple 
          onChange={(e) => setUploadedFiles(Array.from(e.target.files))}
          className="mb-4"
        />
        <p className="text-sm text-gray-500">קבצים שנבחרו: {uploadedFiles.length}</p>
      </div>

      <button 
        onClick={startAnalysis}
        disabled={isAnalyzing || uploadedFiles.length === 0}
        className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
          isAnalyzing ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isAnalyzing ? "מנתח נתונים ברגע זה..." : "התחל ניתוח עמוק"}
      </button>

      {/* תצוגת שגיאה בטוחה */}
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 border border-red-200 rounded-lg">
          <strong>אופס:</strong> {String(error)}
        </div>
      )}

      {/* תצוגת תוצאות - כאן מנענו את ה-White Screen */}
      {analysisResult && (
        <div className="mt-8 p-6 bg-white border border-gray-200 shadow-xl rounded-xl">
          <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">תוצאות הניתוח</h2>
          
          {/* הפיכת האובייקט לטקסט קריא כדי ש-React לא יקרוס */}
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96 text-left" dir="ltr">
            <pre className="text-sm font-mono">
              {JSON.stringify(analysisResult, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAnalyzer;
