<#
End-to-end test of the payout-address hardening flow, against the REAL
deployed edge functions. Run this yourself -- it needs
$env:SUPABASE_SERVICE_ROLE_KEY set first, which should never be pasted
into a chat session.

Defaults to the disposable seed account "Thabo"
(4101e0f6-2d04-43ce-a7b2-ad800d149086, seed-wh-01@sow2grow.test) --
never Rodney's or any real member's account. Its email is a .test
address (RFC 2606 reserved, never routable), so real inbox delivery is
never checked here -- instead this checks send_brevo_email's own HTTP
response, surfaced back in update-crypto-payout's response as
email_notification (added specifically so this is checkable without
needing dashboard log access). A true .test domain will likely still
get accepted by Brevo's API (ok:true) even though nothing is ever
actually delivered downstream -- ok:true here proves the ATTEMPT
succeeded, not real inbox delivery. If you want to confirm actual
delivery too, check the send_brevo_email function's logs in the
Supabase dashboard (Edge Functions -> send_brevo_email -> Logs) for the
same timestamp.

Usage:
    $env:SUPABASE_SERVICE_ROLE_KEY = "<paste from Supabase -> Settings -> API>"
    .\scripts\wallet-hardening-e2e-test.ps1
#>

$ErrorActionPreference = "Stop"

$SupabaseUrl = if ($env:SUPABASE_URL) { $env:SUPABASE_URL } else { "https://zuwkgasbkpjlxzsjzumu.supabase.co" }
$SupabaseAnonKey = if ($env:SUPABASE_ANON_KEY) { $env:SUPABASE_ANON_KEY } else { "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1d2tnYXNia3BqbHh6c2p6dW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NDk4MjEsImV4cCI6MjA2ODQyNTgyMX0.ffH_7MzNCgyjXf8BFzGDCiVE7Qjptqb9qKBkq3gVbiU" }
$ServiceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY
if (-not $ServiceRoleKey) {
    Write-Error "Set `$env:SUPABASE_SERVICE_ROLE_KEY first (Supabase dashboard -> Settings -> API -> service_role)."
    exit 1
}

$TestUserId = if ($env:TEST_USER_ID) { $env:TEST_USER_ID } else { "4101e0f6-2d04-43ce-a7b2-ad800d149086" }  # seed account "Thabo"
$TestTempPassword = if ($env:TEST_TEMP_PASSWORD) { $env:TEST_TEMP_PASSWORD } else { "WalletHardeningTest" + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds() + "x" }
$TestSolanaAddress = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"  # syntactically valid Solana address, used only as test data
$BodyFile = Join-Path $env:TEMP "wh-e2e-body.json"

# Robust curl.exe wrapper: status code and body captured separately (curl.exe
# exits 0 even on 4xx/5xx by default, so $LASTEXITCODE can't tell success
# from a 401/429 -- -o/-w to a real status var is the reliable pattern).
function Invoke-CurlJson {
    param(
        [string]$Method = "POST",
        [string]$Url,
        [string]$BearerToken,
        [hashtable]$Body
    )
    $curlArgs = [System.Collections.Generic.List[string]]::new()
    $curlArgs.AddRange([string[]]@(
        "-s", "-X", $Method,
        "-H", "apikey: $SupabaseAnonKey",
        "-H", "Authorization: Bearer $BearerToken",
        "-H", "Content-Type: application/json",
        "-o", "$BodyFile.response",
        "-w", "%{http_code}"
    ))
    if ($Body) {
        # Set-Content -Encoding utf8NoBOM doesn't exist in Windows
        # PowerShell 5.1 (that value was added in PS 6+) -- a BOM'd file
        # would put stray bytes at the start of the JSON curl.exe sends as
        # the request body. [System.Text.UTF8Encoding]::new($false) is the
        # 5.1-compatible way to write BOM-less UTF-8.
        $jsonBody = $Body | ConvertTo-Json -Compress
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText($BodyFile, $jsonBody, $utf8NoBom)
        $curlArgs.AddRange([string[]]@("-d", "@$BodyFile"))
    }
    $curlArgs.Add($Url)
    # Splat a plain array, not the List[string] itself -- splatting a
    # generic List<T> directly isn't a guaranteed-identical code path to
    # splatting a native [object[]] array in Windows PowerShell 5.1;
    # .ToArray() removes the ambiguity rather than relying on it.
    $statusCode = & curl.exe @($curlArgs.ToArray())
    $responseText = Get-Content "$BodyFile.response" -Raw -ErrorAction SilentlyContinue
    $parsed = $null
    try { $parsed = $responseText | ConvertFrom-Json } catch { }
    [PSCustomObject]@{ StatusCode = [int]$statusCode; Body = $responseText; Json = $parsed }
}

