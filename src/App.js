const startAnalysis = async () => {
  if (uploadedFiles.length === 0) return;
  setIsAnalyzing(true);
  setError(null);

  try {
    const filesParts = await Promise.all(uploadedFiles.map(file => processFile(file)));
    
    let modelName = "gemini-2.0-flash";
    let url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
    
    const promptText = `Analyze financial data, provide DCF and 8 Pillars. Return JSON only.`;

    // ריכזנו את גוף הבקשה כדי למנוע כפילויות של קוד
    // שים לב לתיקון הקריטי: googleSearch במקום google_search
    const requestBody = {
      contents: [{ parts: [{ text: promptText }, ...filesParts] }],
      tools: [{ googleSearch: {} }], 
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
    };

    let response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    let data = await response.json();

    // בדיקה חזקה יותר למכסה: סטטוס 429 או המילה quota באותיות קטנות/גדולות
    const isQuotaError = !response.ok && (response.status === 429 || data.error?.message?.toLowerCase().includes('quota'));

    if (isQuotaError) {
      console.log("Switching to fallback model due to quota...");
      modelName = "gemini-1.5-flash"; 
      url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
      
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody) // שימוש באותו גוף בקשה
      });
      data = await response.json();
    }

    // אם עדיין יש שגיאה (לאחר רשת הביטחון או שגיאה אחרת)
    if (!response.ok) {
      throw new Error(data.error?.message || `API Error: ${response.status}`);
    }

    // חילוץ בטוח של הטקסט
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!rawText) {
      throw new Error("No text returned from API (possible safety block or empty response).");
    }

    setAnalysisResult(JSON.parse(rawText));
    
  } catch (err) {
    console.error("Analysis Error:", err);
    setError(err.message);
  } finally {
    setIsAnalyzing(false);
  }
};
