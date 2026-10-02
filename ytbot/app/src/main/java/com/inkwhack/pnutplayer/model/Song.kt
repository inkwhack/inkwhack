package com.inkwhack.pnutplayer.model

import android.net.Uri

data class Song(
    val id: Long,
    val title: String,
    val artist: String,
    val album: String,
    val duration: Long,
    val uri: Uri,
    val artworkUri: Uri?,
    val dateAdded: Long,
    val trackNumber: Int,
    val folder: String
)

data class Album(val key: String, val title: String, val artist: String, val artworkUri: Uri?, val songs: List<Song>)
data class Artist(val name: String, val songs: List<Song>)
