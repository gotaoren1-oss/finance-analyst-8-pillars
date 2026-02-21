// החלף את פונקציית startAnalysis בקוד שלך בזו:

const startAnalysis = async () => {
  if (uploadedFiles.length === 0) return;
  setIsAnalyzing(true);
  setError(null);

  try {
    const filesParts = await Promise.all(uploadedFiles.map(file => processFile(file)));
    
    // ניסיון ראשון עם המודל שאתה אוהב (2.0)
    let modelName = "gemini-2.0-flash";
    let url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
    
    const promptText = `Analyze financial data, provide DCF and 8 Pillars. Return JSON only.`;

    let response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }, ...filesParts] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
      })
    });

    let data = await response.json();

    // בדיקה: אם המכסה היא 0 (כמו שקרה לך), ננסה מיד עם מודל 1.5 Flash
    if (!response.ok && data.error?.message?.includes('quota')) {
      console.log("Switching to fallback model due to quota...");
      modelName = "gemini-1.5-flash"; // מודל עם מכסה הרבה יותר גדולה
      url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
      
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }, ...filesParts] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
        })
      });
      data = await response.json();
    }

    if (!response.ok) throw new Error(data.error?.message || "Quota Exceeded on all models.");

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    setAnalysisResult(JSON.parse(rawText));
  } catch (err) {
    setError(err.message);
  } finally {
    setIsAnalyzing(false);
  }
};
