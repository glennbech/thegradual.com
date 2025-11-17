# 🎬 Exercise Media Generation with AWS Bedrock Nova

This script generates professional exercise demonstration videos and anatomical illustrations using AWS Bedrock Nova.

## 📦 What It Generates

For each exercise, it creates:

### 1. Demonstration Video (15 seconds)
- **Segment 1 (0-4s)**: Overview - Full body view showing setup
- **Segment 2 (5-9s)**: Close-up - Muscle engagement and form
- **Segment 3 (10-15s)**: Key technique - Critical form detail

**Aesthetic**: Clean white studio, black athletic wear, Apple-style minimalism

### 2. Anatomical Images (3 views)
- **Front view**: Anterior muscle highlighting
- **Back view**: Posterior muscle highlighting
- **Side view**: Lateral muscle highlighting

**Style**: Medical textbook quality, bright red highlighted muscles on white background

## 🚀 Prerequisites

### 1. AWS Bedrock Nova Access

You need access to:
- **Amazon Nova Reel** (for video generation)
- **Amazon Nova Canvas** (for image generation)

Enable access in AWS Console:
```bash
AWS Console → Bedrock → Model Access → Request Access
- Amazon Nova Reel (nova-reel-v1:0)
- Amazon Nova Canvas (nova-canvas-v1:0)
```

### 2. Python Dependencies

```bash
pip install boto3
```

### 3. AWS Credentials

Make sure your AWS credentials are configured:
```bash
aws configure
# Or set environment variables:
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-2
```

## 📝 Current Configuration

**Exercises to generate** (3 total):
1. Barbell Bench Press (Chest)
2. Deadlift (Back)
3. Barbell Squat (Legs)

**Output**:
- S3 Bucket: `thegradual-exercise-media`
- Region: `us-east-2`
- Videos: `s3://thegradual-exercise-media/videos/`
- Images: `s3://thegradual-exercise-media/images/`

## 🎯 Running the Script

```bash
cd /Users/glennbech/dev/thegradual.com/scripts

# Run generation
python3 generate-exercise-media.py
```

### Expected Output

```
╔════════════════════════════════════════════════════════════╗
║  🎬 THEGRADUAL EXERCISE MEDIA GENERATOR                    ║
║  Using AWS Bedrock Nova (Reel + Canvas)                   ║
╚════════════════════════════════════════════════════════════╝

============================================================
🏋️  Processing: Barbell Bench Press
============================================================

📹 STEP 1: Generating demonstration video...
🎬 Generating video... (this may take 2-3 minutes)
✅ Video saved to media_output/chest-1_demo.mp4
☁️  Uploading to S3: videos/chest-1_demo.mp4
✅ Uploaded: https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/videos/chest-1_demo.mp4

🎨 STEP 2: Generating anatomical illustrations...

  → Generating front view...
🎨 Generating anatomical image...
✅ Image saved to media_output/chest-1_anatomy_front.png
☁️  Uploading to S3: images/chest-1_anatomy_front.png
✅ Uploaded: https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/images/chest-1_anatomy_front.png

... (continues for all exercises)
```

## ⏱️ Estimated Time

- **Per exercise**: ~5-7 minutes
  - Video generation: ~2-3 minutes
  - 3 anatomical images: ~3-4 minutes (with rate limiting)

- **Total for 3 exercises**: ~15-20 minutes

## 📊 Output Structure

```
media_output/
├── chest-1_demo.mp4
├── chest-1_anatomy_front.png
├── chest-1_anatomy_back.png
├── chest-1_anatomy_side.png
├── back-1_demo.mp4
├── back-1_anatomy_front.png
├── back-1_anatomy_back.png
├── back-1_anatomy_side.png
├── legs-1_demo.mp4
├── legs-1_anatomy_front.png
├── legs-1_anatomy_back.png
├── legs-1_anatomy_side.png
└── manifest.json
```

**manifest.json** contains all S3 URLs:
```json
[
  {
    "exercise_id": "chest-1",
    "name": "Barbell Bench Press",
    "video_url": "https://...",
    "anatomical_images": {
      "front": "https://...",
      "back": "https://...",
      "side": "https://..."
    }
  }
]
```

## 💰 Cost Estimate

AWS Bedrock Nova Pricing (as of 2024):
- **Nova Reel** (video): ~$0.80 per video (15 seconds)
- **Nova Canvas** (image): ~$0.02 per image (1024x1024)

**Total for 3 exercises**:
- 3 videos: ~$2.40
- 9 images: ~$0.18
- **Total**: ~$2.58

## 🎨 Aesthetic Consistency

All media follows these strict guidelines:

### Videos
- ✅ Pure white studio backdrop (infinity wall)
- ✅ Black athletic wear (no logos)
- ✅ High-key lighting (bright, minimal shadows)
- ✅ 3-segment structure (overview → close-up → technique)
- ✅ Professional, educational tone

### Images
- ✅ Medical illustration style
- ✅ Bright red (#FF0000) highlighted muscles
- ✅ Light grey (#E5E5E5) non-working muscles
- ✅ White background (#FFFFFF)
- ✅ Anatomically accurate proportions

## 🔧 Customization

To add more exercises, edit the `EXERCISES` list in the script:

```python
EXERCISES = [
    {
        "id": "chest-1",
        "name": "Barbell Bench Press",
        "description": "...",
        "primaryMuscles": ["Pectoralis Major", "Anterior Deltoids"],
        "secondaryMuscles": ["Triceps Brachii", "Serratus Anterior"],
    },
    # Add more exercises here
]
```

## 🐛 Troubleshooting

### "Model not found" error
→ Request access to Nova models in Bedrock Console

### "Rate limit exceeded"
→ Script includes rate limiting (2s between images, 10s between exercises)
→ Increase wait times if needed

### "Access denied" to S3
→ Check IAM permissions for S3 bucket access

## 📚 Next Steps

After generation:
1. Review videos in `media_output/` folder
2. Check quality and consistency
3. Update exercise data in `src/data/exercises.json` with media URLs
4. Integrate into app UI

## 🎯 Integration Example

Add to `exercises.json`:
```json
{
  "id": "chest-1",
  "name": "Barbell Bench Press",
  "category": "Chest",
  "videoUrl": "https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/videos/chest-1_demo.mp4",
  "anatomicalImages": {
    "front": "https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/images/chest-1_anatomy_front.png",
    "back": "https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/images/chest-1_anatomy_back.png",
    "side": "https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/images/chest-1_anatomy_side.png"
  },
  "description": "...",
  "primaryMuscles": ["Pectoralis Major", "Anterior Deltoids"],
  "secondaryMuscles": ["Triceps Brachii", "Serratus Anterior"]
}
```
