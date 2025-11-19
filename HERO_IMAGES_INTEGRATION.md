# 🎨 Hero Images - Ready to Use!

## ✅ What's Ready

6 high-quality, diverse gym-goer images are now live:

### Individual Athletes
1. **Asian woman** - Sportswear ready for training (177 KB) ✨ REFRESHED
2. **Black man** - Athletic gym attire (385 KB) ✨ REFRESHED
3. **Latina woman** - Yoga mat in sportswear (149 KB)
4. **White man** - Gym clothes with towel (157 KB)

### Group Scenes 🆕
5. **Group training** - Diverse group doing partner workout (247 KB)
6. **Gym buddies** - Two friends training together (182 KB)

**Source**: Unsplash (free for commercial use)
**Location**: S3 bucket `prod-web-origin-962595531541` under `/media/images/`
**CDN**: CloudFront `dixcgxyyjlm7x.cloudfront.net` (fast global delivery)

## 📸 Image URLs (Use These!)

```javascript
const HERO_IMAGES = [
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-1-asian-woman.jpg',
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-2-black-man.jpg',
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-3-latina-woman.jpg',
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-4-white-man.jpg',
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-5-group-training.jpg',
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-6-gym-buddies.jpg'
];
```

## 🚀 Integration Options

### Option 1: Random Hero on Page Load

Perfect for homepage or session planner header:

```jsx
import { useState, useEffect } from 'react';

const HERO_IMAGES = [
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-1-asian-woman.jpg',
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-2-black-man.jpg',
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-3-latina-woman.jpg',
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-4-white-man.jpg',
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-5-group-training.jpg',
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-6-gym-buddies.jpg'
];

function HeroSection() {
  const [heroImage, setHeroImage] = useState('');

  useEffect(() => {
    // Pick random hero image on mount
    const randomImage = HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)];
    setHeroImage(randomImage);
  }, []);

  return (
    <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl overflow-hidden h-64">
      {/* Hero Image Background */}
      {heroImage && (
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Athlete ready to train"
            className="w-full h-full object-cover opacity-30"
          />
        </div>
      )}

      {/* Content Overlay */}
      <div className="relative z-10 flex items-center justify-center h-full p-8">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-2">Ready to train?</h1>
          <p className="text-lg text-gray-300">
            Plan your workout and track your progress
          </p>
        </div>
      </div>
    </div>
  );
}

export default HeroSection;
```

### Option 2: Auto-Rotating Banner

Cycles through all 4 images with smooth transitions:

```jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const HERO_IMAGES = [
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-1-asian-woman.jpg',
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-2-black-man.jpg',
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-3-latina-woman.jpg',
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-4-white-man.jpg',
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-5-group-training.jpg',
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-6-gym-buddies.jpg'
];

function RotatingHeroBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Auto-rotate every 5 seconds
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-96 rounded-xl overflow-hidden bg-gray-900">
      {/* Animated Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          <img
            src={HERO_IMAGES[currentIndex]}
            alt="Athlete"
            className="w-full h-full object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center h-full p-8">
        <div className="text-center text-white">
          <h1 className="text-5xl font-bold mb-4">TheGradual</h1>
          <p className="text-xl text-gray-300">
            Your step-by-step gym tracker
          </p>

          {/* Dot indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {HERO_IMAGES.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-white w-8'
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RotatingHeroBanner;
```

### Option 3: Simple Background Hero

Minimal implementation for any page:

```jsx
const HERO_IMAGES = [
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-1-asian-woman.jpg',
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-2-black-man.jpg',
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-3-latina-woman.jpg',
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-4-white-man.jpg',
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-5-group-training.jpg',
  'https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-6-gym-buddies.jpg'
];

// Pick random image (outside component to avoid re-rendering)
const randomHero = HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)];

function SessionPlanner() {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <div
        className="h-48 bg-cover bg-center relative"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${randomHero})`
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-4xl font-bold text-white">Plan Your Session</h1>
        </div>
      </div>

      {/* Rest of your content */}
      <div className="p-6">
        {/* Your session planner UI */}
      </div>
    </div>
  );
}
```

## 🎨 Recommended Usage

**Where to use:**
- Homepage header
- Session planner banner
- Welcome screen
- Empty state placeholders
- Marketing sections

**Best practices:**
1. **Overlay gradient**: Always add dark overlay for text readability
2. **Opacity**: Keep images at 30-50% opacity to not overwhelm content
3. **Object-fit**: Use `object-cover` to maintain aspect ratio
4. **Loading**: Consider lazy loading if below fold
5. **Alt text**: Provide descriptive alt text for accessibility

## 📱 Responsive Example

```jsx
function ResponsiveHero() {
  const [heroImage, setHeroImage] = useState('');

  useEffect(() => {
    const random = HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)];
    setHeroImage(random);
  }, []);

  return (
    <div className="relative bg-gray-900 rounded-xl overflow-hidden">
      {/* Responsive height: h-48 on mobile, h-64 on tablet, h-96 on desktop */}
      <div className="h-48 sm:h-64 lg:h-96 relative">
        {heroImage && (
          <img
            src={heroImage}
            alt="Athlete"
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        )}

        {/* Responsive text */}
        <div className="relative z-10 flex items-center justify-center h-full p-4 sm:p-6 lg:p-8">
          <div className="text-center text-white">
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-2">
              TheGradual
            </h1>
            <p className="text-sm sm:text-base lg:text-xl text-gray-300">
              Your step-by-step gym tracker
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## 🔍 Testing URLs

You can test these URLs directly in your browser:

**Individual Athletes:**
- https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-1-asian-woman.jpg
- https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-2-black-man.jpg
- https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-3-latina-woman.jpg
- https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-4-white-man.jpg

**Group Scenes:**
- https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-5-group-training.jpg
- https://dixcgxyyjlm7x.cloudfront.net/media/images/hero-6-gym-buddies.jpg

## 📜 License

These images are from **Unsplash** and are:
- ✅ Free for commercial use
- ✅ No attribution required (but appreciated)
- ✅ Can be used, modified, distributed

**License**: [Unsplash License](https://unsplash.com/license)

## 🎯 Next Steps

1. **Choose an integration option** above
2. **Add to your component** (e.g., SessionPlanner.jsx or App.jsx)
3. **Test in browser** with `npm run dev`
4. **Adjust styling** to match your app's design

Your app just got a lot less text-heavy! 🚀
