package com.inkwhack.pnutplayer.media

import androidx.media3.common.MediaItem
import androidx.media3.session.LibraryResult
import androidx.media3.session.MediaLibraryService
import androidx.media3.session.MediaLibraryService.MediaLibrarySession
import androidx.media3.session.MediaSession
import com.google.common.collect.ImmutableList
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
import com.inkwhack.pnutplayer.data.LibraryStore

class PnutLibraryCallback : MediaLibrarySession.Callback {
    override fun onGetLibraryRoot(session: MediaLibrarySession, browser: MediaSession.ControllerInfo, params: MediaLibraryService.LibraryParams?): ListenableFuture<LibraryResult<MediaItem>> =
        Futures.immediateFuture(LibraryResult.ofItem(MediaItemFactory.folder(MediaItemFactory.ROOT, "PNUT"), params))

    override fun onGetChildren(session: MediaLibrarySession, browser: MediaSession.ControllerInfo, parentId: String, page: Int, pageSize: Int, params: MediaLibraryService.LibraryParams?): ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> {
        val all = LibraryStore.songs.value
        val children = when {
            parentId == MediaItemFactory.ROOT -> listOf(
                MediaItemFactory.folder(MediaItemFactory.RECENT, "Recently Added"), MediaItemFactory.folder(MediaItemFactory.SONGS, "Songs"),
                MediaItemFactory.folder(MediaItemFactory.ARTISTS, "Artists"), MediaItemFactory.folder(MediaItemFactory.ALBUMS, "Albums"),
                MediaItemFactory.folder(MediaItemFactory.FOLDERS, "Folders"), MediaItemFactory.folder(MediaItemFactory.PLAYLISTS, "Playlists"))
            parentId == MediaItemFactory.RECENT || parentId == MediaItemFactory.SONGS -> all.sortedByDescending { if (parentId == MediaItemFactory.RECENT) it.dateAdded else 0L }.map(MediaItemFactory::song)
            parentId == MediaItemFactory.ARTISTS -> LibraryStore.artists().map { (name, _) -> MediaItemFactory.folder("artist/$name", name) }
            parentId == MediaItemFactory.ALBUMS -> LibraryStore.albums().map { (key, tracks) -> MediaItemFactory.folder("album/$key", tracks.first().album) }
            parentId == MediaItemFactory.FOLDERS -> LibraryStore.folders().map { (name, _) -> MediaItemFactory.folder("folder/$name", name) }
            parentId.startsWith("artist/") -> LibraryStore.artists()[parentId.removePrefix("artist/")].orEmpty().map(MediaItemFactory::song)
            parentId.startsWith("album/") -> LibraryStore.albums()[parentId.removePrefix("album/")].orEmpty().map(MediaItemFactory::song)
            parentId.startsWith("folder/") -> LibraryStore.folders()[parentId.removePrefix("folder/")].orEmpty().map(MediaItemFactory::song)
            else -> emptyList()
        }
        val start = (page * pageSize).coerceAtMost(children.size); val end = (start + pageSize).coerceAtMost(children.size)
        return Futures.immediateFuture(LibraryResult.ofItemList(ImmutableList.copyOf(children.subList(start, end)), params))
    }

    override fun onGetItem(session: MediaLibrarySession, browser: MediaSession.ControllerInfo, mediaId: String): ListenableFuture<LibraryResult<MediaItem>> {
        val item = LibraryStore.byId(mediaId)?.let(MediaItemFactory::song)
        return Futures.immediateFuture(if (item == null) LibraryResult.ofError(LibraryResult.RESULT_ERROR_BAD_VALUE) else LibraryResult.ofItem(item, null))
    }

    override fun onSearch(session: MediaLibrarySession, browser: MediaSession.ControllerInfo, query: String, params: MediaLibraryService.LibraryParams?): ListenableFuture<LibraryResult<Void>> =
        Futures.immediateFuture(LibraryResult.ofVoid())

    override fun onGetSearchResult(session: MediaLibrarySession, browser: MediaSession.ControllerInfo, query: String, page: Int, pageSize: Int, params: MediaLibraryService.LibraryParams?): ListenableFuture<LibraryResult<ImmutableList<MediaItem>>> {
        val result = LibraryStore.songs.value.filter { it.title.contains(query, true) || it.artist.contains(query, true) || it.album.contains(query, true) }.map(MediaItemFactory::song)
        return Futures.immediateFuture(LibraryResult.ofItemList(ImmutableList.copyOf(result.drop(page * pageSize).take(pageSize)), params))
    }
}
