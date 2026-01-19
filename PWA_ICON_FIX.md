# Fixing Cropped PWA Icon

## The Problem
When adding the app to the home screen, the logo appears cropped because maskable icons require a "safe zone" - the important content must be within the center 80% of the image.

## Solution - Make Logo Smaller to Fit

### Option 1: Use Maskable.app (Easiest - Recommended)
1. Visit https://maskable.app/editor
2. Upload `public/cashmate_wallet_logo.png`
3. **Important**: In the editor, you'll see a safe zone overlay (circular area)
4. **Resize your logo** so it fits completely within the safe zone (the center 80% area)
5. The tool will show you a preview of how it looks with different masks
6. Click "Download" to get the properly formatted icon
7. Replace `public/cashmate_wallet_logo.png` with the downloaded icon

### Option 2: Manual Resize in Image Editor
1. Open `public/cashmate_wallet_logo.png` in an image editor (Photoshop, GIMP, Paint.NET, etc.)
2. **Resize the logo itself** to be smaller (about 60-70% of the canvas size)
3. **Center the smaller logo** in the image
4. Ensure the logo is within the center 80% of the image (10% padding on all sides)
5. For a 512x512px icon:
   - Logo should be approximately 300-350px (centered)
   - This leaves ~80-100px padding on each side
6. Save the updated image

### Option 3: Create Separate Icons
Create two versions:
- **Regular icon** (`icon-any.png`): Full logo, fills entire image
- **Maskable icon** (`icon-maskable.png`): Smaller logo with safe zone padding

Then update the manifest to use both.

## Current Configuration
The manifest is now properly configured with:
- Multiple icon sizes (192x192, 512x512)
- Both "any" and "maskable" purposes
- Proper iOS icon configuration

## Testing
After updating the icon:
1. Clear browser cache
2. Uninstall the PWA from home screen
3. Reinstall the PWA
4. Check if the icon displays correctly
