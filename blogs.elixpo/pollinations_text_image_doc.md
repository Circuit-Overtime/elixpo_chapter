Chat Completions​Copy link
Generate text responses using AI models. Fully compatible with the OpenAI Chat Completions API — use any OpenAI SDK by pointing it to https://gen.pollinations.ai.

Supports streaming, function calling, vision (image input), structured outputs, and reasoning/thinking modes depending on the model.

Body
application/json
messagesCopy link to messages
Type:array
required
Show Child Attributesfor messages
audioCopy link to audio
Type:object
Show Child Attributesfor audio
frequency_penaltyCopy link to frequency_penalty
Type:number
min:  
-2
max:  
2
nullable
Default
function_callCopy link to function_call

Any of
string
Type:string
enum
values
none
auto
functionsCopy link to functions
Type:array object[]
1…128
Show Child Attributesfor functions
logit_biasCopy link to logit_bias
Type:object
nullable
Default
Show Child Attributesfor logit_bias
logprobsCopy link to logprobs
Type:boolean
nullable
Default
max_tokensCopy link to max_tokens
Type:integer
min:  
0
max:  
9007199254740991
nullable
Integer numbers.

modalitiesCopy link to modalities
Type:array string[]
enum
values
text
audio
modelCopy link to model
Type:string
Default
AI model for text generation. See /v1/models for full list.

parallel_tool_callsCopy link to parallel_tool_calls
Type:boolean
Default
presence_penaltyCopy link to presence_penalty
Type:number
min:  
-2
max:  
2
nullable
Default
Show additional propertiesfor Request Body
Responses

200
Success
application/json

400
Something was wrong with the input data, check the details for more info.
application/json

401
Authentication required. Please provide an API key via Authorization header (Bearer token) or ?key= query parameter.
application/json

402
Insufficient pollen balance or API key budget exhausted.
application/json

403
Access denied! You don't have the required permissions for this resource or model.
application/json

429
You're making requests too quickly. Please slow down a bit.
application/json

500
Oh snap, something went wrong on our end. We're on it!
application/json
Request Example forpost/v1/chat/completions
JavaScript Fetch
fetch('https://gen.pollinations.ai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer YOUR_SECRET_TOKEN'
  },
  body: JSON.stringify({
    messages: [
      {
        content: '',
        role: 'system',
        name: '',
        cache_control: {
          type: 'ephemeral'
        }
      }
    ],
    model: 'openai',
    modalities: ['text'],
    audio: {
      voice: 'alloy',
      format: 'wav'
    },
    frequency_penalty: 0,
    repetition_penalty: 0,
    logit_bias: null,
    logprobs: false,
    top_logprobs: 0,
    max_tokens: 0,
    presence_penalty: 0,
    response_format: {
      type: 'text'
    },
    seed: -1,
    stop: '',
    stream: false,
    stream_options: {
      include_usage: true
    },
    thinking: {
      type: 'disabled',
      budget_tokens: 1
    },
    reasoning_effort: 'none',
    thinking_budget: 0,
    temperature: 1,
    top_p: 1,
    tools: [
      {
        type: 'function',
        function: {
          description: '',
          name: '',
          parameters: {
            additionalProperty: 'anything'
          },
          strict: false
        }
      }
    ],
    tool_choice: 'none',
    parallel_tool_calls: true,
    user: '',
    function_call: 'none',
    functions: [
      {
        description: '',
        name: '',
        parameters: {
          additionalProperty: 'anything'
        }
      }
    ]
  })
})


Test Request
(post /v1/chat/completions)
Status:200
Status:400
Status:401
Status:402
Status:403
Status:429
Status:500

{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1700000000,
  "model": "openai",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 12,
    "total_tokens": 22
  }
}

Success

Simple Text Generation​Copy link
Generate text from a prompt via a simple GET request. Returns plain text.

This is a simplified alternative to the OpenAI-compatible /v1/chat/completions endpoint — ideal for quick prototyping or simple integrations.

Path Parameters
promptCopy link to prompt
Type:string
min length:  
1
required
Example
Text prompt for generation

Query Parameters
modelCopy link to model
Type:string
enum
Default
Text model to use. See /v1/models or /text/models for the full list of available models.

values
openai
openai-fast
openai-large
qwen-coder
mistral
Show all values
seedCopy link to seed
Type:integer
min:  
-1
max:  
9007199254740991
Default
Seed for reproducible results. Use -1 for random.

systemCopy link to system
Type:string
System prompt to set the model's behavior and context. Acts as initial instructions before the user prompt.

jsonCopy link to json
Type:boolean
Default
When true, the model returns valid JSON. Useful for structured data extraction.

temperatureCopy link to temperature
Type:number
Controls randomness. Lower values (e.g. 0.2) produce more focused output, higher values (e.g. 1.5) produce more creative output. Range: 0.0 to 2.0.

