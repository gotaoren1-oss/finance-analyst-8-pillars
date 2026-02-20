const callGemini = async (promptText, useSearch = false) => {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error("חסר מפתח API");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const payload = {
      contents: [{ parts: [{ text: promptText + "\n\nIMPORTANT: Return ONLY valid JSON. No conversational text." }] }],
      generationConfig: { 
        temperature: 0.1 // נמוך מאוד כדי להישאר בפורמט
      }
    };

    if (useSearch) {
      payload.tools = [{ "google_search": {} }];
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "שגיאה בתקשורת");

    // חילוץ הטקסט וניקוי שאריות אם קיימות
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // פונקציית חילוץ JSON ידנית חזקה
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log("Raw text from AI:", text); // עוזר לנו לדבג אם יש בעיה
      throw new Error("ה-AI לא החזיר מבנה נתונים תקין. נסה שוב.");
    }
    
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error("נכשל בפענוח הנתונים מה-AI.");
    }
  };

  const startAnalysis = async () => {
    if (uploadedFiles.length === 0) return;
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const filesData = await Promise.all(uploadedFiles.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsText(file);
        });
      }));

      const combinedContent = filesData.join('\n').slice(0, 10000);

      // הוראות ברורות ללא התנגשות טכנית
      const prompt = `
        Analyze this: ${combinedContent}
        Perform 8 Pillars analysis and 10Y DCF in Hebrew.
        Return ONLY this JSON structure:
        {
          "companyName": "שם החברה",
          "ticker": "TICKER",
          "score": 8,
          "pillarsStatus": [
            {"id": 1, "status": "pass", "value": "תיאור"},
            {"id": 2, "status": "fail", "value": "תיאור"},
            {"id": 3, "status": "pass", "value": "תיאור"},
            {"id": 4, "status": "pass", "value": "תיאור"},
            {"id": 5, "status": "pass", "value": "תיאור"},
            {"id": 6, "status": "pass", "value": "תיאור"},
            {"id": 7, "status": "pass", "value": "תיאור"},
            {"id": 8, "status": "pass", "value": "תיאור"}
          ],
          "dcf": {"conservative": 100, "base": 120, "optimistic": 140, "marketPrice": 110, "marginOfSafety": 10},
          "analysisNotes": "סיכום מקצועי בעברית"
        }
      `;

      const result = await callGemini(prompt, true);
      setAnalysisResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };
