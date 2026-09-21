<#
.SYNOPSIS
  Full local dump of the live Sow2Grow database, to a folder OUTSIDE the repo.

.DESCRIPTION
  Run this before any destructive migration or bulk data operation.

  The dump contains real member data. It is written outside the repository
  on purpose and this script refuses to write anywhere inside it. Never
  commit or push a dump.

  The connection string is read from the environment. It is never
  hardcoded here and must never be pasted into this file:

      $env:S2G_DB_URL        preferred
      $env:DATABASE_URL      fallback
      $env:SUPABASE_DB_URL   fallback

  Get it from the Supabase dashboard:
      Project Settings -> Database -> Connection string -> URI
      (tick "Use connection pooling" for the session pooler)
  and put it in a gitignored file, e.g. .env.db in the repo root, which
  .gitignore already covers via the `.env*` rule (verified 2026-09-21).

  If no connection string is set, the script falls back to
  `supabase db dump --linked`, which mints a temporary login role through
  the Management API and needs no password -- but that path runs pg_dump
  inside Docker, so Docker Desktop must be installed and running.

.PARAMETER OutDir
  Destination folder. Default C:\Users\Ezra\S2G-backups.

.PARAMETER Schemas
  Schemas to include. Default public,auth,storage.

.EXAMPLE
  pwsh -File scripts/studio/local-db-dump.ps1
#>
[CmdletBinding()]
param(
  [string]$OutDir = 'C:\Users\Ezra\S2G-backups',
  [string[]]$Schemas = @('public', 'auth', 'storage'),

  # How many dated dumps to keep. Older ones are deleted after a successful run.
  [int]$KeepDumps = 14
)

$ErrorActionPreference = 'Stop'

# --- percent-encode the password, so a raw ? @ # / in it cannot break parsing
# A Supabase-generated password routinely contains characters that are
# reserved in a URI. Unencoded, pg_dump reads everything after the first '?'
# as a query string and fails with "missing key/value separator". Encoding it
# here means the value in .env.db can be pasted straight from the dashboard.
# Idempotent: an already-encoded password decodes and re-encodes unchanged.
function Get-NormalizedPgUrl {
  param([string]$Url)
  if ($Url -notmatch '^(postgres(?:ql)?://)(.*)$') { return $Url }
  $scheme = $Matches[1]
  $rest   = $Matches[2]
  $at = $rest.LastIndexOf('@')
  if ($at -lt 0) { return $Url }
  $userinfo = $rest.Substring(0, $at)
  $hostpart = $rest.Substring($at + 1)
  $colon = $userinfo.IndexOf(':')
  if ($colon -lt 0) { return $Url }
  $user = $userinfo.Substring(0, $colon)
  $pass = $userinfo.Substring($colon + 1)
  $enc  = [uri]::EscapeDataString([uri]::UnescapeDataString($pass))
  return ($scheme + $user + ':' + $enc + '@' + $hostpart)
}

# --- never write inside the repo -------------------------------------------
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$resolvedOut = [System.IO.Path]::GetFullPath($OutDir)
if ($resolvedOut.StartsWith($repoRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw "Refusing to dump into the repository ($resolvedOut). A dump holds member data and must stay outside version control."
}
if (-not (Test-Path $resolvedOut)) { New-Item -ItemType Directory -Force -Path $resolvedOut | Out-Null }

$stamp  = Get-Date -Format 'yyyy-MM-dd'
$target = Join-Path $resolvedOut "s2g-dump-$stamp.sql"
$schemaList = $Schemas -join ','

# --- connection string ------------------------------------------------------
# Environment first. If it is not there, read it out of the gitignored
# .env.db in the repo root -- Task Scheduler starts a process with no shell
# profile, so a scheduled run has nothing but what this script loads itself.
$dbUrl = $env:S2G_DB_URL
if (-not $dbUrl) { $dbUrl = $env:DATABASE_URL }
if (-not $dbUrl) { $dbUrl = $env:SUPABASE_DB_URL }

if (-not $dbUrl) {
  $envFile = Join-Path $repoRoot '.env.db'
  if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
      if ($line -match '^\s*(S2G_DB_URL|DATABASE_URL|SUPABASE_DB_URL)\s*=\s*(.+?)\s*$') {
        $val = $Matches[2].Trim(([char]34), ([char]39))
        if (-not $dbUrl) { $dbUrl = $val }
      }
    }
    if ($dbUrl) { Write-Host "Connection string loaded from $envFile" }
  }
}

# pg_dump is usually NOT on PATH after a winget install of PostgreSQL --
# look where the installer actually puts it, newest major version first.
if ($dbUrl) { $dbUrl = Get-NormalizedPgUrl -Url $dbUrl }

