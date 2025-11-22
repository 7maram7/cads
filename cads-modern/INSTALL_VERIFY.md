# Installation Verification Guide

After running `./setup.sh`, use this guide to verify everything is working correctly.

## Quick Verification Checklist

### ✅ 1. Python Packages Installed

```bash
python3 -c "import cv2, numpy, scipy; print('✓ All packages installed')"
```

**Expected output**: `✓ All packages installed`

**If it fails**: Run `pip3 install -r python/requirements.txt` again

### ✅ 2. Python Backend Works

```bash
echo '{"command":"ping"}' | python3 python/main.py
```

**Expected output**:
```json
{"type": "result", "data": {"success": true, "message": "pong"}}
```

**If it fails**: Check that python/main.py is executable (`chmod +x python/main.py`)

### ✅ 3. Node.js Packages Installed

```bash
ls node_modules/electron node_modules/react node_modules/d3
```

**Expected output**: Should list directories without errors

**If it fails**: Run `npm install` again

### ✅ 4. Run Full Backend Test (Optional)

```bash
python3 python/test_backend.py
```

**Expected output**:
```
==================================================
CADS Python Backend Tests
==================================================

Testing feature detection...
  ✓ Detected XXX features
Testing feature matching...
  ✓ Match distance: XX.XX
Testing clustering...
  ✓ Clustered 5 images
  ✓ Tree structure has XX nodes
Testing JSON interface...
  ✓ JSON interface working

==================================================
Results: 4 passed, 0 failed
==================================================
```

**This test**:
- Creates synthetic test images
- Runs feature detection
- Tests feature matching
- Performs clustering
- Validates the JSON interface

### ✅ 5. Launch the Application

```bash
npm run electron:dev
```

**Expected behavior**:
1. Two terminal windows appear (Vite dev server + Electron)
2. Electron window opens after a few seconds
3. App shows "CADS - Computer-Aided Die Study" header
4. Sidebar shows "Python Backend: Ready" in **green**
5. No errors in the developer console

**If Electron doesn't open**:
- Wait 10-15 seconds (Vite needs to start first)
- Check terminal for errors
- Try closing and running again

**If "Python Backend: Not Available"**:
- Go back to step 1 and verify Python packages
- Check Python is in PATH: `which python3`
- Check the developer console for error messages

## Common Issues

### Issue: "command not found: python3"

**Solution**:
```bash
# On macOS, Python 3 should be pre-installed
# If not, install via Homebrew:
brew install python3
```

### Issue: "ModuleNotFoundError: No module named 'cv2'"

**Solution**:
```bash
pip3 install opencv-python numpy scipy
```

### Issue: "npm ERR! missing script: electron:dev"

**Solution**:
```bash
# Make sure you're in the right directory
cd cads-modern

# Reinstall packages
npm install
```

### Issue: Electron window is blank/white

**Solution**:
1. Wait a few more seconds (Vite is still loading)
2. Check terminal for Vite dev server errors
3. Refresh the window: Cmd+R (macOS) or Ctrl+R (Windows/Linux)
4. Close everything and restart: `npm run electron:dev`

## Full Integration Test

Once the app is running:

1. **Create a test folder** with a few images (any JPG/PNG)
2. **Load images**: Click "Load Coin Images", select folder
3. **Analyze**: Click "Analyze Dies" (at least 2 images required)
4. **Watch progress**: Progress bar should update in real-time
5. **View results**: Dendrogram should appear
6. **Export**: Click "Export Results", save JSON file

If all of these work, your installation is perfect! 🎉

## Performance Expectations

- **Feature detection**: ~2-5 seconds per image
- **For 10 images**: ~30-60 seconds total
- **For 50 images**: ~3-5 minutes total
- **For 100 images**: ~6-10 minutes total

Progress updates should appear smoothly in real-time.

## Still Having Issues?

1. **Check Python version**: Should be 3.8 or later
   ```bash
   python3 --version
   ```

2. **Check Node version**: Should be 18 or later
   ```bash
   node --version
   ```

3. **Check installation logs**: Look for error messages during `setup.sh`

4. **Try clean reinstall**:
   ```bash
   # Remove everything
   rm -rf node_modules package-lock.json

   # Reinstall Python packages
   pip3 uninstall -y opencv-python numpy scipy
   pip3 install -r python/requirements.txt

   # Reinstall Node packages
   npm install

   # Try again
   npm run electron:dev
   ```

5. **Check the developer console** when app is running for specific error messages

## Success Indicators

✅ Setup script completed without errors
✅ Python packages import successfully
✅ Python backend responds to ping
✅ Electron app launches
✅ "Python Backend: Ready" shows in green
✅ Can load images
✅ Can analyze images (progress updates work)
✅ Dendrogram appears
✅ Can export results

If all of these check out, you're ready to use CADS Modern! 🚀
