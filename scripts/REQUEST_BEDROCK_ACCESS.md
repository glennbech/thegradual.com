# 🔐 Request Bedrock Image Generation Access

## Issue

Your AWS Bedrock account doesn't have access to text-to-image generation models yet.

**Available**: Image editing models (upscale, inpaint, erase)
**Missing**: Core text-to-image models (Stable Diffusion, Nova Canvas)

## Solution: Request Model Access

### Step 1: Go to Bedrock Console

```bash
open https://us-east-2.console.aws.amazon.com/bedrock/home?region=us-east-2#/modelaccess
```

Or manually:
1. Go to AWS Console
2. Navigate to Amazon Bedrock
3. Click "Model access" in left sidebar

### Step 2: Request Access to These Models

Click "Modify model access" and enable:

**For Text-to-Image Generation**, request:
- ☐ **Stability AI - Stable Diffusion XL** (`stability.stable-diffusion-xl-v1`)
  - Or: **Stable Image Ultra** (`stability.stable-image-ultra-v1:0`)
  - Or: **Stable Image Core** (`stability.stable-image-core-v1:0`)

**For Video Generation** (bonus):
- ☐ **Amazon Nova Reel** (`amazon.nova-reel-v1:0`)

**For Higher Quality Images** (optional):
- ☐ **Amazon Nova Canvas** (`amazon.nova-canvas-v1:0`)

### Step 3: Wait for Approval

- Most models are **auto-approved instantly**
- Some may take a few minutes
- Check email for confirmation

### Step 4: Verify Access

```bash
cd /Users/glennbech/dev/thegradual.com/scripts
AWS_PROFILE=qq python3 check-bedrock-access.py
```

## Alternative: Use Free Stock Photos (Quick Fix)

While waiting for Bedrock access, I can help you:

1. **Find free stock photos** from Unsplash/Pexels of diverse gym-goers
2. **Download and optimize** them for web
3. **Upload to S3** under `/media/images`
4. **Integrate into your app** immediately

Would you like me to do this as a temporary solution?

## Cost Comparison

### Bedrock Generated Images
- **Cost**: ~$0.02-0.04 per image (1024x1024)
- **Pros**: Custom, consistent style, no licensing issues
- **Cons**: Requires model access approval

### Stock Photos
- **Cost**: Free (Unsplash/Pexels)
- **Pros**: Immediate availability, high quality
- **Cons**: Not custom, potential licensing restrictions for commercial use

## Next Steps

**Option A** (Recommended): Request Bedrock access (5 min setup, wait for approval)
**Option B** (Quick): Use stock photos now, switch to Bedrock later

Let me know which path you prefer!
