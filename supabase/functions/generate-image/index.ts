import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// The enforced style description when styleLock is ON - VERY EMPHATIC to override model tendencies
const ENFORCED_STYLE = `MANDATORY ART STYLE REQUIREMENTS (STRICTLY ENFORCE):
1. BOLD BLACK OUTLINES around all shapes and forms
2. SIMPLE FLAT COLOR FILLS only - solid colors with NO variation within each area
3. ABSOLUTELY NO SHADING - no gradients, no soft shadows, no lighting effects, no color transitions
4. ABSOLUTELY NO 3D RENDERING or realistic lighting
5. Only a FEW THIN INTERIOR DETAIL LINES for facial features, clothing folds, etc.
6. Think: clean vector illustration, comic book style, or cel-shaded animation
7. Each color area should be ONE SOLID COLOR with hard edges

NEGATIVE: Do NOT add any shading, gradients, soft shadows, ambient occlusion, or realistic lighting effects.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      prompt, 
      referenceImageCloseUp, 
      referenceImageFullBody, 
      styleGuide,
      referenceImage,      // Composition/layout reference for backgrounds
      existingImage,       // Current image for editing
      editMode,            // Whether we're editing vs generating
      enforceStyleGuide,   // Style lock toggle - adds strong style instructions
      isCharacter,         // Whether this is a character sprite (needs green background)
    } = await req.json();

    // Build message content with multiple images
    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    // EDIT MODE: Modify an existing image
    if (editMode && existingImage) {
      content.push({
        type: "text",
        text: "CURRENT IMAGE - Edit this image according to the instructions that follow. Keep the overall scene but apply the requested modifications:"
      });
      content.push({
        type: "image_url",
        image_url: { url: existingImage }
      });
      
      // Add style reference if available
      if (styleGuide) {
        content.push({
          type: "text",
          text: enforceStyleGuide 
            ? `STYLE REFERENCE - YOU MUST MATCH THIS EXACT ART STYLE. ${ENFORCED_STYLE}`
            : "STYLE REFERENCE - Match this art style while editing:"
        });
        content.push({
          type: "image_url",
          image_url: { url: styleGuide }
        });
      } else if (enforceStyleGuide) {
        // No style guide image but style lock is on - add text-only style instruction
        content.push({
          type: "text",
          text: ENFORCED_STYLE
        });
      }
      
      // Build edit instructions - only add green background for character sprites
      let editInstructions = `EDIT INSTRUCTIONS: ${prompt}`;
      if (isCharacter) {
        editInstructions += `

CRITICAL BACKGROUND INSTRUCTION: After making the edits, the character MUST be rendered on a SOLID BRIGHT GREEN BACKGROUND (#00FF00). Replace any existing background with pure solid green (#00FF00). This is essential for chroma-key compositing. No gradients, no shadows on background.`;
      }
      
      content.push({
        type: "text",
        text: editInstructions
      });
    } 
    // GENERATION MODE: Create new image
    else {
      // Start with style guide instruction if provided
      if (styleGuide) {
        content.push({
          type: "text",
          text: enforceStyleGuide
            ? `CRITICAL STYLE REFERENCE - YOU MUST MATCH THIS EXACT ART STYLE WITH ABSOLUTE PRECISION. ${ENFORCED_STYLE} Do not deviate from this style under any circumstances:`
            : "STYLE REFERENCE - Match this art style exactly:"
        });
        content.push({
          type: "image_url",
          image_url: { url: styleGuide }
        });
      } else if (enforceStyleGuide) {
        // No style guide image but style lock is on - add text-only style instruction
        content.push({
          type: "text",
          text: `CRITICAL STYLE REQUIREMENT: ${ENFORCED_STYLE}`
        });
      }

      // Add composition/layout reference for backgrounds
      if (referenceImage) {
        content.push({
          type: "text",
          text: "COMPOSITION REFERENCE - Use this image as a guide for layout, perspective, and spatial arrangement. Match the general composition and camera angle:"
        });
        content.push({
          type: "image_url",
          image_url: { url: referenceImage }
        });
      }

      // Add close-up reference if provided (for characters)
      if (referenceImageCloseUp) {
        content.push({
          type: "text",
          text: "CHARACTER FACE REFERENCE - This is the character's face. Match these facial features exactly:"
        });
        content.push({
          type: "image_url",
          image_url: { url: referenceImageCloseUp }
        });
      }

      // Add full-body reference if provided (for characters)
      if (referenceImageFullBody) {
        content.push({
          type: "text",
          text: "CHARACTER BODY REFERENCE - This is the character's full body. Match body proportions and clothing:"
        });
        content.push({
          type: "image_url",
          image_url: { url: referenceImageFullBody }
        });
      }

      // Add the main generation prompt with style reminder if enforced
      if (enforceStyleGuide) {
        content.push({
          type: "text",
          text: `${prompt}\n\nREMINDER: ${ENFORCED_STYLE}`
        });
      } else {
        content.push({
          type: "text",
          text: prompt
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Image operation mode:", editMode ? "EDIT" : "GENERATE");
    console.log("Prompt:", prompt);
    console.log("Style lock enabled:", !!enforceStyleGuide);
    console.log("Has style guide:", !!styleGuide);
    console.log("Has composition reference:", !!referenceImage);
    console.log("Has close-up reference:", !!referenceImageCloseUp);
    console.log("Has full-body reference:", !!referenceImageFullBody);
    console.log("Has existing image (for edit):", !!existingImage);
    console.log("Total content parts:", content.length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content
          }
        ],
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // Check for content policy violations
    const finishReason = data.choices?.[0]?.native_finish_reason || data.choices?.[0]?.finish_reason;
    if (finishReason === "IMAGE_PROHIBITED_CONTENT" || finishReason === "SAFETY") {
      console.error("Content policy violation:", finishReason);
      return new Response(
        JSON.stringify({ 
          error: "Image generation blocked by content policy. Try a different pose, expression, or angle. Certain combinations (like 'Crouch' from behind) may trigger safety filters." 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Extract the generated image
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textResponse = data.choices?.[0]?.message?.content;

    if (!imageUrl) {
      console.error("No image in response:", JSON.stringify(data));
      // Check if there's a specific reason
      const reason = data.choices?.[0]?.finish_reason || "unknown";
      throw new Error(`No image generated (reason: ${reason}). Try adjusting the pose or expression.`);
    }

    console.log("Image generated successfully, length:", imageUrl.length);

    return new Response(
      JSON.stringify({ imageUrl, message: textResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error("Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
