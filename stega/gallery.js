const galleryRoot = document.getElementById('pictureGallery');
let galleryRequest = 0;
const galleryEntries = globalThis.STEGA_GALLERY || [];
for (const picture of galleryEntries) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'gallery-picture';
  button.dataset.galleryId = picture.id;
  button.setAttribute('aria-pressed', 'false');
  const img = document.createElement('img');
  img.src = picture.thumbnail;
  img.alt = '';
  img.loading = 'lazy';
  img.width = 160;
  img.height = 160;
  const caption = document.createElement('span');
  caption.textContent = picture.title;
  button.append(img, caption);
  button.addEventListener('click', () => chooseGalleryPicture(picture, button));
  galleryRoot.append(button);
}
async function chooseGalleryPicture(picture, button) {
  const request = ++galleryRequest;
  selectedGalleryId = null;
  selectedCoverFile = null;
  $('makeSecretImage').disabled = true;
  $('makeSecretImage').textContent = 'Loading picture…';
  $('secretImageResult').classList.add('hidden');
  $('coverPreview').classList.add('hidden');
  status('galleryStatus', 'Loading ' + picture.title + '…');
  try {
    const response = await fetch(picture.src);
    if (!response.ok) throw new Error('Picture could not load. Please try again.');
    const blob = await response.blob();
    const file = new File([blob], picture.title + '.webp', {type: blob.type || 'image/webp'});
    await loadImageFile(file);
    if (request !== galleryRequest) return;
    selectedGalleryId = picture.id;
    selectedCoverFile = file;
    for (const item of galleryRoot.querySelectorAll('button')) item.setAttribute('aria-pressed', String(item === button));
    previewPickedImage(file, 'coverPreview', 'coverImageName');
    status('galleryStatus', picture.title + ' selected.', 'ok');
    $('coverImageName').textContent = 'Selected: ' + picture.title;
    await refreshCapacity();
  } catch (error) {
    if (request !== galleryRequest) return;
    $('makeSecretImage').textContent = 'Choose a picture first';
    status('galleryStatus', error.message, 'bad');
  }
}
// Prevent overlapping generation. The existing handler owns the actual action.
const originalGenerateSecretImage = generateSecretImage;
generateSecretImage = async function(...args) {
  const buttons = galleryRoot.querySelectorAll('button');
  $('makeSecretImage').disabled = true;
  for (const button of buttons) button.disabled = true;
  try { return await originalGenerateSecretImage(...args); }
  finally {
    $('makeSecretImage').disabled = !selectedGalleryId;
    for (const button of buttons) button.disabled = false;
  }
};
$('modeHelp').textContent = 'Photo-ready JPG · Repeated, error-corrected encoding in textured regions. No original PNG needed. Keep the full picture when sharing.';
document.querySelector('.modeintro').innerHTML = '<span class="modepill">30 gallery pictures</span><span class="modepill">Encrypted in your browser</span><span class="modepill">JPEG compression protection</span>';
