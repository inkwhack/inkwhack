# PNUT Player

PNUT Player is a native Kotlin/Jetpack Compose music player for audio already on an Android device. It never downloads YouTube content. One Media3 `MediaLibrarySession` is shared by the phone UI, notification, lock screen, Bluetooth controls, and Android Auto.

## Features included

- MediaStore discovery for device music (MP3, M4A/AAC, FLAC, OGG and WAV when supported by Android)
- Recently added, songs, artists, albums and folders indexes
- One ExoPlayer-based background playback service with system audio-focus/noisy-headset handling
- MediaLibraryService hierarchy for Android Auto: Recently Added, Songs, Artists, Albums, Folders and Playlists
- Searchable song/artist/album library, collection queues, notification/lock-screen controls, and Compose phone UI
- Permission model limited to audio-library access (Android 13+: `READ_MEDIA_AUDIO`; Android 12 and below: `READ_EXTERNAL_STORAGE`)

## Build

Open the project in current Android Studio (JDK 17, Android SDK Platform 35) and run:

```powershell
.\gradlew.bat assembleDebug
```

The expected APK is `app\build\outputs\apk\debug\app-debug.apk`.

## Android Auto DHU verification

1. Build the debug APK using the command above.
2. Connect a device with USB debugging enabled and install it:
   ```powershell
   adb install -r app\build\outputs\apk\debug\app-debug.apk
   ```
3. Open Android Auto on the phone, tap the version string repeatedly to enable developer options, then use its developer settings to allow unknown/development media apps if that option is shown.
4. Put at least one MP3 in the device Music or Downloads collection. Launch PNUT Player, allow music access, and tap **Refresh Library**.
5. Start Android Auto Desktop Head Unit from the Android SDK (`extras/google/auto/desktop-head-unit.exe` on a typical Windows SDK installation) with the phone connected according to the Android Auto DHU documentation.
6. In DHU, open the media app selector. **PNUT Player** should appear. Confirm the root contains Recently Added, Songs, Artists, Albums, Folders, and Playlists.
7. Select a song. Verify title, artist, album artwork, elapsed position, seek (where DHU enables it), and previous/play-pause/next.
8. Lock the phone and use Bluetooth or DHU controls to verify playback continues and controls stay synchronized.

## Test checklist

- Scan a library containing each supported audio type, missing metadata, and embedded art.
- Refresh after copying a new MP3; it appears at the top of Recently Added.
- Play from each collection and verify a queue is built from that collection.
- Verify pause/resume, seek, previous/next, repeat/shuffle, notification, Bluetooth and process restart behavior.
- Verify Android Auto browsing and `MediaLibraryService` search for title, artist, and album strings.
