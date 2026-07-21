# 動作確認用の簡易静的サーバ（http://localhost:8766/）
$root = $PSScriptRoot
if (-not $root) { $root = Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $root) { $root = (Get-Location).Path }
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8766/")
$listener.Start()
Write-Output "Serving $root at http://localhost:8766/"
$mime = @{ ".html"="text/html; charset=utf-8"; ".js"="text/javascript; charset=utf-8"; ".css"="text/css"; ".json"="application/json" }
while ($listener.IsListening) {
  $ctx = $listener.GetContext()
  $path = $ctx.Request.Url.AbsolutePath.TrimStart("/")
  if ($path -eq "") { $path = "index.html" }
  $file = Join-Path $root $path
  try {
    if (Test-Path $file -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($file)
      $ext = [System.IO.Path]::GetExtension($file).ToLower()
      if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
    }
  } catch { $ctx.Response.StatusCode = 500 }
  $ctx.Response.Close()
}
