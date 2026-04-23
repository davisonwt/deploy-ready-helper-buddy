# Deploy Edge Functions Individually with Retry Logic
# This script deploys functions one at a time to avoid network timeouts

Write-Host "=== INDIVIDUAL FUNCTION DEPLOYMENT ===" -ForegroundColor Cyan
Write-Host "Deploying functions one at a time to avoid network errors`n" -ForegroundColor Green

# Navigate to project
Set-Location "C:\Users\Ezra\deploy-ready-helper-buddy"
Write-Host "✅ Navigated to project directory`n" -ForegroundColor Green

# List of functions to deploy
$functions = @(
    "refresh-binance-wallet-balance",
    "sync-wallet-balance",
    "create-binance-pay-order",
    "create-stripe-payment",
    "create-eft-payment",
    "process-usdc-transfer",
    "binance-pay-webhook",
    "verify-chatapp",
    "purchase-media",
    "complete-product-bestowal",
    "create-cryptomus-payment",
    "cryptomus-webhook"
)

# Function to deploy with retry
function Deploy-Function {
    param(
        [string]$FunctionName,
        [int]$MaxRetries = 3
    )
    
    $attempt = 1
    $success = $false
    
    while ($attempt -le $MaxRetries -and -not $success) {
        Write-Host "`n📦 Deploying: $FunctionName (Attempt $attempt/$MaxRetries)..." -ForegroundColor Yellow
        
        # Try to deploy
        $result = & "C:\Tools\supabase\supabase.exe" functions deploy $FunctionName 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Successfully deployed: $FunctionName" -ForegroundColor Green
            $success = $true
        } else {
            Write-Host "❌ Failed to deploy: $FunctionName" -ForegroundColor Red
            Write-Host "Error: $result" -ForegroundColor Red
            
            if ($attempt -lt $MaxRetries) {
                $waitTime = $attempt * 10  # Exponential backoff: 10s, 20s, 30s
                Write-Host "⏳ Waiting $waitTime seconds before retry..." -ForegroundColor Yellow
                Start-Sleep -Seconds $waitTime
            }
        }
        
        $attempt++
    }
    
    if (-not $success) {
        Write-Host "`n⚠️ WARNING: Failed to deploy $FunctionName after $MaxRetries attempts" -ForegroundColor Red
        Write-Host "   You can deploy this manually via Dashboard or try again later.`n" -ForegroundColor Yellow
        return $false
    }
    
    return $true
}

# Track results
$successCount = 0
$failedFunctions = @()

# Deploy each function
foreach ($func in $functions) {
    if (Deploy-Function -FunctionName $func) {
        $successCount++
    } else {
        $failedFunctions += $func
    }
    
    # Small delay between deployments
    Start-Sleep -Seconds 2
}

# Summary
Write-Host "`n=== DEPLOYMENT SUMMARY ===" -ForegroundColor Cyan
Write-Host "✅ Successfully deployed: $successCount/$($functions.Count)" -ForegroundColor Green

if ($failedFunctions.Count -gt 0) {
    Write-Host "`n❌ Failed functions:" -ForegroundColor Red
    foreach ($func in $failedFunctions) {
        Write-Host "   - $func" -ForegroundColor Red
    }
    Write-Host "`n💡 Tip: Deploy failed functions via Supabase Dashboard:" -ForegroundColor Yellow
    Write-Host "   https://supabase.com/dashboard/project/zuwkgasbkpjlxzsjzumu/functions" -ForegroundColor Cyan
} else {
    Write-Host "`n🎉 All functions deployed successfully!" -ForegroundColor Green
}

Write-Host "`n=== DONE ===" -ForegroundColor Cyan

