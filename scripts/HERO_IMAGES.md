# 🎨 Hero Image Generation

Generate diverse, professional hero images for TheGradual app using Amazon Bedrock Nova Canvas.

## What You'll Get

4 professional studio photographs of diverse athletes in gym attire:

1. **hero-1-asian-woman.png** - Asian woman, late 20s, black tank + grey leggings, water bottle
2. **hero-2-black-man.png** - Black man, early 30s, navy compression shirt + black shorts, towel
3. **hero-3-latina-woman.png** - Latina woman, mid-20s, coral sports bra + black leggings, yoga mat
4. **hero-4-white-man.png** - White man, late 20s, grey t-shirt + black joggers, earbuds

## Design Aesthetic

- **Style**: Apple product photography (white studio, high-key lighting)
- **Background**: Pure white (#FFFFFF)
- **Mood**: Confident, energetic, motivational
- **Quality**: 1024x1024px premium quality
- **Diversity**: Different ethnicities, genders, ages, athletic styles

## Usage

### 1. Generate Images

```bash
cd /Users/glennbech/dev/thegradual.com/scripts
python3 generate-hero-images.py
```

**Prerequisites**:
- AWS Bedrock access to `amazon.nova-canvas-v1:0`
- S3 bucket `thegradual-exercise-media` (already exists)

**Output**:
- Local files in `hero_output/`
- Uploaded to `s3://thegradual-exercise-media/hero/`
- Manifest file: `hero_output/hero-manifest.json`

**Time**: ~2-3 minutes
**Cost**: ~$0.08 (4 images × ~$0.02 each)

### 2. Integrate into App

Add to your React component (e.g., home page or session planner):

```jsx
import { useState, useEffect } from 'react';

// Hero image URLs from S3
const HERO_IMAGES = [
  'https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/hero/hero-1-asian-woman.png',
  'https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/hero/hero-2-black-man.png',
  'https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/hero/hero-3-latina-woman.png',
  'https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/hero/hero-4-white-man.png'
];

function HeroSection() {
  const [heroImage, setHeroImage] = useState('');

  useEffect(() => {
    // Pick random hero image on mount
    const randomImage = HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)];
    setHeroImage(randomImage);
  }, []);

  return (
    <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden">
      {/* Hero Image */}
      <div className="absolute inset-0 opacity-30">
        <img
          src={heroImage}
          alt="Athlete"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">Ready to train?</h1>
        <p className="text-lg text-gray-300">
          Plan your workout and track your progress
        </p>
      </div>
    </div>
  );
}
```

### 3. Alternative: Rotating Banner

For a dynamic rotating banner on your homepage:

```jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const HERO_IMAGES = [
  'https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/hero/hero-1-asian-woman.png',
  'https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/hero/hero-2-black-man.png',
  'https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/hero/hero-3-latina-woman.png',
  'https://thegradual-exercise-media.s3.us-east-2.amazonaws.com/hero/hero-4-white-man.png'
];

function RotatingHeroBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Rotate every 5 seconds
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-96 rounded-xl overflow-hidden bg-gray-900">
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={HERO_IMAGES[currentIndex]}
          alt="Athlete"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        />
      </AnimatePresence>

      <div className="relative z-10 flex items-center justify-center h-full p-8">
        <div className="text-center text-white">
          <h1 className="text-5xl font-bold mb-4">TheGradual</h1>
          <p className="text-xl text-gray-300">
            Your step-by-step gym tracker
          </p>
        </div>
      </div>
    </div>
  );
}
```

## Design Decisions

### Why These Variations?

1. **Diversity**: Represents different users (ethnicity, gender, age)
2. **Athletic Styles**: Different workout types (strength, cardio, yoga, general fitness)
3. **Mood Variety**: Confident, energetic, focused, joyful
4. **Accessory Variety**: Water bottle, towel, yoga mat, earbuds (relatable gym items)

### Why White Studio Aesthetic?

- **Consistency**: Matches the exercise video aesthetic
- **Clean**: Doesn't distract from app UI
- **Professional**: Premium feel (Apple-style)
- **Versatile**: Works with dark or light UI themes
- **Overlay-friendly**: Easy to use as background with text overlay

## File Structure

```
scripts/
├── generate-hero-images.py      # Generation script
├── HERO_IMAGES.md               # This file
└── hero_output/                 # Generated files
    ├── hero-1-asian-woman.png
    ├── hero-2-black-man.png
    ├── hero-3-latina-woman.png
    ├── hero-4-white-man.png
    └── hero-manifest.json       # S3 URLs + metadata
```

```
s3://thegradual-exercise-media/
└── hero/
    ├── hero-1-asian-woman.png
    ├── hero-2-black-man.png
    ├── hero-3-latina-woman.png
    └── hero-4-white-man.png
```

## Cost

| Item | Quantity | Unit Price | Total |
|------|----------|------------|-------|
| Nova Canvas (1024x1024 premium) | 4 | ~$0.02 | ~$0.08 |

Negligible S3 storage/bandwidth costs.

## Customization

Want different hero images? Edit `hero_images` array in `generate-hero-images.py`:

```python
hero_images = [
    {
        "filename": "hero-5-custom.png",
        "prompt": "Your custom prompt here..."
    }
]
```

## Tips for Better Images

1. **Be specific**: Describe age, ethnicity, clothing, accessories, expression
2. **White background**: Always specify "pure white background (#FFFFFF)"
3. **Lighting**: Mention "soft professional lighting, high-key photography"
4. **Camera**: Reference professional camera settings for realism
5. **Negative prompt**: Exclude unwanted elements (logos, text, multiple people)

## Next Steps

1. Run `python3 generate-hero-images.py`
2. Review images in `hero_output/`
3. Copy S3 URLs from `hero-manifest.json`
4. Add to your React component (see integration examples above)
5. Test rotation logic in your app

Enjoy less text-heavy, more visual app! 🎨
