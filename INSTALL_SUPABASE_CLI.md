# Install Supabase CLI on Windows

## Method 1: Download Binary (Easiest)

### Step 1: Download Supabase CLI
1. Go to: https://github.com/supabase/cli/releases/latest
2. Download: `supabase_X.X.X_windows_amd64.zip` (or the latest version)
3. Extract the ZIP file
4. Copy `supabase.exe` to a folder in your PATH (like `C:\Windows\System32` or create `C:\Tools` and add it to PATH)

### Step 2: Add to PATH (If needed)
1. Press `Win + X` → **System** → **Advanced system settings**
2. Click **Environment Variables**
3. Under **System variables**, find **Path** and click **Edit**
4. Click **New** and add the folder where you put `supabase.exe`
5. Click **OK** on all dialogs
6. **Close and reopen** Command Prompt

### Step 3: Verify Installation
```powershell
supabase --version
```

---

## Method 2: Use PowerShell Script (Recommended)

**Run this in PowerShell (as Administrator):**

```powershell
# Download and install Supabase CLI
$url = "https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.zip"
$output = "$env:TEMP\supabase.zip"
$extractPath = "$env:ProgramFiles\Supabase"

# Download
Invoke-WebRequest -Uri $url -OutFile $output

# Extract
Expand-Archive -Path $output -DestinationPath $extractPath -Force

# Add to PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($currentPath -notlike "*$extractPath*") {
    [Environment]::SetEnvironmentVariable("Path", "$currentPath;$extractPath", "Machine")
    $env:Path += ";$extractPath"
}

# Verify
& "$extractPath\supabase.exe" --version
```

---

## Method 3: Manual Download (Simplest)

1. **Download**: https://github.com/supabase/cli/releases/latest
   - Look for: `supabase_X.X.X_windows_amd64.zip`
   - Download it

2. **Extract**:
   - Right-click the ZIP → **Extract All**
   - Extract to: `C:\Tools\supabase\` (or any folder you prefer)

3. **Add to PATH**:
   - Press `Win + R`
   - Type: `sysdm.cpl` → Press Enter
   - Click **Advanced** tab → **Environment Variables**
   - Under **System variables**, select **Path** → **Edit**
   - Click **New** → Add: `C:\Tools\supabase` (or wherever you extracted it)
   - Click **OK** on all dialogs

4. **Restart Command Prompt**:
   - Close your current Command Prompt
   - Open a new one
   - Run: `supabase --version`

---

## Quick Test

After installation, verify it works:

```powershell
supabase --version
```

You should see something like:
```
supabase X.X.X
```

---

## If You Get "Command Not Found"

1. Make sure you **restarted Command Prompt** after adding to PATH
2. Check the folder path is correct
3. Try the full path: `C:\Tools\supabase\supabase.exe --version`
4. If that works, PATH isn't set correctly - redo Step 3 above

---

## Once Installed

Continue with **STEP 2** in `STEP_BY_STEP_DEPLOY.md`:
```powershell
supabase login
```