Write-Host "=== 0. Look up the test account's email ===" -ForegroundColor Cyan
$userLookup = Invoke-CurlJson -Method GET -Url "$SupabaseUrl/auth/v1/admin/users/$TestUserId" -BearerToken $ServiceRoleKey
$Email = $userLookup.Json.email
Write-Host "Test account email: $Email"
if (-not $Email) { Write-Error "Could not resolve email for $TestUserId -- aborting. Response: $($userLookup.Body)"; exit 1 }
if ($Email -ne "seed-wh-01@sow2grow.test") {
    Write-Warning "Expected seed-wh-01@sow2grow.test but got $Email -- double-check TEST_USER_ID before continuing."
}

Write-Host "`n=== 1. Set a known temporary password (Auth admin API) ===" -ForegroundColor Cyan
$setPw = Invoke-CurlJson -Method PUT -Url "$SupabaseUrl/auth/v1/admin/users/$TestUserId" -BearerToken $ServiceRoleKey -Body @{ password = $TestTempPassword }
Write-Host "HTTP $($setPw.StatusCode)"
$setPw.Json | ConvertTo-Json -Depth 5

Write-Host "`n=== 2. Sign in for real, get a genuine session access token ===" -ForegroundColor Cyan
$signIn = Invoke-CurlJson -Method POST -Url "$SupabaseUrl/auth/v1/token?grant_type=password" -BearerToken $SupabaseAnonKey -Body @{ email = $Email; password = $TestTempPassword }
$AccessToken = $signIn.Json.access_token
if (-not $AccessToken) { Write-Error "Sign-in failed: $($signIn.Body)"; exit 1 }
Write-Host "Got a real access token (not shown)."

Write-Host "`n=== 3. Wrong password -- expect HTTP 401, code reauth_failed ===" -ForegroundColor Cyan
$payloadBase = @{
    payout_network         = "solana_usdc"
    payout_address          = $TestSolanaAddress
    payout_address_confirm  = $TestSolanaAddress
    payout_tag              = $null
    payout_wallet_type      = "personal"
}
$wrongPw = $payloadBase.Clone()
$wrongPw.current_password = "definitely-the-wrong-password"
$r3 = Invoke-CurlJson -Url "$SupabaseUrl/functions/v1/update-crypto-payout" -BearerToken $AccessToken -Body $wrongPw
Write-Host "HTTP $($r3.StatusCode)"
$r3.Json | ConvertTo-Json -Depth 5
if ($r3.StatusCode -eq 401 -and $r3.Json.code -eq "reauth_failed") {
    Write-Host "CONFIRMED: wrong password correctly rejected." -ForegroundColor Green
} else {
    Write-Host "UNEXPECTED: expected 401/reauth_failed." -ForegroundColor Red
}

Write-Host "`n=== 4. Right password -- expect success + email attempt ===" -ForegroundColor Cyan
$rightPw = $payloadBase.Clone()
$rightPw.current_password = $TestTempPassword
$r4 = Invoke-CurlJson -Url "$SupabaseUrl/functions/v1/update-crypto-payout" -BearerToken $AccessToken -Body $rightPw
Write-Host "HTTP $($r4.StatusCode)"
$r4.Json | ConvertTo-Json -Depth 5
if ($r4.StatusCode -eq 200 -and $r4.Json.success -eq $true -and $r4.Json.payout.payout_address -eq $TestSolanaAddress) {
    Write-Host "CONFIRMED: right password accepted, payout_address saved." -ForegroundColor Green
} else {
    Write-Host "UNEXPECTED: expected HTTP 200 with success:true." -ForegroundColor Red
}
if ($r4.Json.email_notification.attempted -eq $true) {
    if ($r4.Json.email_notification.ok -eq $true) {
        Write-Host "CONFIRMED: email attempt via send_brevo_email succeeded (ok:true). This does NOT prove real inbox delivery for a .test address -- check send_brevo_email's own function logs in the dashboard for that." -ForegroundColor Green
    } else {
        Write-Host "email attempt was made but failed: $($r4.Json.email_notification.error) -- check BREVO_API_KEY is configured, or check send_brevo_email's logs." -ForegroundColor Yellow
    }
} else {
    Write-Host "email_notification field missing from the response -- is the deployed update-crypto-payout up to date?" -ForegroundColor Red
}

