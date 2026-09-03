import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlacementRequest {
  targetX: number;       // Target element X position (0-100)
  targetY: number;       // Target element Y position (0-100)
  mouthX: number;        // Mouth X within image (0-100)
  mouthY: number;        // Mouth Y within image (0-100)
  targetScale: number;   // Target element scale
  isThought: boolean;    // Thought bubble vs speech
  stageElements: Array<{ x: number; y: number; id: string }>; // Other elements to avoid
}

interface PlacementResponse {
  balloonX: number;
  balloonY: number;
  reasoning?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: PlacementRequest = await req.json();
    const { targetX, targetY, mouthX, mouthY, targetScale = 1, isThought = false, stageElements = [] } = requestData;
    
    console.log("Placing balloon for target at:", { targetX, targetY, mouthX, mouthY, targetScale });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context about stage layout
    const otherElements = stageElements
      .filter(el => el.x !== targetX || el.y !== targetY)
      .map(el => `Element at (${el.x}%, ${el.y}%)`)
      .join("; ");

    const systemPrompt = `You are an expert comic book letterer and cartoonist. Your job is to place speech/thought balloons following professional conventions.

Key placement rules:
1. Balloons appear ABOVE and to the SIDE of the speaker's head (never covering the face)
2. If speaker is on the LEFT side of stage (x < 50), balloon goes to the RIGHT
3. If speaker is on the RIGHT side of stage (x >= 50), balloon goes to the LEFT
4. Keep balloons within stage bounds (x: 5-95, y: 5-60)
5. Balloon should be close enough for a short, clean connecting line/tail
6. For thought bubbles, position slightly higher to accommodate the diminishing bubble trail
7. NEVER place a balloon directly over the character - offset horizontally by at least 15-20%

Return ONLY a JSON object with balloonX and balloonY as percentages (0-100).`;

    const userPrompt = `Place a ${isThought ? 'thought bubble' : 'speech balloon'} for a character:
- Character position: (${targetX}%, ${targetY}%)
- Character's mouth within their sprite: (${mouthX}%, ${mouthY}%)
- Character scale: ${targetScale}
${otherElements ? `- Other elements on stage: ${otherElements}` : ''}

Calculate the optimal balloon position following professional cartoonist conventions.`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "place_balloon",
              description: "Place a balloon at the calculated position",
              parameters: {
                type: "object",
                properties: {
                  balloonX: { 
                    type: "number", 
                    description: "Balloon X position (0-100 percentage from left)" 
                  },
                  balloonY: { 
                    type: "number", 
                    description: "Balloon Y position (0-100 percentage from top)" 
                  },
                  reasoning: { 
                    type: "string", 
                    description: "Brief explanation of placement choice" 
                  },
                },
                required: ["balloonX", "balloonY"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "place_balloon" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(JSON.stringify({ error: "Payment required, please add funds" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI response:", JSON.stringify(aiResponse, null, 2));

    // Extract tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const placement = JSON.parse(toolCall.function.arguments);
      console.log("Balloon placement calculated:", placement);
      
      // Validate and clamp values
      const result: PlacementResponse = {
        balloonX: Math.max(5, Math.min(95, placement.balloonX || 50)),
        balloonY: Math.max(5, Math.min(60, placement.balloonY || 20)),
        reasoning: placement.reasoning,
      };
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback if tool call parsing fails
    console.warn("Tool call parsing failed, using fallback placement");
    const fallback = calculateFallbackPlacement(targetX, targetY, isThought);
    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("place-balloon error:", error);
    
    // On error, return fallback placement
    try {
      const requestData = await req.clone().json();
      const fallback = calculateFallbackPlacement(
        requestData.targetX || 50, 
        requestData.targetY || 50, 
        requestData.isThought || false
      );
      return new Response(JSON.stringify(fallback), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      // Ultimate fallback
      return new Response(JSON.stringify({ balloonX: 50, balloonY: 20 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }
});

// Fallback placement logic (used if AI fails)
function calculateFallbackPlacement(targetX: number, targetY: number, isThought: boolean): PlacementResponse {
  // Determine horizontal offset based on speaker position
  const horizontalOffset = targetX < 50 ? 20 : -20;
  
  // Balloon goes above the speaker
  const verticalOffset = isThought ? -25 : -20;
  
  let balloonX = targetX + horizontalOffset;
  let balloonY = targetY + verticalOffset;
  
  // Clamp to stage bounds
  balloonX = Math.max(10, Math.min(90, balloonX));
  balloonY = Math.max(8, Math.min(55, balloonY));
  
  return {
    balloonX,
    balloonY,
    reasoning: "Fallback: positioned above and to the side of speaker",
  };
}
