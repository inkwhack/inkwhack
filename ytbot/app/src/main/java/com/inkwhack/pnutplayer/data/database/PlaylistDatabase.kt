package com.inkwhack.pnutplayer.data.database

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "playlists") data class PlaylistEntity(@PrimaryKey(autoGenerate = true) val id: Long = 0, val name: String, val createdAt: Long = System.currentTimeMillis())
@Entity(tableName = "playlist_songs", primaryKeys = ["playlistId", "songId"]) data class PlaylistSongEntity(val playlistId: Long, val songId: Long, val position: Int)
@Dao interface PlaylistDao {
    @Query("SELECT * FROM playlists ORDER BY name") fun playlists(): Flow<List<PlaylistEntity>>
    @Insert suspend fun insert(playlist: PlaylistEntity): Long
    @Query("UPDATE playlists SET name = :name WHERE id = :id") suspend fun rename(id: Long, name: String)
    @Query("DELETE FROM playlists WHERE id = :id") suspend fun delete(id: Long)
    @Insert(onConflict = OnConflictStrategy.REPLACE) suspend fun addSong(song: PlaylistSongEntity)
    @Query("DELETE FROM playlist_songs WHERE playlistId = :playlistId AND songId = :songId") suspend fun removeSong(playlistId: Long, songId: Long)
}
@Database(entities = [PlaylistEntity::class, PlaylistSongEntity::class], version = 1, exportSchema = false) abstract class PlaylistDatabase : RoomDatabase() { abstract fun playlists(): PlaylistDao }
