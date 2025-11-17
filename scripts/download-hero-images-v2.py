#!/usr/bin/env python3
"""
Download Hero Images v2 for TheGradual App
Includes refreshed individual athletes + group workout shots
Uses high-quality free stock photos from Unsplash
"""

import boto3
import requests
import os
from datetime import datetime
import json

# Configuration
REGION = "us-east-2"
OUTPUT_DIR = "hero_output_v2"
BUCKET_NAME = "prod-web-origin-962595531541"

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Initialize S3 client
s3 = boto3.client("s3", region_name=REGION)

# Updated hero images with refreshed shots + group scenes
HERO_IMAGES = [
    # Refreshed individual shots
    {
        "filename": "hero-1-asian-woman.jpg",
        "url": "https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=1200&h=1200&fit=crop&crop=faces,center",
        "description": "Asian woman in sportswear ready for training",
        "photographer": "Unsplash - Bruce Mars"
    },
    {
        "filename": "hero-2-black-man.jpg",
        "url": "https://images.unsplash.com/photo-1521804906057-1df8fdb718b7?w=1200&h=1200&fit=crop&crop=faces,center",
        "description": "Athletic Black man in gym attire",
        "photographer": "Unsplash - Andrew Tanglao"
    },
    # Keep existing ones that work
    {
        "filename": "hero-3-latina-woman.jpg",
        "url": "https://images.unsplash.com/photo-1550345332-09e3ac987658?w=1200&h=1200&fit=crop&crop=faces,center",
        "description": "Latina woman with yoga mat in sportswear",
        "photographer": "Unsplash"
    },
    {
        "filename": "hero-4-white-man.jpg",
        "url": "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1200&h=1200&fit=crop&crop=faces,center",
        "description": "White man in gym clothes with towel",
        "photographer": "Unsplash"
    },
    # NEW: Group workout scenes
    {
        "filename": "hero-5-group-training.jpg",
        "url": "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=1200&h=1200&fit=crop&crop=center",
        "description": "Diverse group doing partner workout training",
        "photographer": "Unsplash - Risen Wang"
    },
    {
        "filename": "hero-6-gym-buddies.jpg",
        "url": "https://images.unsplash.com/photo-1534258936925-c58bed479fcb?w=1200&h=1200&fit=crop&crop=center",
        "description": "Two friends training together at the gym",
        "photographer": "Unsplash - Jelmer Assink"
    }
]

def download_image(image_config):
    """Download image from URL"""
    filename = image_config['filename']
    url = image_config['url']

    print(f"\n📥 Downloading: {filename}")
    print(f"   Source: {url}")

    try:
        # Download image with User-Agent to avoid blocking
        headers = {
            'User-Agent': 'TheGradual-App/1.0'
        }
        response = requests.get(url, timeout=30, headers=headers)
        response.raise_for_status()

        # Save locally
        local_path = os.path.join(OUTPUT_DIR, filename)
        with open(local_path, 'wb') as f:
            f.write(response.content)

        size_kb = len(response.content) // 1024
        print(f"✅ Saved: {local_path} ({size_kb} KB)")

        return {
            **image_config,
            "local_path": local_path,
            "size_kb": size_kb,
            "image_data": response.content
        }

    except Exception as e:
        print(f"❌ Error downloading {filename}: {e}")
        return None

def upload_to_s3(image_result):
    """Upload image to S3 under /media/images"""
    if not image_result:
        return None

    filename = image_result['filename']
    s3_key = f"media/images/{filename}"

    print(f"☁️  Uploading to S3: s3://{BUCKET_NAME}/{s3_key}")

    try:
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=image_result['image_data'],
            ContentType='image/jpeg',
            CacheControl='public, max-age=31536000'  # 1 year cache
        )

        # CloudFront URL
        cloudfront_url = f"https://dixcgxyyjlm7x.cloudfront.net/{s3_key}"
        s3_url = f"https://{BUCKET_NAME}.s3.{REGION}.amazonaws.com/{s3_key}"

        print(f"✅ Uploaded: {cloudfront_url}")

        return {
            "filename": filename,
            "url": cloudfront_url,
            "s3_url": s3_url,
            "s3_key": s3_key,
            "description": image_result['description'],
            "size_kb": image_result['size_kb'],
            "photographer": image_result.get('photographer', 'Unsplash')
        }

    except Exception as e:
        print(f"❌ Error uploading {filename}: {e}")
        return None

def main():
    print("=" * 80)
    print("🎨 TheGradual Hero Image Downloader v2")
    print("=" * 80)
    print("📍 Region: us-east-2")
    print("📸 Source: Unsplash (free stock photos)")
    print("🎯 Count: 6 images (4 refreshed individuals + 2 NEW group shots)")
    print("=" * 80)
    print(f"\n🪣 Target bucket: {BUCKET_NAME}")
    print(f"📁 S3 path: /media/images/")
    print(f"💾 Local output: {OUTPUT_DIR}/")
    print(f"🌐 CloudFront: dixcgxyyjlm7x.cloudfront.net")

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
        result = upload_to_s3(image_result)
        if result:
            uploaded.append(result)

    # Create manifest
    manifest = {
        "generated_at": datetime.now().isoformat(),
        "version": "2.0",
        "source": "Unsplash",
        "bucket": BUCKET_NAME,
        "cloudfront_domain": "dixcgxyyjlm7x.cloudfront.net",
        "path": "media/images/",
        "images": uploaded,
        "license": "Unsplash License (free for commercial use with attribution)"
    }

    manifest_path = os.path.join(OUTPUT_DIR, "hero-manifest-v2.json")
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
        print(f"  └─ {img['url']}")
        print(f"     {img['description']} ({img['size_kb']} KB)")

    print("\n💡 UPDATED ARRAY FOR YOUR APP:")
    print("""
const HERO_IMAGES = [""")
    for img in uploaded:
        print(f"  '{img['url']}',  // {img['description']}")
    print("""];
    """)

    print("=" * 80)
    print("🎨 WHAT'S NEW:")
    print("  • Refreshed Asian woman photo (better angle)")
    print("  • Refreshed Black man photo (more athletic)")
    print("  • NEW: Group training scene (2-3 people)")
    print("  • NEW: Gym buddies scene (workout partners)")
    print("=" * 80)
    print("\n📜 LICENSE: Unsplash (free for commercial use)")
    print("    https://unsplash.com/license")
    print("=" * 80)

if __name__ == "__main__":
    main()
