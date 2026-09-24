param(
  [Parameter(Mandatory=$true)][string]$InputBmp,
  [Parameter(Mandatory=$true)][string]$OutputBmp,
  [Parameter(Mandatory=$true)][double]$Scale,
  [Parameter(Mandatory=$true)][int]$Quality
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$source = [System.Drawing.Image]::FromFile($InputBmp)
$width = [Math]::Max(8, [Math]::Round($source.Width * $Scale))
$height = [Math]::Max(8, [Math]::Round($source.Height * $Scale))
$resized = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$graphics = [System.Drawing.Graphics]::FromImage($resized)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.DrawImage($source, 0, 0, $width, $height)
$graphics.Dispose()
$source.Dispose()
$jpegPath = [System.IO.Path]::ChangeExtension($OutputBmp, '.jpg')
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$parameters = New-Object System.Drawing.Imaging.EncoderParameters(1)
$parameters.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
$resized.Save($jpegPath, $codec, $parameters)
$resized.Dispose()
$jpeg = [System.Drawing.Image]::FromFile($jpegPath)
$decoded = New-Object System.Drawing.Bitmap($jpeg.Width, $jpeg.Height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$graphics2 = [System.Drawing.Graphics]::FromImage($decoded)
$graphics2.DrawImage($jpeg, 0, 0, $jpeg.Width, $jpeg.Height)
$graphics2.Dispose()
$jpeg.Dispose()
$decoded.Save($OutputBmp, [System.Drawing.Imaging.ImageFormat]::Bmp)
$decoded.Dispose()
Remove-Item -LiteralPath $jpegPath
