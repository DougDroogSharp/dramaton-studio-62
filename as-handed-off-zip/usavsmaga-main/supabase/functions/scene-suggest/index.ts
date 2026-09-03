import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SceneContext {
  sceneName: string;
  sceneType: string;
  background: string;
  stageElements: Array<{
    type: string;
    name: string;
    position: { x: number; y: number };
    pose?: string;
    expression?: string;
  }>;
  currentScript: string;
  availableActors: string[];
  availableItems: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sceneContext } = await req.json() as { sceneContext: SceneContext };
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a creative director for visual novel games. Analyze the provided scene context and suggest improvements.

DramScript commands you can reference:
- [ENTER actor_name at x,y] - Bring an actor on stage
- [EXIT actor_name] - Remove an actor from stage  
- [MOVE item_id to x,y scale s tilt r] - Move/transform an element
- ACTOR_NAME: "dialogue text" - Character dialogue
- [WAIT seconds] - Pause execution
- [BGM "track_name" loop vol=70%] - Background music
- [SFX "sound_name"] - Sound effect
- [CHOICE] / [OPTION "text"] -> label / [/CHOICE] - Player choices

Focus on:
1. Dramatic pacing and tension
2. Visual composition and staging
3. Character interactions and dialogue
4. Atmosphere through audio/effects
5. Interactive elements for engagement`;

    const userPrompt = `Analyze this scene and provide creative suggestions:

Scene Name: ${sceneContext.sceneName}
Scene Type: ${sceneContext.sceneType}
Background: ${sceneContext.background}

Stage Elements:
${sceneContext.stageElements?.length > 0 
  ? sceneContext.stageElements.map(e => `- ${e.type}: ${e.name} at (${e.position.x}%, ${e.position.y}%)${e.pose ? ` [${e.pose}]` : ''}${e.expression ? ` (${e.expression})` : ''}`).join('\n')
  : '(empty stage)'}

Current Script:
${sceneContext.currentScript || '(no script yet)'}

Available Actors: ${sceneContext.availableActors?.join(', ') || 'none'}
Available Items: ${sceneContext.availableItems?.join(', ') || 'none'}

Provide 3-5 actionable suggestions to improve this scene.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "suggest_scene_improvements",
          description: "Return 3-5 actionable scene improvement suggestions.",
          parameters: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { 
                      type: "string",
                      description: "Short, punchy title for the suggestion"
                    },
                    description: { 
                      type: "string",
                      description: "Detailed explanation of the suggestion (2-3 sentences)"
                    },
                    category: { 
                      type: "string", 
                      enum: ["dialogue", "staging", "atmosphere", "pacing", "interaction"],
                      description: "Category of the suggestion"
                    },
                    script_snippet: { 
                      type: "string",
                      description: "Optional DramScript code example implementing the suggestion"
                    }
                  },
                  required: ["title", "description", "category"],
                  additionalProperties: false
                }
              }
            },
            required: ["suggestions"],
            additionalProperties: false
          }
        }
      }
    ];

    console.log("Calling Lovable AI for scene suggestions...");
    
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
        tools,
        tool_choice: { type: "function", function: { name: "suggest_scene_improvements" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received:", JSON.stringify(data).slice(0, 500));

    // Extract suggestions from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No suggestions returned from AI");
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify({ suggestions: parsed.suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Scene suggest error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
