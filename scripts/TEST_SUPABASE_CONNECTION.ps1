# Test Supabase Connection and Configuration
# Run this to diagnose network issues before deployment

Write-Host "=== SUPABASE CONNECTION DIAGNOSTICS ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check Supabase CLI
Write-Host "1. Checking Supabase CLI..." -ForegroundColor Yellow
try {
    $version = & "C:\Tools\supabase\supabase.exe" --version 2>&1
    Write-Host "   ✅ CLI Version: $version" -ForegroundColor Green
} catch {
    Write-Host "   ❌ CLI not found or not working" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# Test 2: Check Authentication
Write-Host "`n2. Checking Authentication..." -ForegroundColor Yellow
try {
    $projects = & "C:\Tools\supabase\supabase.exe" projects list 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Authenticated successfully" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ Not authenticated or project not linked" -ForegroundColor Yellow
        Write-Host "   Run: supabase login" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   ❌ Authentication check failed" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
}

# Test 3: Test DNS Resolution
Write-Host "`n3. Testing DNS Resolution..." -ForegroundColor Yellow
try {
    $dns = Resolve-DnsName api.supabase.com -ErrorAction Stop
    Write-Host "   ✅ DNS Resolution: OK" -ForegroundColor Green
    Write-Host "   IP Address: $($dns[0].IPAddress)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ DNS Resolution Failed" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    Write-Host "   💡 Try changing DNS to 8.8.8.8 and 8.8.4.4" -ForegroundColor Yellow
}

# Test 4: Test Network Connectivity
Write-Host "`n4. Testing Network Connectivity..." -ForegroundColor Yellow
try {
    $connection = Test-NetConnection api.supabase.com -Port 443 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($connection) {
        Write-Host "   ✅ Network Connection: OK" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Network Connection: Failed" -ForegroundColor Red
        Write-Host "   💡 Check firewall/antivirus settings" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️ Could not test connection (may require admin)" -ForegroundColor Yellow
}

# Test 5: Test HTTPS Connection
Write-Host "`n5. Testing HTTPS Connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "https://api.supabase.com" -Method Head -TimeoutSec 10 -ErrorAction Stop
    Write-Host "   ✅ HTTPS Connection: OK (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "   ❌ HTTPS Connection: Failed" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    
    # Check if it's a proxy issue
    if ($_.Exception.Message -like "*proxy*" -or $_.Exception.Message -like "*407*") {
        Write-Host "   💡 Detected proxy issue. Set proxy environment variables:" -ForegroundColor Yellow
        Write-Host "      `$env:HTTP_PROXY = 'http://your-proxy:port'" -ForegroundColor Cyan
        Write-Host "      `$env:HTTPS_PROXY = 'http://your-proxy:port'" -ForegroundColor Cyan
    }
}

# Test 6: Check Project Link
Write-Host "`n6. Checking Project Link..." -ForegroundColor Yellow
if (Test-Path "supabase\.temp\project-ref") {
    $projectRef = Get-Content "supabase\.temp\project-ref" -ErrorAction SilentlyContinue
    if ($projectRef) {
        Write-Host "   ✅ Project Linked: $projectRef" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ Project not linked" -ForegroundColor Yellow
        Write-Host "   Run: supabase link --project-ref zuwkgasbkpjlxzsjzumu" -ForegroundColor Cyan
    }
} else {
    Write-Host "   ⚠️ Project not linked" -ForegroundColor Yellow
    Write-Host "   Run: supabase link --project-ref zuwkgasbkpjlxzsjzumu" -ForegroundColor Cyan
}

# Test 7: Check Firewall Status
Write-Host "`n7. Checking Windows Firewall..." -ForegroundColor Yellow
try {
    $firewall = Get-NetFirewallProfile -ErrorAction SilentlyContinue
    if ($firewall) {
        $enabled = ($firewall | Where-Object { $_.Enabled -eq $true }).Count
        if ($enabled -gt 0) {
            Write-Host "   ⚠️ Windows Firewall is enabled" -ForegroundColor Yellow
            Write-Host "   💡 Consider adding supabase.exe to firewall exceptions" -ForegroundColor Yellow
        } else {
            Write-Host "   ✅ Windows Firewall: Not blocking" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "   ⚠️ Could not check firewall (may require admin)" -ForegroundColor Yellow
}

# Summary
Write-Host "`n=== DIAGNOSTIC SUMMARY ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If all tests pass, try deploying:" -ForegroundColor Green
Write-Host "  .\DEPLOY_FUNCTIONS_INDIVIDUALLY.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "If tests fail, see:" -ForegroundColor Yellow
Write-Host "  NETWORK_ERROR_DEPLOYMENT_FIX.md" -ForegroundColor Cyan
Write-Host ""

