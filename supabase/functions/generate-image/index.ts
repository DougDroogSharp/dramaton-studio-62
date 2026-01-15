import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
          text: "STYLE REFERENCE - Maintain this art style while editing:"
        });
        content.push({
          type: "image_url",
          image_url: { url: styleGuide }
        });
      }
      
      content.push({
        type: "text",
        text: `EDIT INSTRUCTIONS: ${prompt}`
      });
    } 
    // GENERATION MODE: Create new image
    else {
      // Start with style guide instruction if provided
      if (styleGuide) {
        content.push({
          type: "text",
          text: "STYLE REFERENCE - Match this art style exactly:"
        });
        content.push({
          type: "image_url",
          image_url: { url: styleGuide }
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

      // Add the main generation prompt
      content.push({
        type: "text",
        text: prompt
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Image operation mode:", editMode ? "EDIT" : "GENERATE");
    console.log("Prompt:", prompt);
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
    
    // Extract the generated image
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textResponse = data.choices?.[0]?.message?.content;

    if (!imageUrl) {
      console.error("No image in response:", JSON.stringify(data));
      throw new Error("No image generated");
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
