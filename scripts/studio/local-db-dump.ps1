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
  [string[]]$Schemas = @('public', 'auth', 'storage')
)

$ErrorActionPreference = 'Stop'

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

# --- connection string, from the environment only --------------------------
$dbUrl = $env:S2G_DB_URL
if (-not $dbUrl) { $dbUrl = $env:DATABASE_URL }
if (-not $dbUrl) { $dbUrl = $env:SUPABASE_DB_URL }

$pgDump = (Get-Command pg_dump -ErrorAction SilentlyContinue).Source

Write-Host "Target : $target"
Write-Host "Schemas: $schemaList"

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
Write-Host ''
Write-Host "Done: $target"
Write-Host 'This file holds member data. Keep it out of the repo; never commit or push it.'
