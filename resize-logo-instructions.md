# Quick Guide: Resize Logo for PWA Icon

## The Issue
Your logo is being cropped because it's too large and doesn't fit within the safe zone required for PWA icons.

## Quick Fix Steps

### Using Online Tool (Fastest - 2 minutes)
1. Go to: **https://maskable.app/editor**
2. Click "Upload" and select `public/cashmate_wallet_logo.png`
3. You'll see your logo with a circular safe zone overlay
4. **Drag the resize handles** to make your logo smaller so it fits inside the safe zone
5. Preview shows how it looks on different devices
6. Click "Download" 
7. Replace `public/cashmate_wallet_logo.png` with the downloaded file
8. Clear browser cache and reinstall PWA

### Using Image Editor (Manual)
1. Open `public/cashmate_wallet_logo.png` in any image editor
2. **Make the logo smaller**: Resize it to about 60-70% of the canvas
3. **Center it**: Position the logo in the middle of the image
4. **Check dimensions**: For 512x512px icon, logo should be ~300-350px (centered)
5. Save and replace the file

## What is Safe Zone?
- The safe zone is the center 80% of the icon
- Important content (your logo) must stay within this area
- The outer 10% on each side can be cropped by device masks
- This ensures your logo is never cut off

## After Resizing
1. Clear browser cache (Ctrl+Shift+Delete)
2. Uninstall the PWA from home screen
3. Reinstall by visiting the site and clicking "Add to Home Screen"
4. The logo should now display fully without cropping
