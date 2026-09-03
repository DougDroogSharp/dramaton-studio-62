import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TagRequest {
  contentType: 'scene' | 'page';
  title: string;
  content: string; // DramScript or HTML content
  actors?: string[]; // Actor names present in scene
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contentType, title, content, actors } = await req.json() as TagRequest;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const actorList = actors && actors.length > 0 
      ? `ACTORS PRESENT: ${actors.join(', ')}` 
      : '';

    const systemPrompt = `You are a search tag generator for a political resistance game called "USA vs MAGA". 
Generate 5-15 search tags to help players find this content later.

Tags should be:
- All lowercase
- No special characters except spaces within tags
- Most specific/important tags first
- No duplicates

Focus on:
- People mentioned (full names like "stephen miller", "peter thiel")
- Topics and themes (immigration, voting rights, corruption)
- Constitutional amendments (e.g., "1st amendment", "5th amendment")
- Government agencies (e.g., "ice", "doj", "fbi", "dhs")
- Specific events or dates (e.g., "january 6", "family separation", "government shutdown")
- Locations if relevant
- Emotional tone (e.g., "resistance win", "outrage", "hope")

Return ONLY a JSON array of strings. Example:
["stephen miller", "ice", "family separation", "5th amendment", "due process", "children", "detention", "2026-01"]`;

    const userPrompt = `Analyze this game content and generate search tags.

CONTENT TYPE: ${contentType.toUpperCase()}
TITLE: ${title}
${actorList}

CONTENT:
${content.substring(0, 4000)}

Return ONLY a JSON array of lowercase tag strings.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "[]";
    
    // Parse the JSON array from the response
    let tags: string[] = [];
    try {
      // Extract JSON array from response (might have markdown formatting)
      const jsonMatch = aiResponse.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        tags = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse tags:", parseError, aiResponse);
      // Fallback: try to extract tags from text
      tags = aiResponse
        .replace(/[\[\]"']/g, '')
        .split(',')
        .map((t: string) => t.trim().toLowerCase())
        .filter((t: string) => t.length > 0);
    }

    // Clean and dedupe tags
    tags = [...new Set(
      tags
        .map(t => t.toLowerCase().trim())
        .filter(t => t.length > 0 && t.length < 50)
    )];

    console.log(`Generated ${tags.length} tags for ${contentType}: ${title}`);

    return new Response(JSON.stringify({ tags }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-tags error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
