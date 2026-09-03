import "https://deno.land/std@0.168.0/dotenv/load.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MouthDetectionResult {
  x: number;
  y: number;
  hasMouth: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'Image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Detecting mouth position in image...');

    // Use tool calling to get structured output
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image and find the mouth or speaking point position.

Instructions:
- If this is a character/creature with a visible mouth, find where their mouth is located
- If this is an object or item without an obvious mouth, return the center point (50, 50)
- If the mouth position is unclear or ambiguous, default to center (50, 50)

Return coordinates as percentages (0-100) from the top-left corner of the image.
- x=0 is the left edge, x=100 is the right edge
- y=0 is the top edge, y=100 is the bottom edge

Call the report_mouth_position function with your findings.`
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'report_mouth_position',
              description: 'Report the detected mouth/speaking point position in the image',
              parameters: {
                type: 'object',
                properties: {
                  x: { 
                    type: 'number', 
                    description: 'X position as percentage (0-100) from left edge of image' 
                  },
                  y: { 
                    type: 'number', 
                    description: 'Y position as percentage (0-100) from top edge of image' 
                  },
                  hasMouth: { 
                    type: 'boolean', 
                    description: 'Whether a distinct mouth or speaking point was found (false if defaulting to center)' 
                  }
                },
                required: ['x', 'y', 'hasMouth']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'report_mouth_position' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      // Return center as fallback
      return new Response(
        JSON.stringify({ x: 50, y: 50, hasMouth: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data, null, 2));

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments) as MouthDetectionResult;
        
        // Validate and clamp values to 0-100 range
        const result: MouthDetectionResult = {
          x: Math.max(0, Math.min(100, args.x ?? 50)),
          y: Math.max(0, Math.min(100, args.y ?? 50)),
          hasMouth: args.hasMouth ?? false
        };
        
        console.log('Mouth position detected:', result);
        
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (parseError) {
        console.error('Failed to parse tool call arguments:', parseError);
      }
    }

    // Fallback to center if parsing fails
    console.log('Falling back to center position');
    return new Response(
      JSON.stringify({ x: 50, y: 50, hasMouth: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in detect-mouth function:', error);
    // Always return a valid response, defaulting to center
    return new Response(
      JSON.stringify({ x: 50, y: 50, hasMouth: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
