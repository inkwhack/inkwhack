package com.inkwhack.pnutplayer.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import com.inkwhack.pnutplayer.data.LibraryStore
import com.inkwhack.pnutplayer.media.MediaControllerManager
import com.inkwhack.pnutplayer.media.MediaItemFactory
import com.inkwhack.pnutplayer.model.Song
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class PnutViewModel(application: Application) : AndroidViewModel(application) {
    val songs = LibraryStore.songs
    private val _controller = MutableStateFlow<MediaController?>(null)
    val controller = _controller.asStateFlow()
    private val _playing = MutableStateFlow<MediaItem?>(null)
    val playing = _playing.asStateFlow()
    init {
        val future = MediaControllerManager.connect(application)
        future.addListener({ _controller.value = future.get() }, application.mainExecutor)
    }
    fun refresh() = viewModelScope.launch { LibraryStore.refresh(getApplication()) }
    fun play(songs: List<Song>, selected: Song) {
        val items = songs.map(MediaItemFactory::song); val index = songs.indexOfFirst { it.id == selected.id }.coerceAtLeast(0)
        _controller.value?.apply { setMediaItems(items, index, 0); prepare(); play() }
    }
    fun playPause() { _controller.value?.let { if (it.isPlaying) it.pause() else it.play() } }
    fun next() { _controller.value?.seekToNextMediaItem() }; fun previous() { _controller.value?.seekToPreviousMediaItem() }
    override fun onCleared() { _controller.value?.release(); super.onCleared() }
}
