@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package com.inkwhack.pnutplayer

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import com.inkwhack.pnutplayer.model.Song
import com.inkwhack.pnutplayer.ui.PnutViewModel

class MainActivity : ComponentActivity() {
    private val vm: PnutViewModel by viewModels()
    private val permission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { if (it) vm.refresh() }
    override fun onCreate(savedInstanceState: Bundle?) { super.onCreate(savedInstanceState)
        setContent { PnutTheme { val allowed = hasMusicPermission(); if (allowed) LaunchedEffect(Unit) { vm.refresh() }; PnutApp(vm, allowed) } }
    }
    private fun hasMusicPermission() = ContextCompat.checkSelfPermission(this, if (Build.VERSION.SDK_INT >= 33) Manifest.permission.READ_MEDIA_AUDIO else Manifest.permission.READ_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED
    fun requestMusicPermission() = permission.launch(if (Build.VERSION.SDK_INT >= 33) Manifest.permission.READ_MEDIA_AUDIO else Manifest.permission.READ_EXTERNAL_STORAGE)
}

@Composable private fun PnutTheme(content: @Composable () -> Unit) { MaterialTheme(colorScheme = darkColorScheme(primary = Color(0xFFFF6B35), secondary = Color(0xFFFFB59E), surface = Color(0xFF17181C), background = Color(0xFF101114)), content = content) }

@Composable fun PnutApp(vm: PnutViewModel, allowed: Boolean) {
    var tab by rememberSaveable { mutableStateOf("HOME") }; var nowPlaying by rememberSaveable { mutableStateOf(false) }
    val songs by vm.songs.collectAsStateWithLifecycle()
    val context = LocalContext.current
    if (!allowed) { PermissionScreen { (context as MainActivity).requestMusicPermission() }; return }
    if (nowPlaying) { NowPlaying(vm) { nowPlaying = false }; return }
    Scaffold(bottomBar = { Column { MiniPlayer(vm) { nowPlaying = true }; NavigationBar { listOf("HOME" to Icons.Default.Home, "SONGS" to Icons.Default.MusicNote, "ARTISTS" to Icons.Default.Person, "ALBUMS" to Icons.Default.Album, "PLAYLISTS" to Icons.Default.QueueMusic, "FOLDERS" to Icons.Default.Folder).forEach { (name, icon) -> NavigationBarItem(selected = tab == name, onClick = { tab = name }, icon = { Icon(icon, name) }, label = { Text(name) }) } } } }) { padding ->
        when (tab) { "HOME" -> Home(songs, vm, Modifier.padding(padding)); "SONGS" -> SongList("Songs", songs, songs, vm, Modifier.padding(padding)); "ARTISTS" -> GroupList("Artists", songs.groupBy { it.artist }, vm, Modifier.padding(padding)); "ALBUMS" -> GroupList("Albums", songs.groupBy { it.album }, vm, Modifier.padding(padding)); "FOLDERS" -> GroupList("Folders", songs.groupBy { it.folder }, vm, Modifier.padding(padding)); else -> EmptyPlaylists(Modifier.padding(padding)) }
    }
}

@Composable private fun PermissionScreen(onAllow: () -> Unit) = Surface(Modifier.fillMaxSize()) { Column(Modifier.padding(32.dp), verticalArrangement = Arrangement.Center) { Text("PNUT Player", style = MaterialTheme.typography.displaySmall); Spacer(Modifier.height(12.dp)); Text("Play your music on your phone and in your car.", style = MaterialTheme.typography.titleMedium); Spacer(Modifier.height(28.dp)); Button(onClick = onAllow) { Text("Allow Music Access") }; Spacer(Modifier.height(12.dp)); Text("PNUT only asks for audio access so it can find and play music stored on this phone.", style = MaterialTheme.typography.bodySmall) } }
@Composable private fun Home(songs: List<Song>, vm: PnutViewModel, modifier: Modifier) { Column(modifier.fillMaxSize()) { TopAppBar(title = { Text("PNUT") }, actions = { IconButton(onClick = vm::refresh) { Icon(Icons.Default.Refresh, "Refresh library") } }); if (songs.isEmpty()) EmptyLibrary(vm) else SongList("Recently Added", songs.sortedByDescending { it.dateAdded }, songs, vm, Modifier) } }
@Composable private fun EmptyLibrary(vm: PnutViewModel) = Column(Modifier.fillMaxSize().padding(32.dp), verticalArrangement = Arrangement.Center) { Text("No music found.", style = MaterialTheme.typography.headlineSmall); Spacer(Modifier.height(8.dp)); Text("Add audio files to your phone, then refresh PNUT."); Spacer(Modifier.height(16.dp)); Button(onClick = vm::refresh) { Text("Refresh Library") } }
@Composable private fun SongList(title: String, display: List<Song>, queue: List<Song>, vm: PnutViewModel, modifier: Modifier) { var query by remember { mutableStateOf("") }; val shown = display.filter { it.title.contains(query, true) || it.artist.contains(query, true) || it.album.contains(query, true) }; Column(modifier.fillMaxSize()) { TopAppBar(title = { Text(title) }); OutlinedTextField(value = query, onValueChange = { query = it }, modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp), placeholder = { Text("Search songs, artists, albums") }, leadingIcon = { Icon(Icons.Default.Search, null) }); LazyColumn(contentPadding = PaddingValues(12.dp)) { items(shown, key = { it.id }) { SongRow(it) { vm.play(queue, it) } } } } }
@Composable private fun SongRow(song: Song, click: () -> Unit) = ListItem(modifier = Modifier.clickable(onClick = click), leadingContent = { AsyncImage(song.artworkUri, null, Modifier.size(52.dp), placeholder = androidx.compose.ui.res.painterResource(android.R.drawable.ic_media_play)) }, headlineContent = { Text(song.title, maxLines = 1, overflow = TextOverflow.Ellipsis) }, supportingContent = { Text("${song.artist} · ${song.album}", maxLines = 1, overflow = TextOverflow.Ellipsis) })
@Composable private fun GroupList(title: String, groups: Map<String, List<Song>>, vm: PnutViewModel, modifier: Modifier) { var opened by remember { mutableStateOf<Pair<String, List<Song>>?>(null) }; opened?.let { (name, tracks) -> SongList(name, tracks, tracks, vm, modifier) } ?: Column(modifier.fillMaxSize()) { TopAppBar(title = { Text(title) }); LazyColumn { items(groups.toList(), key = { it.first }) { (name, tracks) -> ListItem(modifier = Modifier.clickable { opened = name to tracks }, headlineContent = { Text(name) }, supportingContent = { Text("${tracks.size} songs") }, trailingContent = { Icon(Icons.Default.ChevronRight, null) }) } } } }
@Composable private fun EmptyPlaylists(modifier: Modifier) = Column(modifier.fillMaxSize().padding(32.dp), verticalArrangement = Arrangement.Center) { Text("Playlists", style = MaterialTheme.typography.headlineMedium); Spacer(Modifier.height(8.dp)); Text("Create and manage local PNUT playlists here.") }
@Composable private fun MiniPlayer(vm: PnutViewModel, open: () -> Unit) { val controller by vm.controller.collectAsStateWithLifecycle(); val item = controller?.currentMediaItem ?: return; Surface(tonalElevation = 5.dp, modifier = Modifier.fillMaxWidth().clickable(onClick = open)) { Row(Modifier.padding(8.dp), verticalAlignment = Alignment.CenterVertically) { AsyncImage(item.mediaMetadata.artworkUri, null, Modifier.size(44.dp)); Column(Modifier.weight(1f).padding(horizontal = 10.dp)) { Text(item.mediaMetadata.title?.toString() ?: "PNUT", maxLines = 1); Text(item.mediaMetadata.artist?.toString() ?: "", style = MaterialTheme.typography.bodySmall, maxLines = 1) }; IconButton(onClick = vm::playPause) { Icon(if (controller?.isPlaying == true) Icons.Default.Pause else Icons.Default.PlayArrow, "Play/Pause") }; IconButton(onClick = vm::next) { Icon(Icons.Default.SkipNext, "Next") } } } }
@Composable private fun NowPlaying(vm: PnutViewModel, back: () -> Unit) { val controller by vm.controller.collectAsStateWithLifecycle(); val item = controller?.currentMediaItem; Scaffold(topBar = { TopAppBar(title = { Text("Now Playing") }, navigationIcon = { IconButton(back) { Icon(Icons.Default.ArrowBack, "Back") } }) }) { padding -> Column(Modifier.padding(padding).fillMaxSize().padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally) { AsyncImage(item?.mediaMetadata?.artworkUri, null, Modifier.fillMaxWidth().aspectRatio(1f).background(MaterialTheme.colorScheme.surfaceVariant)); Spacer(Modifier.height(24.dp)); Text(item?.mediaMetadata?.title?.toString() ?: "Nothing playing", style = MaterialTheme.typography.headlineSmall); Text(item?.mediaMetadata?.artist?.toString() ?: ""); Text(item?.mediaMetadata?.albumTitle?.toString() ?: "", style = MaterialTheme.typography.bodySmall); Spacer(Modifier.weight(1f)); Slider(value = 0f, onValueChange = {}, enabled = false); Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) { IconButton(vm::previous) { Icon(Icons.Default.SkipPrevious, "Previous", Modifier.size(42.dp)) }; FilledIconButton(vm::playPause, Modifier.size(68.dp)) { Icon(if (controller?.isPlaying == true) Icons.Default.Pause else Icons.Default.PlayArrow, "Play/Pause", Modifier.size(42.dp)) }; IconButton(vm::next) { Icon(Icons.Default.SkipNext, "Next", Modifier.size(42.dp)) } } } } }
