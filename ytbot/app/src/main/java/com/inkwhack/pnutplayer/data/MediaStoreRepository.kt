package com.inkwhack.pnutplayer.data

import android.content.ContentResolver
import android.content.Context
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import com.inkwhack.pnutplayer.model.Song
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class MediaStoreRepository(private val context: Context) {
    suspend fun scan(): List<Song> = withContext(Dispatchers.IO) {
        val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
        else MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
        val projection = arrayOf(MediaStore.Audio.Media._ID, MediaStore.Audio.Media.TITLE, MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM, MediaStore.Audio.Media.DURATION, MediaStore.Audio.Media.DATE_ADDED,
            MediaStore.Audio.Media.TRACK, MediaStore.Audio.Media.ALBUM_ID, MediaStore.Audio.Media.RELATIVE_PATH,
            MediaStore.Audio.Media.DISPLAY_NAME)
        val selection = "${MediaStore.Audio.Media.IS_MUSIC} != 0 AND ${MediaStore.Audio.Media.DURATION} > 0"
        val songs = mutableListOf<Song>()
        context.contentResolver.query(collection, projection, selection, null, "${MediaStore.Audio.Media.DATE_ADDED} DESC")?.use { cursor ->
            val id = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID); val title = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
            val artist = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST); val album = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
            val duration = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION); val added = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED)
            val track = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TRACK); val albumId = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
            val relative = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.RELATIVE_PATH); val display = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)
            while (cursor.moveToNext()) {
                val mediaId = cursor.getLong(id); val rawTitle = cursor.getString(title).orEmpty()
                val fallback = cursor.getString(display).orEmpty().substringBeforeLast('.', cursor.getString(display).orEmpty())
                val albumArt = Uri.parse("content://media/external/audio/albumart/${cursor.getLong(albumId)}")
                songs += Song(mediaId, rawTitle.takeUnless { it.isBlank() || it == "<unknown>" } ?: fallback,
                    cursor.getString(artist).orEmpty().takeUnless { it == "<unknown>" } ?: "Unknown artist",
                    cursor.getString(album).orEmpty().takeUnless { it == "<unknown>" } ?: "Unknown album",
                    cursor.getLong(duration), Uri.withAppendedPath(collection, mediaId.toString()), albumArt,
                    cursor.getLong(added) * 1000L, cursor.getInt(track) % 1000, cursor.getString(relative).orEmpty().trimEnd('/').ifBlank { "Music" })
            }
        }
        songs
    }
}
