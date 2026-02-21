// 1. וודא שה-State שלך מוגדר ככה בתחילת הקומפוננטה:
const [analysisResult, setAnalysisResult] = useState(null);
const [error, setError] = useState(null);
const [isAnalyzing, setIsAnalyzing] = useState(false);

// 2. הפונקציה המעודכנת והבטוחה:
const startAnalysis = async () => {
  if (!uploadedFiles || uploadedFiles.length === 0) {
    setError("נא להעלות קבצים תחילה.");
    return;
  }
  
  setIsAnalyzing(true);
  setError(null);
  setAnalysisResult(null);

  try {
    // עיבוד קבצים - הוספנו בדיקה לכל קובץ
    const filesParts = await Promise.all(
      uploadedFiles.map(async (file) => {
        try {
          return await processFile(file);
        } catch (e) {
          throw new Error(`שגיאה בעיבוד הקובץ ${file.name}`);
        }
      })
    );
    
    const promptText = `Analyze financial data, provide DCF and 8 Pillars. Return JSON only.`;
    const requestBody = {
      contents: [{ parts: [{ text: promptText }, ...filesParts] }],
      tools: [{ googleSearch: {} }], 
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
    };

    // ניסיון ראשון - Gemini 2.0
    let modelName = "gemini-2.0-flash";
    let url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
    
    let response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    let data = await response.json();

    // בדיקת מכסה (Quota) ומעבר ל-1.5 פלאש
    if (!response.ok && (response.status === 429 || JSON.stringify(data).includes('quota'))) {
      console.warn("Quota full, switching to 1.5 Flash...");
      modelName = "gemini-1.5-flash";
      url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      data = await response.json();
    }

    if (!response.ok) {
      throw new Error(data.error?.message || "שגיאה בתקשורת עם השרת");
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("השרת החזיר תשובה ריקה");

    // פענוח בטוח
    try {
      const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      setAnalysisResult(parsed); // כאן אנחנו שומרים אובייקט
    } catch (e) {
      console.error("JSON Parse Error:", rawText);
      setError("המידע שחזר מהשרת אינו בפורמט תקין.");
    }

  } catch (err) {
    console.error("Critical Error:", err);
    setError(err.message);
  } finally {
    setIsAnalyzing(false);
  }
};

// 3. חלק ה-JSX (מה שמוצג על המסך) - זה החלק שמונע "דף לבן":
return (
  <div className="p-6 max-w-4xl mx-auto">
    <button 
      onClick={startAnalysis}
      disabled={isAnalyzing}
      className="bg-blue-500 text-white p-2 rounded"
    >
      {isAnalyzing ? "מנתח..." : "התחל ניתוח"}
    </button>

    {/* הצגת שגיאה בצורה בטוחה (מחרוזת בלבד) */}
    {error && (
      <div className="mt-4 p-4 bg-red-100 text-red-800 rounded">
        {String(error)} 
      </div>
    )}

    {/* הצגת תוצאה בצורה שלא קורסת */}
    {analysisResult && (
      <div className="mt-6 p-4 border rounded bg-white shadow">
        <h2 className="text-xl font-bold border-b pb-2 mb-4">תוצאות:</h2>
        
        {/* שימוש ב-pre ו-JSON.stringify מונע מ-React לקרוס על אובייקטים */}
        <pre className="overflow-auto max-h-96 text-left dir-ltr bg-gray-50 p-4 rounded text-xs">
          {JSON.stringify(analysisResult, null, 2)}
        </pre>
      </div>
    )}
  </div>
);