streamCopy link to stream
Type:boolean
Default
Stream the response as it's generated, using Server-Sent Events (SSE). Each chunk contains partial text.

Responses

200
Generated text response
text/plain

400
Something was wrong with the input data, check the details for more info.
application/json

401
Authentication required. Please provide an API key via Authorization header (Bearer token) or ?key= query parameter.
application/json

402
Insufficient pollen balance or API key budget exhausted.
application/json

403
Access denied! You don't have the required permissions for this resource or model.
application/json

429
You're making requests too quickly. Please slow down a bit.
application/json

500
Oh snap, something went wrong on our end. We're on it!
application/json
Request Example forget/text/{prompt}
JavaScript Fetch
fetch('https://gen.pollinations.ai/text/Write a haiku about coding', {
  headers: {
    Authorization: 'Bearer YOUR_SECRET_TOKEN'
  }
})


Test Request
(get /text/{prompt})
Status:200
Status:400
Status:401
Status:402
Status:403
Status:429
Status:500
string

Generated text response

🖼️ Image Generation ​Copy link
Generate images from text prompts via a simple GET request. Returns JPEG or PNG.

Quick start — paste in your browser, no code needed:

https://gen.pollinations.ai/image/a%20cat%20in%20space?model=flux
Available models: kontext, nanobanana, nanobanana-2, nanobanana-pro, seedream5, seedream, seedream-pro, gptimage, gptimage-large, flux, zimage, qwen-image, grok-imagine, grok-imagine-pro, klein, p-image, p-image-edit, nova-canvas

Key parameters: model, width, height, seed, enhance, negative_prompt, image (for editing), quality, transparent

OpenAI SDK: Also available via POST /v1/images/generations and POST /v1/images/edits — use any OpenAI SDK with base_url="https://gen.pollinations.ai/v1".

🖼️ Image GenerationOperations
get
/image/{prompt}
post
/v1/images/generations
post
/v1/images/edits
Generate Image​Copy link
Generate an image from a text prompt. Returns JPEG or PNG.

Available models: kontext, nanobanana, nanobanana-2, nanobanana-pro, seedream5, seedream, seedream-pro, gptimage, gptimage-large, flux, zimage, qwen-image, grok-imagine, grok-imagine-pro, klein, p-image, p-image-edit, nova-canvas. zimage is the default.

Browse all available models and their capabilities at /image/models.

Path Parameters
promptCopy link to prompt
Type:string
min length:  
1
required
Example
Text description of the image to generate

Query Parameters
modelCopy link to model
Type:string
enum
Default
Model to use. Image: flux, zimage, gptimage, kontext, seedream5, nanobanana, nanobanana-pro, klein. Video: veo, seedance, seedance-pro, wan. See /image/models for full list.

values
kontext
nanobanana
nanobanana-2
nanobanana-pro
seedream5
Show all values
widthCopy link to width
Type:integer
min:  
0
max:  
9007199254740991
Default
Width in pixels. For images, exact pixels. For video models, mapped to nearest resolution tier (480p/720p/1080p).

heightCopy link to height
Type:integer
min:  
0
max:  
9007199254740991
Default
Height in pixels. For images, exact pixels. For video models, mapped to nearest resolution tier (480p/720p/1080p).

seedCopy link to seed
Type:integer
min:  
-1
max:  
2147483647
Default
Seed for reproducible results. Use -1 for random. Supported by: flux, zimage, seedream, klein, seedance. Other models ignore this parameter.

enhanceCopy link to enhance
Type:boolean
Default
Let AI improve your prompt for better results. Applied during prompt processing.

negative_promptCopy link to negative_prompt
Type:string
Default
What to avoid in the generated image. Only supported by flux and zimage — other models ignore this.

safeCopy link to safe
Type:boolean
Default
Enable safety content filters

qualityCopy link to quality
Type:string
enum
Default
Image quality level. Only supported by gptimage and gptimage-large.

values
low
medium
high
hd
imageCopy link to image
Type:string
Reference image URL(s) for image editing or video generation. Separate multiple URLs with | or ,. Image models: Used for editing/style reference (kontext, gptimage, seedream, klein, nanobanana). Video models: First image = starting frame; second image = ending frame for interpolation (veo only).

transparentCopy link to transparent
Type:boolean
Default
Generate image with transparent background. Only supported by gptimage and gptimage-large.

durationCopy link to duration
Type:integer
min:  
1
max:  
30
Video duration in seconds. Only applies to video models. veo: 4, 6, or 8s. seedance: 2-10s. wan: 2-15s. nova-reel: 6-30s (multiples of 6).

aspectRatioCopy link to aspectRatio
Type:string
Video aspect ratio (16:9 or 9:16). Only applies to video models. If not set, determined by width/height.

