#!/usr/bin/env python3
"""
Download Hero Images for TheGradual App
Uses high-quality free stock photos from Unsplash
Upload to S3 static website bucket under /media/images
"""

import boto3
import requests
import os
from datetime import datetime

# Configuration
REGION = "us-east-2"
OUTPUT_DIR = "hero_output"

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Initialize S3 client
s3 = boto3.client("s3", region_name=REGION)

# Find the static website S3 bucket
def find_website_bucket():
    """Find S3 bucket used for static website hosting"""
    try:
        buckets = s3.list_buckets()['Buckets']

        # Look for buckets with website configuration
        for bucket in buckets:
            bucket_name = bucket['Name']
            try:
                s3.get_bucket_website(Bucket=bucket_name)
                print(f"✅ Found website bucket: {bucket_name}")
                return bucket_name
            except:
                continue

        # Fallback: look for common patterns
        for bucket in buckets:
            if any(pattern in bucket['Name'] for pattern in ['thegradual', 'website', 'static']):
                print(f"📦 Using bucket: {bucket['Name']}")
                return bucket['Name']

        raise Exception("No static website bucket found")
    except Exception as e:
        print(f"❌ Error finding bucket: {e}")
        return None

# Curated Unsplash images of diverse gym-goers
# Using Unsplash Source API for random high-quality fitness photos
HERO_IMAGES = [
    {
        "filename": "hero-1-asian-woman.jpg",
        "url": "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=1200&h=1200&fit=crop&crop=faces",
        "description": "Asian woman in gym attire with water bottle",
        "photographer": "Unsplash"
    },
    {
        "filename": "hero-2-black-man.jpg",
        "url": "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=1200&h=1200&fit=crop&crop=faces",
        "description": "Black man in athletic wear ready to train",
        "photographer": "Unsplash"
    },
    {
        "filename": "hero-3-latina-woman.jpg",
        "url": "https://images.unsplash.com/photo-1550345332-09e3ac987658?w=1200&h=1200&fit=crop&crop=faces",
        "description": "Latina woman with yoga mat in sportswear",
        "photographer": "Unsplash"
    },
    {
        "filename": "hero-4-white-man.jpg",
        "url": "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1200&h=1200&fit=crop&crop=faces",
        "description": "White man in gym clothes with towel",
        "photographer": "Unsplash"
    }
]

def download_image(image_config):
    """Download image from URL"""
    filename = image_config['filename']
    url = image_config['url']

    print(f"\n📥 Downloading: {filename}")
    print(f"   Source: {url}")

    try:
        # Download image
        response = requests.get(url, timeout=30)
        response.raise_for_status()

        # Save locally
        local_path = os.path.join(OUTPUT_DIR, filename)
        with open(local_path, 'wb') as f:
            f.write(response.content)

        print(f"✅ Saved: {local_path} ({len(response.content) // 1024} KB)")

        return {
            **image_config,
            "local_path": local_path,
            "size_kb": len(response.content) // 1024,
            "image_data": response.content
        }

    except Exception as e:
        print(f"❌ Error downloading {filename}: {e}")
        return None

def upload_to_s3(image_result, bucket_name):
    """Upload image to S3 under /media/images"""
    if not image_result:
        return None

    filename = image_result['filename']
    s3_key = f"media/images/{filename}"

    print(f"☁️  Uploading to S3: s3://{bucket_name}/{s3_key}")

    try:
        s3.put_object(
            Bucket=bucket_name,
            Key=s3_key,
            Body=image_result['image_data'],
            ContentType='image/jpeg',
            CacheControl='public, max-age=31536000'  # 1 year cache
        )

        # Generate URL
        s3_url = f"https://{bucket_name}.s3.{REGION}.amazonaws.com/{s3_key}"

        # If CloudFront distribution exists, we can use that URL instead
        # For now, use S3 direct URL

        print(f"✅ Uploaded: {s3_url}")

        return {
            "filename": filename,
            "s3_url": s3_url,
            "s3_key": s3_key,
            "description": image_result['description'],
            "size_kb": image_result['size_kb']
        }

    except Exception as e:
        print(f"❌ Error uploading {filename}: {e}")
        return None

def main():
    print("=" * 80)
    print("🎨 TheGradual Hero Image Downloader")
    print("=" * 80)
    print("📍 Region: us-east-2")
    print("📸 Source: Unsplash (free stock photos)")
    print("🎯 Count: 4 diverse gym-goer images")
    print("=" * 80)

    # Find website bucket
    bucket_name = find_website_bucket()
    if not bucket_name:
        print("\n❌ Could not find S3 website bucket")
        print("💡 Please specify bucket name manually")
        return

    print(f"\n🪣 Target bucket: {bucket_name}")
    print(f"📁 S3 path: /media/images/")
    print(f"💾 Local output: {OUTPUT_DIR}/")

    # Download all images
    print("\n" + "=" * 80)
    print("📥 DOWNLOADING IMAGES")
    print("=" * 80)

    downloaded = []
    for image_config in HERO_IMAGES:
        result = download_image(image_config)
        if result:
            downloaded.append(result)

    # Upload to S3
    print("\n" + "=" * 80)
    print("☁️  UPLOADING TO S3")
    print("=" * 80)

    uploaded = []
    for image_result in downloaded:
        result = upload_to_s3(image_result, bucket_name)
        if result:
            uploaded.append(result)

    # Create manifest
    manifest = {
        "generated_at": datetime.now().isoformat(),
        "source": "Unsplash",
        "bucket": bucket_name,
        "path": "media/images/",
        "images": uploaded,
        "license": "Unsplash License (free for commercial use with attribution)"
    }

    manifest_path = os.path.join(OUTPUT_DIR, "hero-manifest.json")
    import json
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    # Summary
    print("\n" + "=" * 80)
    print("✅ DOWNLOAD COMPLETE")
    print("=" * 80)
    print(f"📊 Downloaded: {len(downloaded)}/{len(HERO_IMAGES)} images")
    print(f"☁️  Uploaded: {len(uploaded)}/{len(downloaded)} images")
    print(f"📄 Manifest: {manifest_path}")

    print("\n🖼️  IMAGE URLS:")
    for img in uploaded:
        print(f"\n  {img['filename']}")
        print(f"  └─ {img['s3_url']}")
        print(f"     ({img['size_kb']} KB)")

    print("\n💡 NEXT STEPS:")
    print("1. Review images in hero_output/")
    print("2. Copy S3 URLs from manifest")
    print("3. Add to your React component")

    print("\n🎨 INTEGRATION EXAMPLE:")
    print("""
const HERO_IMAGES = [""")
    for img in uploaded:
        print(f"  '{img['s3_url']}',")
    print("""];

// Random hero on mount
const [hero, setHero] = useState('');
useEffect(() => {
  const random = HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)];
  setHero(random);
}, []);

// Use in JSX
<img src={hero} alt="Athlete" className="..." />
    """)

    print("=" * 80)
    print("📜 LICENSE NOTE:")
    print("These images are from Unsplash (free for commercial use).")
    print("Attribution recommended but not required.")
    print("See: https://unsplash.com/license")
    print("=" * 80)

if __name__ == "__main__":
    main()
