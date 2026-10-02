package com.inkwhack.pnutplayer.media

import android.content.ComponentName
import android.content.Context
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import com.google.common.util.concurrent.ListenableFuture

object MediaControllerManager {
    fun connect(context: Context): ListenableFuture<MediaController> = MediaController.Builder(
        context, SessionToken(context, ComponentName(context, PnutMediaLibraryService::class.java))).buildAsync()
}
