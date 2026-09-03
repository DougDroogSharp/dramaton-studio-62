import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OPTIMIZED: Shorter style text = fewer tokens = lower cost
const ENFORCED_STYLE = `STYLE: Bold black outlines, flat solid colors only, NO shading/gradients/3D. Vector/cel-shaded look.`;

// Input validation limits
const MAX_PROMPT_LENGTH = 2000;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB base64

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required. Please log in.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session. Please log in again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log(`User ${userId} requesting image generation`);

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
      aspectRatio,         // Aspect ratio for generation (e.g., "16:9", "1:1")
    } = await req.json();

    // Input validation
    if (prompt && prompt.length > MAX_PROMPT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Prompt too long (max ${MAX_PROMPT_LENGTH} characters)` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate image sizes (rough check on base64 string length)
    const images = [referenceImageCloseUp, referenceImageFullBody, styleGuide, referenceImage, existingImage];
    for (const img of images) {
      if (img && img.length > MAX_IMAGE_SIZE) {
        return new Response(
          JSON.stringify({ error: 'Image too large. Please use smaller reference images.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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
      // OPTIMIZED: Only send style guide image OR text, not redundant both
      if (styleGuide) {
        content.push({
          type: "text",
          text: enforceStyleGuide ? `MATCH THIS STYLE. ${ENFORCED_STYLE}` : "Match this art style:"
        });
        content.push({
          type: "image_url",
          image_url: { url: styleGuide }
        });
      } else if (enforceStyleGuide) {
        content.push({
          type: "text",
          text: ENFORCED_STYLE
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

      // Add aspect ratio instruction to the prompt for non-character images
      let finalPrompt = prompt;
      if (aspectRatio && !isCharacter) {
        // Enforce aspect ratio in the prompt for better results
        const aspectRatioText = aspectRatio === "16:9" 
          ? "CRITICAL: Generate image in 16:9 widescreen landscape format (1920x1080 proportions). The image MUST be wider than it is tall."
          : aspectRatio === "1:1" 
            ? "CRITICAL: Generate image in 1:1 square format."
            : `CRITICAL: Generate image in ${aspectRatio} aspect ratio.`;
        finalPrompt = `${aspectRatioText}\n\n${prompt}`;
      }

      // OPTIMIZED: Don't repeat style text in prompt - already sent above
      content.push({
        type: "text",
        text: finalPrompt
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Image operation mode:", editMode ? "EDIT" : "GENERATE");
    console.log("User:", userId);
    console.log("Prompt length:", prompt?.length || 0);
    console.log("Style lock enabled:", !!enforceStyleGuide);
    console.log("Has style guide:", !!styleGuide);
    console.log("Has composition reference:", !!referenceImage);
    console.log("Has close-up reference:", !!referenceImageCloseUp);
    console.log("Has full-body reference:", !!referenceImageFullBody);
    console.log("Has existing image (for edit):", !!existingImage);
    console.log("Total content parts:", content.length);
    console.log("Aspect ratio:", aspectRatio || "default");

    const requestBody: Record<string, unknown> = {
      model: "google/gemini-2.5-flash-image",
      messages: [
        {
          role: "user",
          content
        }
      ],
      modalities: ["image", "text"]
    };

    // Add aspect ratio if specified
    if (aspectRatio) {
      requestBody.aspectRatio = aspectRatio;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify(requestBody)
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

    console.log("Image generated successfully for user:", userId);

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
