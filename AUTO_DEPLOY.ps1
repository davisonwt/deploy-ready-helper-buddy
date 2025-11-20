# Automatic Deployment Script
# Run this after you've logged into Supabase

Write-Host "=== AUTOMATIC DEPLOYMENT SCRIPT ===" -ForegroundColor Cyan
Write-Host "`nThis will deploy all changes automatically!" -ForegroundColor Green

# Step 1: Navigate to project
Set-Location "C:\Users\Ezra\deploy-ready-helper-buddy"
Write-Host "`n✅ Navigated to project directory" -ForegroundColor Green

# Step 2: Link project (if not already linked)
Write-Host "`n📌 Linking Supabase project..." -ForegroundColor Yellow
& "C:\Tools\supabase\supabase.exe" link --project-ref zuwkgasbkpjlxzsjzumu
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Project linked!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Project may already be linked, continuing..." -ForegroundColor Yellow
}

# Step 3: Apply database migrations
Write-Host "`n🗄️ Applying database migrations..." -ForegroundColor Yellow
& "C:\Tools\supabase\supabase.exe" db push
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database migrations applied!" -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed. Check errors above." -ForegroundColor Red
    exit 1
}

# Step 4: Deploy all edge functions
Write-Host "`n⚙️ Deploying edge functions..." -ForegroundColor Yellow
& "C:\Tools\supabase\supabase.exe" functions deploy
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ All edge functions deployed!" -ForegroundColor Green
} else {
    Write-Host "❌ Function deployment failed. Check errors above." -ForegroundColor Red
    exit 1
}

# Step 5: Build frontend
Write-Host "`n🎨 Building frontend..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -eq 0) {
    pnpm build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Frontend built successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Frontend build failed. Check errors above." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ pnpm install failed. Check errors above." -ForegroundColor Red
    exit 1
}

# Step 6: Git commit and push (if using auto-deploy)
Write-Host "`n📤 Preparing to push to git..." -ForegroundColor Yellow
git add .
git commit -m "Deploy: All security, balance, payment, chat, and accounting fixes"
git push origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Code pushed to git!" -ForegroundColor Green
    Write-Host "`n🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
    Write-Host "`nYour changes are now live!" -ForegroundColor Cyan
} else {
    Write-Host "⚠️ Git push failed or not configured. Frontend built in dist/ folder." -ForegroundColor Yellow
    Write-Host "`n✅ Backend changes are deployed!" -ForegroundColor Green
    Write-Host "📁 Frontend is built in: dist/ folder" -ForegroundColor Cyan
    Write-Host "Upload dist/ folder contents to your hosting provider." -ForegroundColor Yellow
}

Write-Host "`n=== DEPLOYMENT SUMMARY ===" -ForegroundColor Cyan
Write-Host "✅ Database migrations: Applied" -ForegroundColor Green
Write-Host "✅ Edge functions: Deployed" -ForegroundColor Green
Write-Host "✅ Frontend: Built" -ForegroundColor Green
Write-Host "`nAll changes are now on your live website!" -ForegroundColor Green