$pgDump = (Get-Command pg_dump -ErrorAction SilentlyContinue).Source
if (-not $pgDump) {
  $pgDump = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_dump.exe' -ErrorAction SilentlyContinue |
    Sort-Object { [int]($_.Directory.Parent.Name) } -Descending |
    Select-Object -First 1 -ExpandProperty FullName
}

Write-Host "Target : $target"
Write-Host "Schemas: $schemaList"

if ($pgDump -and -not $dbUrl) {
  throw @"
pg_dump is installed ($pgDump) but no connection string is available.

Set S2G_DB_URL, or put it in the gitignored file:
    $repoRoot\.env.db
as a single line:
    S2G_DB_URL=postgresql://postgres.<ref>:<password>@aws-0-us-east-1.pooler.supabase.com:5432/postgres

Copy it from Supabase -> Project Settings -> Database -> Connection string
-> URI, with "Use connection pooling" ticked and mode Session (port 5432).
Percent-encode any @ : / ? # & in the password.
"@
}

if ($pgDump -and $dbUrl) {
  # Fastest and most faithful: pg_dump straight at the database, no Docker.
  Write-Host "Using pg_dump at $pgDump"
  $args = @('--dbname', $dbUrl, '--no-owner', '--no-privileges', '--file', $target)
  foreach ($s in $Schemas) { $args += @('--schema', $s) }
  & $pgDump @args
  if ($LASTEXITCODE -ne 0) { throw "pg_dump exited $LASTEXITCODE" }
}
elseif (Get-Command supabase -ErrorAction SilentlyContinue) {
  # Supabase CLI. Schema and data are separate invocations; concatenated
  # into one restorable file, schema first.
  Write-Host 'Using the Supabase CLI (requires Docker Desktop running).'
  $schemaPart = Join-Path $resolvedOut ".schema-$stamp.part"
  $dataPart   = Join-Path $resolvedOut ".data-$stamp.part"
  $linkArgs = @()
  if ($dbUrl) { $linkArgs = @('--db-url', $dbUrl) } else { $linkArgs = @('--linked') }

  & supabase db dump @linkArgs -s $schemaList -f $schemaPart
  if ($LASTEXITCODE -ne 0) { throw "supabase db dump (schema) exited $LASTEXITCODE" }
  & supabase db dump @linkArgs -s $schemaList --data-only --use-copy -f $dataPart
  if ($LASTEXITCODE -ne 0) { throw "supabase db dump (data) exited $LASTEXITCODE" }

  "-- Sow2Grow dump $stamp -- schemas: $schemaList" | Set-Content -Path $target -Encoding utf8
  Get-Content $schemaPart | Add-Content -Path $target -Encoding utf8
  Get-Content $dataPart   | Add-Content -Path $target -Encoding utf8
  Remove-Item $schemaPart, $dataPart -Force
}
else {
  throw @'
No way to dump: pg_dump is not on PATH and the Supabase CLI is not installed.

Install ONE of:
  - PostgreSQL client tools (gives pg_dump, no Docker needed), then set
    $env:S2G_DB_URL from Supabase -> Project Settings -> Database ->
    Connection string -> URI
  - Docker Desktop, then `supabase db dump --linked` works with no password
'@
}

# --- honest verification ----------------------------------------------------
if (-not (Test-Path $target)) { throw "No dump was produced at $target" }
$size   = (Get-Item $target).Length
$text   = Get-Content $target -Raw
$tables = ([regex]::Matches($text, '(?im)^\s*CREATE\s+TABLE\b')).Count
$copies = ([regex]::Matches($text, '(?im)^\s*COPY\s+')).Count
$first  = (Get-Content $target -TotalCount 5) -join ' '

Write-Host ''
Write-Host "Size          : $([math]::Round($size/1MB,2)) MB ($size bytes)"
Write-Host "CREATE TABLE  : $tables"
Write-Host "COPY blocks   : $copies"
Write-Host "Looks like SQL: $([bool]($first -match '--|SET|CREATE|COPY'))"
if ($size -lt 10240) { Write-Warning 'Dump is under 10 KB. That is almost certainly a failure, not a small database.' }
if ($tables -eq 0)   { Write-Warning 'No CREATE TABLE statements. Schema did not land.' }
# --- retention: keep the newest $KeepDumps, delete the rest -----------------
$all = Get-ChildItem (Join-Path $resolvedOut 's2g-dump-*.sql') -ErrorAction SilentlyContinue |
       Sort-Object LastWriteTime -Descending
if ($all.Count -gt $KeepDumps) {
  $old = $all | Select-Object -Skip $KeepDumps
  foreach ($f in $old) {
    Write-Host "Pruning old dump: $($f.Name)"
    Remove-Item $f.FullName -Force
  }
}
Write-Host "Dumps retained: $([math]::Min($all.Count, $KeepDumps)) of a $KeepDumps-day window"

Write-Host ''
Write-Host "Done: $target"
Write-Host 'This file holds member data. Keep it out of the repo; never commit or push it.'