Write-Host "`n=== 5. Rate limiting -- fire more requests, expect the 6th (this hour) to 429 ===" -ForegroundColor Cyan
Write-Host "Already made 2 POSTs above (steps 3-4). PAYMENT preset = 5/hour, so 3 more should"
Write-Host "succeed-or-fail-normally, and the 6th total should be HTTP 429."
for ($i = 3; $i -le 5; $i++) {
    Write-Host "--- attempt #$i (of this run) ---"
    $rN = Invoke-CurlJson -Url "$SupabaseUrl/functions/v1/update-crypto-payout" -BearerToken $AccessToken -Body $rightPw
    Write-Host "HTTP $($rN.StatusCode)"
}
Write-Host "--- attempt #6 (of this run, #6 overall this hour) -- expect HTTP 429 ---"
$r6 = Invoke-CurlJson -Url "$SupabaseUrl/functions/v1/update-crypto-payout" -BearerToken $AccessToken -Body $rightPw
Write-Host "HTTP $($r6.StatusCode)"
$r6.Json | ConvertTo-Json -Depth 5
if ($r6.StatusCode -eq 429) {
    Write-Host "CONFIRMED: rate limiting triggered on the 6th attempt." -ForegroundColor Green
} else {
    Write-Host "UNEXPECTED: expected HTTP 429 on the 6th attempt (got $($r6.StatusCode)) -- if earlier attempts also failed validation before reaching the rate limiter, the count may be off; check RateLimitPresets.PAYMENT (5/60min) and how many POSTs actually landed above." -ForegroundColor Red
}

Write-Host "`n=== 6. Cooling-off -- payout-earnings dry run should show this recipient skipped ===" -ForegroundColor Cyan
Write-Host "(Only observable if this account currently has an owed balance on the Solana rail --"
Write-Host " if it doesn't, this recipient won't appear in the dry-run output at all, and the"
Write-Host " only available proof is payout_details_updated_at being very recent, already"
Write-Host " confirmed by step 4's response above.)"
$dryRun = Invoke-CurlJson -Url "$SupabaseUrl/functions/v1/payout-earnings" -BearerToken $ServiceRoleKey -Body @{ dry_run = $true }
$mine = $dryRun.Json.recipients | Where-Object { $_.recipient_user_id -eq $TestUserId }
if ($mine) {
    $mine | ConvertTo-Json -Depth 5
    if ($mine.reason -eq "payout_address_cooling_off") {
        Write-Host "CONFIRMED: cooling-off is blocking this recipient." -ForegroundColor Green
    } else {
        Write-Host "Recipient found in dry run but not flagged payout_address_cooling_off -- reason: $($mine.reason)" -ForegroundColor Yellow
    }
} else {
    Write-Host "This recipient has no owed balance right now -- nothing to show in the dry run."
}

Write-Host "`n=== Done. Cleanup reminder ===" -ForegroundColor Cyan
Write-Host "Seed account $Email password is now: $TestTempPassword"
Write-Host "This is a disposable seed account (never Rodney's or any real member's) -- reset or"
Write-Host "reseed it as you normally would for this account."
Write-Host "payout_address was set to the test address $TestSolanaAddress -- clear it if that"
Write-Host "shouldn't persist."
Write-Host "To cross-check real email attempt logs: Supabase dashboard -> Edge Functions ->"
Write-Host "send_brevo_email -> Logs, filtered to around the time this ran."

Remove-Item -Path $BodyFile, "$BodyFile.response" -ErrorAction SilentlyContinue
