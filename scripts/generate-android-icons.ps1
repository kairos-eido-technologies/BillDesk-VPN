param(
    [string]$SourceImage = "$PSScriptRoot\..\public\mss-logo.png",
    [string]$TargetDir = "$PSScriptRoot\..\android\app\src\main\res"
)

Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile((Resolve-Path $SourceImage).Path)

$sizes = @{
    "mipmap-mdpi" = 48
    "mipmap-hdpi" = 72
    "mipmap-xhdpi" = 96
    "mipmap-xxhdpi" = 144
    "mipmap-xxxhdpi" = 192
}

foreach ($folder in $sizes.Keys) {
    $size = $sizes[$folder]
    $destFolder = Join-Path $TargetDir $folder
    if (!(Test-Path $destFolder)) {
        New-Item -ItemType Directory -Path $destFolder -Force | Out-Null
    }

    # Standard Square Icon
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::White)
    $g.DrawImage($src, 0, 0, $size, $size)
    $g.Dispose()

    $destPath = Join-Path $destFolder "ic_launcher.png"
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    # Round Icon (Circular clip)
    $roundBmp = New-Object System.Drawing.Bitmap $size, $size
    $rg = [System.Drawing.Graphics]::FromImage($roundBmp)
    $rg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $rg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $rg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $rg.Clear([System.Drawing.Color]::Transparent)

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $size, $size)
    $rg.SetClip($path)
    $rg.Clear([System.Drawing.Color]::White)
    $rg.DrawImage($src, 0, 0, $size, $size)
    $path.Dispose()
    $rg.Dispose()

    $roundDestPath = Join-Path $destFolder "ic_launcher_round.png"
    $roundBmp.Save($roundDestPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $roundBmp.Dispose()

    Write-Host "Generated $folder icons ($($size)x$($size))"
}

$src.Dispose()
Write-Host "All Android icons generated successfully!"

