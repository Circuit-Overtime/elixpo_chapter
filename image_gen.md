🖼️ Image Generation ​Copy link
Generate images from text prompts via a simple GET request. Returns JPEG or PNG.

Quick start — paste in your browser, no code needed:

https://gen.pollinations.ai/image/a%20cat%20in%20space?model=flux
Available models: kontext, nanobanana, nanobanana-2, nanobanana-pro, seedream5, seedream, seedream-pro, gptimage, gptimage-large, flux, zimage, klein, imagen-4, flux-2-dev, grok-imagine, dirtberry, dirtberry-pro, p-image, p-image-edit

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

Available models: kontext, nanobanana, nanobanana-2, nanobanana-pro, seedream5, seedream, seedream-pro, gptimage, gptimage-large, flux, zimage, klein, imagen-4, flux-2-dev, grok-imagine, dirtberry, dirtberry-pro, p-image, p-image-edit. zimage is the default.

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
Model to use. Image: flux, zimage, gptimage, kontext, seedream5, nanobanana, nanobanana-pro, klein, imagen-4, grok-imagine. Video: veo, seedance, seedance-pro, wan, ltx-2, grok-video. See /image/models for full list.

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
10
Video duration in seconds. Only applies to video models. veo: 4, 6, or 8s. seedance: 2-10s. wan: 2-15s. ltx-2: up to ~10s.

aspectRatioCopy link to aspectRatio
Type:string
Video aspect ratio (16:9 or 9:16). Only applies to video models. If not set, determined by width/height.

audioCopy link to audio
Type:boolean
Default
Generate audio for the video. Only applies to video models. Note: wan and ltx-2 generate audio regardless of this flag. For veo, set to true to enable audio.

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
HTML
<!-- No code needed — use as an image URL -->
<img src="https://gen.pollinations.ai/image/a%20cat%20in%20space?model=flux" />


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
Shell Curl
curl https://gen.pollinations.ai/v1/images/generations \
  --request POST \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN' \
  --data '{
  "prompt": "",
  "model": "flux",
  "n": 1,
  "size": "1024x1024",
  "quality": "medium",
  "response_format": "b64_json",
  "user": "",
  "image": "",
  "additionalProperty": "anything"
}'


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
Shell Curl
curl https://gen.pollinations.ai/v1/images/edits \
  --request POST \
  --header 'Authorization: Bearer YOUR_SECRET_TOKEN'


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

🎬 Video Generation ​Copy link
Generate videos from text prompts or reference images. Returns MP4.

https://gen.pollinations.ai/video/sunset%20timelapse?model=veo&duration=4
Available models: veo, seedance, seedance-pro, wan, grok-video, ltx-2, p-video

Video parameters: duration (seconds), aspectRatio (16:9 or 9:16), audio (enable soundtrack), image (reference frames)

🎬 Video GenerationOperations
get
/video/{prompt}


models -- Flux Schnell
flux
1K
🖼️
0.001 /img
FLUX.2 Dev (api.airforce)
NEW

ALPHA
flux-2-dev

👁️
1K
🖼️
0.001 /img
Dirtberry (api.airforce)
NEW

ALPHA
dirtberry
1K
🖼️
0.001 /img
Dirtberry Pro (api.airforce)
NEW

ALPHA
dirtberry-pro
650
🖼️
0.0015 /img
Z-Image Turbo
zimage
500
🖼️
0.002 /img
Imagen 4 (api.airforce)

ALPHA
imagen-4
400
🖼️
0.0025 /img
Grok Imagine (api.airforce)

ALPHA
grok-imagine

FLUX.2 Klein 4B

ALPHA
klein

👁️

GPT Image 1 Mini
gptimage

👁️

