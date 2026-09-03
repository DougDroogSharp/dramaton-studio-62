import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RelevanceRequest {
  newText: string;         // The new/changed text from the command
  existingTags: string[];  // Current tags on the scene/page
  contentType: 'scene' | 'page';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { newText, existingTags, contentType } = await req.json() as RelevanceRequest;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Skip if text is too short or no existing tags
    if (!newText || newText.trim().length < 10) {
      return new Response(JSON.stringify({ needsRegeneration: false, reason: "Text too short" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!existingTags || existingTags.length === 0) {
      // No tags yet - definitely needs generation
      return new Response(JSON.stringify({ needsRegeneration: true, reason: "No existing tags" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a tag relevance analyzer for a political game called "USA vs MAGA".
Your job is to quickly determine if new dialogue/text content introduces concepts not covered by existing tags.

Respond with a JSON object:
{
  "needsRegeneration": true/false,
  "reason": "brief explanation",
  "suggestedTags": ["optional", "new", "tags"] // only if needsRegeneration is true
}

Be conservative - only flag for regeneration if:
- New people are mentioned (politicians, officials, public figures)
- New government agencies appear (ICE, DOJ, FBI, etc.)
- New constitutional topics (amendments, rights)
- New significant events or dates
- Major theme shifts

Do NOT flag for:
- Minor dialogue variations
- Emotional expressions already implied by tone tags
- Generic statements`;

    const userPrompt = `EXISTING TAGS: ${existingTags.join(', ')}

NEW TEXT FROM ${contentType.toUpperCase()}:
"${newText.substring(0, 500)}"

Does this text introduce important concepts not covered by existing tags?`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite", // Fast and cheap for this simple check
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ needsRegeneration: false, reason: "Rate limited" }), {
          status: 200, // Don't block editing on rate limits
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ needsRegeneration: false, reason: "Payment required" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "{}";
    
    // Parse the response
    let result = { needsRegeneration: false, reason: "Could not parse response", suggestedTags: [] };
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, aiResponse);
    }

    console.log(`Tag relevance check: ${result.needsRegeneration ? 'NEEDS REGEN' : 'OK'} - ${result.reason}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("check-tag-relevance error:", error);
    // Don't block editing on errors - return false
    return new Response(
      JSON.stringify({ needsRegeneration: false, reason: error instanceof Error ? error.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