audioCopy link to audio
Type:boolean
Default
Generate audio for the video. Only applies to video models. Note: wan generates audio regardless of this flag. For veo, set to true to enable audio.

Responses

200
Success - Returns the generated image
Selected Content Type:
image/jpeg

400
Something was wrong with the input data, check the details for more info.
application/json

401
Authentication required. Please provide an API key via Authorization header (Bearer token) or ?key= query parameter.
application/json

402
Insufficient pollen balance or API key budget exhausted.
application/json

403
Access denied! You don't have the required permissions for this resource or model.
application/json

429
You're making requests too quickly. Please slow down a bit.
application/json

500
Oh snap, something went wrong on our end. We're on it!
application/json
Request Example forget/image/{prompt}
JavaScript Fetch
fetch('https://gen.pollinations.ai/image/a beautiful sunset over mountains', {
  headers: {
    Authorization: 'Bearer YOUR_SECRET_TOKEN'
  }
})


Test Request
(get /image/{prompt})
Status:200
Status:400
Status:401
Status:402
Status:403
Status:429
Status:500
@filename

Success - Returns the generated image

Generate Image (OpenAI-compatible)​Copy link
OpenAI-compatible image generation endpoint.

Generate images from text prompts. Supports response_format: "url" (returns a pollinations.ai URL) or "b64_json" (returns base64-encoded image data, default).

Authentication: Include your API key as Authorization: Bearer YOUR_API_KEY.

Body
application/json
promptCopy link to prompt
Type:string
min length:  
1
max length:  
32000
required
A text description of the desired image(s)

imageCopy link to image

Any of
string
Type:string
Reference image URL(s) for image-to-image generation (Pollinations extension)

modelCopy link to model
Type:string
Default
The model to use for image generation

nCopy link to n
Type:integer
min:  
1
max:  
1
Default
Number of images to generate (currently max 1)

qualityCopy link to quality
Type:string
enum
Default
Image quality. OpenAI 'standard'/'hd' mapped to Pollinations equivalents

values
standard
hd
low
medium
high
response_formatCopy link to response_format
Type:string
enum
Default
Return format. "url" returns a pollinations.ai URL, "b64_json" returns base64-encoded image data

values
url
b64_json
sizeCopy link to size
Type:string
Default
Image size as WIDTHxHEIGHT (e.g., 1024x1024, 512x512)

userCopy link to user
Type:string
End-user identifier for abuse tracking

propertyNameCopy link to propertyName
Type:anything
Responses

200
Success
application/json

400
Something was wrong with the input data, check the details for more info.
application/json

401
Authentication required. Please provide an API key via Authorization header (Bearer token) or ?key= query parameter.
application/json

402
Insufficient pollen balance or API key budget exhausted.
application/json

403
Access denied! You don't have the required permissions for this resource or model.
application/json

500
Oh snap, something went wrong on our end. We're on it!
application/json
Request Example forpost/v1/images/generations
JavaScript Fetch
fetch('https://gen.pollinations.ai/v1/images/generations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer YOUR_SECRET_TOKEN'
  },
  body: JSON.stringify({
    prompt: '',
    model: 'flux',
    n: 1,
    size: '1024x1024',
    quality: 'medium',
    response_format: 'b64_json',
    user: '',
    image: '',
    additionalProperty: 'anything'
  })
})


Test Request
(post /v1/images/generations)
Status:200
Status:400
Status:401
Status:402
Status:403
Status:500
{
  "created": -9007199254740991,
  "data": [
    {
      "url": "string",
      "b64_json": "string",
      "revised_prompt": "string"
    }
  ]
}

Success

Edit Image (OpenAI-compatible)​Copy link
OpenAI-compatible image editing endpoint.

Edit images using a text prompt and one or more source images. Accepts JSON with image URLs or multipart/form-data with file uploads.

Authentication: Include your API key as Authorization: Bearer YOUR_API_KEY.

Responses

200
Success
application/json

400
Something was wrong with the input data, check the details for more info.
application/json

401
Authentication required. Please provide an API key via Authorization header (Bearer token) or ?key= query parameter.
application/json

402
Insufficient pollen balance or API key budget exhausted.
application/json

403
Access denied! You don't have the required permissions for this resource or model.
application/json

500
Oh snap, something went wrong on our end. We're on it!
application/json
Request Example forpost/v1/images/edits
JavaScript Fetch
fetch('https://gen.pollinations.ai/v1/images/edits', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer YOUR_SECRET_TOKEN'
  }
})


Test Request
(post /v1/images/edits)
Status:200
Status:400
Status:401
Status:402
Status:403
Status:500
{
  "created": -9007199254740991,
  "data": [
    {
      "url": "string",
      "b64_json": "string",
      "revised_prompt": "string"
    }
  ]
}

Success