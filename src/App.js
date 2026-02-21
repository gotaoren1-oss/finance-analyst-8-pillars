return (
  <div className="p-4">
    {/* הצגת שגיאות בצורה בטוחה */}
    {error && (
      <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
        <strong>שגיאה:</strong> {error}
      </div>
    )}

    {/* כפתור הפעלה */}
    <button 
      onClick={startAnalysis} 
      disabled={isAnalyzing || uploadedFiles.length === 0}
      className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
    >
      {isAnalyzing ? "מנתח נתונים..." : "התחל ניתוח"}
    </button>

    {/* תצוגת תוצאות - כאן קרה הקראש הקודם */}
    {analysisResult && (
      <div className="mt-6 p-4 border rounded bg-gray-50">
        <h2 className="text-xl font-bold mb-2">תוצאות הניתוח:</h2>
        
        {/* במקום לכתוב {analysisResult}, אנחנו מדפיסים אותו כטקסט מעוצב */}
        <pre className="whitespace-pre-wrap text-sm bg-white p-2 border">
          {JSON.stringify(analysisResult, null, 2)}
        </pre>
      </div>
    )}
  </div>
);
