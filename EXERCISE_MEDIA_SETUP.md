# 🎬 Exercise Media Generation - Setup Complete!

## ✅ What's Been Created

### 1. S3 Bucket
- **Name**: `thegradual-exercise-media`
- **Region**: `us-east-2`
- **Purpose**: Store exercise videos and anatomical images
- **Status**: ✅ Created and ready

### 2. Generation Script
- **Location**: `scripts/generate-exercise-media.py`
- **Models Used**:
  - Amazon Nova Reel (video generation)
  - Amazon Nova Canvas (image generation)
- **Status**: ✅ Ready to run

### 3. Selected Exercises (Proof of Concept)
Starting with 3 exercises to test:
1. **Barbell Bench Press** (Chest) - `chest-1`
2. **Deadlift** (Back) - `back-1`
3. **Barbell Squat** (Legs) - `legs-1`

## 🎨 Aesthetic Design

### Video Style (WHITE STUDIO)
- ✅ Pure white infinity wall backdrop
- ✅ Black athletic wear (no logos)
- ✅ High-key professional lighting
- ✅ Apple product launch aesthetic
- ✅ Minimal, clean, professional

**3-Segment Structure** (15 seconds total):
1. **Overview** (0-4s): Full body setup view
2. **Close-up** (5-9s): Muscle engagement detail
3. **Technique** (10-15s): Critical form aspect

### Anatomical Images
- ✅ Medical textbook quality
- ✅ Bright red (#FF0000) highlighted muscles
- ✅ White background (#FFFFFF)
- ✅ 3 views per exercise (front, back, side)

## 📋 Next Steps

### Step 1: Enable Bedrock Access

You need to request access to AWS Bedrock Nova models:

```bash
1. Go to AWS Console: https://console.aws.amazon.com/bedrock/
2. Navigate to: Bedrock → Model Access
3. Click "Request model access"
4. Select these models:
   ☐ Amazon Nova Reel (amazon.nova-reel-v1:0)
   ☐ Amazon Nova Canvas (amazon.nova-canvas-v1:0)
5. Submit request
```

**Note**: Access is usually granted instantly or within minutes!

### Step 2: Verify Access

```bash
cd /Users/glennbech/dev/thegradual.com/scripts
python3 check-bedrock-access.py
```

Expected output when ready:
```
✅ amazon.nova-reel-v1:0 - ACCESSIBLE
✅ amazon.nova-canvas-v1:0 - ACCESSIBLE
🎉 All required models are accessible!
```

### Step 3: Generate Media

Once access is enabled:

```bash
cd /Users/glennbech/dev/thegradual.com/scripts
python3 generate-exercise-media.py
```

This will:
- Generate 3 videos (one per exercise)
- Generate 9 anatomical images (3 views × 3 exercises)
- Upload everything to S3
- Create `manifest.json` with all URLs

**Estimated time**: ~15-20 minutes
**Estimated cost**: ~$2.58

## 📊 What You'll Get

### Files Created

```
scripts/media_output/
├── chest-1_demo.mp4              (Bench Press video)
├── chest-1_anatomy_front.png     (Chest muscles - front view)
├── chest-1_anatomy_back.png      (Chest muscles - back view)
├── chest-1_anatomy_side.png      (Chest muscles - side view)
├── back-1_demo.mp4               (Deadlift video)
├── back-1_anatomy_front.png      (Back muscles - front view)
├── back-1_anatomy_back.png       (Back muscles - back view)
├── back-1_anatomy_side.png       (Back muscles - side view)
├── legs-1_demo.mp4               (Squat video)
├── legs-1_anatomy_front.png      (Leg muscles - front view)
├── legs-1_anatomy_back.png       (Leg muscles - back view)
├── legs-1_anatomy_side.png       (Leg muscles - side view)
└── manifest.json                 (All S3 URLs)
```

### S3 Structure

```
s3://thegradual-exercise-media/
├── videos/
│   ├── chest-1_demo.mp4
│   ├── back-1_demo.mp4
│   └── legs-1_demo.mp4
└── images/
    ├── chest-1_anatomy_front.png
    ├── chest-1_anatomy_back.png
    ├── chest-1_anatomy_side.png
    ├── back-1_anatomy_front.png
    ├── back-1_anatomy_back.png
    ├── back-1_anatomy_side.png
    ├── legs-1_anatomy_front.png
    ├── legs-1_anatomy_back.png
    └── legs-1_anatomy_side.png
```

## 🔗 Integration Plan

After generation, you can integrate into the app:

### Update `exercises.json`

```json
{
  "id": "chest-1",
  "name": "Barbell Bench Press",
  "category": "Chest",
  "muscleGroup": "chest",
  "description": "Lie on a flat bench, grip the barbell slightly wider than shoulder-width...",

  "videoUrl": "https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/videos/chest-1_demo.mp4",

  "anatomicalImages": {
    "front": "https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/images/chest-1_anatomy_front.png",
    "back": "https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/images/chest-1_anatomy_back.png",
    "side": "https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/images/chest-1_anatomy_side.png"
  },

  "primaryMuscles": ["Pectoralis Major", "Anterior Deltoids"],
  "secondaryMuscles": ["Triceps Brachii", "Serratus Anterior"],
  "equipment": "Barbell, Flat Bench",
  "difficulty": "intermediate"
}
```

### Display in UI

Add video player and anatomical images to `ExerciseDetailModal`:
- Show video on exercise detail page
- Display anatomical images in tabs (front/back/side)
- Use as educational content during workouts

## 💰 Cost Breakdown

| Item | Quantity | Unit Price | Total |
|------|----------|------------|-------|
| Nova Reel (videos) | 3 | ~$0.80 | ~$2.40 |
| Nova Canvas (images) | 9 | ~$0.02 | ~$0.18 |
| **TOTAL** | | | **~$2.58** |

S3 storage and bandwidth costs are negligible for POC.

## 🚀 Scaling Up

After validating the POC with 3 exercises, you can:

1. **Add more exercises** to the script
2. **Batch generate** all 70+ exercises
3. **Automate** with Lambda function
4. **CDN** serve via CloudFront for faster delivery

## 📚 Documentation

- **Main README**: `scripts/README_MEDIA_GENERATION.md`
- **This file**: Setup summary and next steps
- **Scripts**:
  - `check-bedrock-access.py` - Verify model access
  - `generate-exercise-media.py` - Main generation script

## ✨ Key Features

### Consistency
- ✅ All videos use same white studio aesthetic
- ✅ All images use medical illustration style
- ✅ Prompts ensure visual coherence

### Quality
- ✅ 15-second structured videos (overview → close-up → technique)
- ✅ Professional lighting and angles
- ✅ Anatomically accurate muscle highlighting

### Practicality
- ✅ Automatic S3 upload
- ✅ Manifest file with all URLs
- ✅ Ready for app integration

## 🎯 Success Criteria

After running the script, you should have:
- [ ] 3 professional exercise videos (MP4)
- [ ] 9 anatomical illustrations (PNG)
- [ ] All files in S3 bucket
- [ ] `manifest.json` with URLs
- [ ] Consistent white studio aesthetic
- [ ] Consistent medical illustration style

Ready to generate when Bedrock access is enabled! 🚀
