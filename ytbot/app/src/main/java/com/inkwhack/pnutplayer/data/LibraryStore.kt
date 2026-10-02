package com.inkwhack.pnutplayer.data

import android.content.Context
import com.inkwhack.pnutplayer.model.Song
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/** In-memory MediaStore index. Media files remain owned by Android's MediaStore. */
object LibraryStore {
    private val _songs = MutableStateFlow<List<Song>>(emptyList())
    val songs: StateFlow<List<Song>> = _songs
    suspend fun refresh(context: Context): List<Song> = MediaStoreRepository(context).scan().also { _songs.value = it }
    fun byId(id: String) = _songs.value.firstOrNull { it.id.toString() == id.removePrefix("song/") }
    fun folders() = _songs.value.groupBy { it.folder }.toSortedMap()
    fun artists() = _songs.value.groupBy { it.artist }.toSortedMap()
    fun albums() = _songs.value.groupBy { "${it.album}\u0000${it.artist}" }.toSortedMap()
}
