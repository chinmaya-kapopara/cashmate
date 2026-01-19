# Fixing Cropped PWA Icon

## The Problem
When adding the app to the home screen, the logo appears cropped because maskable icons require a "safe zone" - the important content must be within the center 80% of the image.

## Solution

### Option 1: Edit the Logo Image (Recommended)
1. Open `public/cashmate_wallet_logo.png` in an image editor
2. Add padding around the logo so it occupies only the center 80% of the image
3. Leave 10% padding on all sides (top, bottom, left, right)
4. Save the updated image

### Option 2: Use an Online Tool
1. Visit https://maskable.app/editor
2. Upload your logo
3. Adjust the safe zone preview
4. Download the properly formatted maskable icon
5. Replace `public/cashmate_wallet_logo.png` with the new icon

### Option 3: Create Separate Icons
Create two versions:
- **Regular icon** (`icon-any.png`): Full logo, fills entire image
- **Maskable icon** (`icon-maskable.png`): Logo with safe zone padding

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
