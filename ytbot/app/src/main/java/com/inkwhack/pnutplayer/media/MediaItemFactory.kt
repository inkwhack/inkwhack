package com.inkwhack.pnutplayer.media

import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import com.inkwhack.pnutplayer.model.Song

object MediaItemFactory {
    const val ROOT = "pnut-root"
    const val RECENT = "recent"
    const val SONGS = "songs"
    const val ARTISTS = "artists"
    const val ALBUMS = "albums"
    const val FOLDERS = "folders"
    const val PLAYLISTS = "playlists"

    fun folder(id: String, title: String) = MediaItem.Builder().setMediaId(id).setMediaMetadata(
        MediaMetadata.Builder().setTitle(title).setIsBrowsable(true).setIsPlayable(false).build()).build()

    fun song(song: Song) = MediaItem.Builder().setMediaId("song/${song.id}").setUri(song.uri).setMediaMetadata(
        MediaMetadata.Builder().setTitle(song.title).setArtist(song.artist).setAlbumTitle(song.album)
            .setArtworkUri(song.artworkUri).setTrackNumber(song.trackNumber).setDurationMs(song.duration)
            .setIsPlayable(true).setIsBrowsable(false).build()).build()
}
