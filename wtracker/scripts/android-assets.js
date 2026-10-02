import {mkdir,copyFile} from 'node:fs/promises';
const dest='android/app/src/main/assets';await mkdir(dest,{recursive:true});
for(const file of ['index.html','app.js','core.js','style.css','icon.svg','icon-192.png','icon-512.png','manifest.webmanifest','sw.js'])await copyFile(file,`${dest}/${file}`);
console.log('Offline Android assets prepared.');
