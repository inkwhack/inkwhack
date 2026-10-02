package com.inkwhack.pnutplayer.media

import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaLibraryService
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaLibraryService.MediaLibrarySession
import com.inkwhack.pnutplayer.data.LibraryStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class PnutMediaLibraryService : MediaLibraryService() {
    private lateinit var player: ExoPlayer
    private var librarySession: MediaLibrarySession? = null
    private val serviceScope = CoroutineScope(Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        player = ExoPlayer.Builder(this).build().apply {
            setAudioAttributes(AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(), true)
            setHandleAudioBecomingNoisy(true)
            repeatMode = Player.REPEAT_MODE_OFF
        }
        librarySession = MediaLibrarySession.Builder(this, player, PnutLibraryCallback()).build()
        serviceScope.launch { runCatching { LibraryStore.refresh(this@PnutMediaLibraryService) } }
    }
    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaLibrarySession? = librarySession
    override fun onTaskRemoved(rootIntent: android.content.Intent?) { if (!player.playWhenReady) stopSelf() }
    override fun onDestroy() { librarySession?.run { player.release(); release() }; librarySession = null; super.onDestroy() }
}
