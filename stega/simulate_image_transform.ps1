param(
  [Parameter(Mandatory=$true)][string]$InputBmp,
  [Parameter(Mandatory=$true)][string]$OutputBmp,
  [Parameter(Mandatory=$true)][double]$Scale,
  [Parameter(Mandatory=$true)][int]$Quality,
  [double]$Crop = 0
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$source = [System.Drawing.Image]::FromFile($InputBmp)
$cropX = [Math]::Round($source.Width * $Crop)
$cropY = [Math]::Round($source.Height * $Crop)
$sourceWidth = $source.Width - 2 * $cropX
$sourceHeight = $source.Height - 2 * $cropY
$width = [Math]::Max(8, [Math]::Round($sourceWidth * $Scale))
$height = [Math]::Max(8, [Math]::Round($sourceHeight * $Scale))
$resized = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$graphics = [System.Drawing.Graphics]::FromImage($resized)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$destination = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
$sourceRectangle = New-Object System.Drawing.Rectangle($cropX, $cropY, $sourceWidth, $sourceHeight)
$graphics.DrawImage($source, $destination, $sourceRectangle, [System.Drawing.GraphicsUnit]::Pixel)
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
