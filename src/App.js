import React, { useState } from 'react';

const FinancialAnalyzer = () => {
  // 1. הגדרת משתנים (States) - תמיד בתחילת הפונקציה
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const API_KEY = "המפתח_שלך_כאן"; 

  // ---------------------------------------------------------
  // 2. חלק הלוגיקה: הפונקציה startAnalysis
  // ---------------------------------------------------------
  const startAnalysis = async () => {
    if (uploadedFiles.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      // כאן אמורה להיות פונקציית ה-processFile שלך
      const filesParts = await Promise.all(uploadedFiles.map(file => processFile(file)));
      
      const requestBody = {
        contents: [{ parts: [{ text: "Analyze financial data, provide DCF and 8 Pillars. Return JSON only." }, ...filesParts] }],
        tools: [{ googleSearch: {} }], 
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
      };

      let modelName = "gemini-2.0-flash";
      let url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
      
      let response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      let data = await response.json();

      // ניסיון שני אם נגמרה המכסה
      if (!response.ok && (response.status === 429 || JSON.stringify(data).includes('quota'))) {
        modelName = "gemini-1.5-flash"; 
        url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        data = await response.json();
      }

      if (!response.ok) throw new Error(data.error?.message || "שגיאה ב-API");

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      // הפיכת הטקסט לאובייקט בצורה בטוחה
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      setAnalysisResult(JSON.parse(cleanJson));

    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ---------------------------------------------------------
  // 3. חלק התצוגה (Return): מה שהמשתמש רואה על המסך
  // ---------------------------------------------------------
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', textAlign: 'right', direction: 'rtl' }}>
      <h1 className="text-2xl font-bold mb-4">מנתח מניות פיננסי</h1>
      
      {/* כפתור הפעלה */}
      <button 
        onClick={startAnalysis}
        disabled={isAnalyzing}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {isAnalyzing ? "מנתח נתונים..." : "התחל ניתוח"}
      </button>

      {/* הצגת שגיאה - אם יש כזו */}
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 border border-red-400 rounded">
          <strong>שגיאה:</strong> {error}
        </div>
      )}

      {/* הצגת התוצאה - כאן התיקון הקריטי למניעת "דף לבן" */}
      {analysisResult && (
        <div className="mt-6 p-4 border rounded bg-gray-50 text-right">
          <h2 className="text-xl font-bold mb-2">תוצאות:</h2>
          
          {/* אנחנו משתמשים ב-JSON.stringify כדי להציג את האובייקט כטקסט */}
          <pre style={{ direction: 'ltr', textAlign: 'left', backgroundColor: '#fff', padding: '10px', overflow: 'auto' }}>
            {JSON.stringify(analysisResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default FinancialAnalyzer;
