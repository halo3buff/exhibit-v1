// AI Validation - Uses Gemini to check if image matches query
export async function validateImageWithAI(imageUrl, query, apiKey) {
  try {
    // Fetch image and convert to base64
    const imageRes = await fetch(imageUrl);
    const arrayBuffer = await imageRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: `Does this image match the query "${query}"? Answer only YES or NO.` },
            { inline_data: { mime_type: "image/jpeg", data: base64 } }
          ]
        }]
      })
    });

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase();
    
    return answer === 'YES';
  } catch (error) {
    console.error("[AI VALIDATION] Error:", error);
    return true; // If validation fails, give benefit of doubt
  }
}

// Batch validate multiple images
export async function batchValidate(items, query, apiKey, maxCount = 50) {
  const validatedItems = [];
  
  for (let i = 0; i < Math.min(items.length, maxCount); i++) {
    const item = items[i];
    const isValid = await validateImageWithAI(item.imageUrl, query, apiKey);
    
    if (isValid) {
      validatedItems.push(item);
    }
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return validatedItems;
}
