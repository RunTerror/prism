package dev.prism.hostdemo

// Chat tab: the same as the iOS demo's (ChatTab.swift). Talks to the Prism dev server (server/)
// and shows the reply as it streams:
//
//   you send -> POST /chat -> server events, one by one:
//     status          "Searching the web…" while the model works before writing
//     text            add to the message as it arrives
//     block_start     show the loading card
//     block_progress  grow the loading card: the title and the parts written so far
//     block_partial   the screen so far: replaces the card, then grows (the same widget, updated)
//     block           the finished screen
//     done/error      stop
//
// The emulator reaches the Mac as 10.0.2.2. Plain http is allowed for this demo only (manifest).

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.prism.android.PrismEffect
import dev.prism.android.PrismSnapshot
import dev.prism.android.PrismVersions
import dev.prism.android.PrismWidget
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

const val CHAT_SERVER = "http://10.0.2.2:8787"

/** What the server tells us about a screen while the model is still writing it. */
data class BlockProgress(val title: String? = null, val shape: List<String> = emptyList())

sealed interface Piece {
    data class Words(val text: String) : Piece
    data class Building(val id: String, val progress: BlockProgress) : Piece
    data class Screen(val id: String, val envelopeJson: String) : Piece
}

data class ChatMessage(val id: String, val fromUser: Boolean, val pieces: List<Piece> = emptyList(), val status: String? = null)

/** A reply a model wrote earlier, kept on the server (core/test/ai-replies), with a one-line description. */
data class SavedReply(val id: String, val title: String)

enum class ChatMode(val label: String) { Replay("Replay"), Claude("Claude") }

/** Lives as long as the app, so the chat stays when you switch tabs. */
object ChatModel {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    var messages by mutableStateOf(listOf<ChatMessage>())
    var mode by mutableStateOf(ChatMode.Replay)
    var busy by mutableStateOf(false)
    var replies by mutableStateOf(listOf<SavedReply>())
    /** The saved reply Play sends next; after it plays, the next one in the list is picked. */
    var picked by mutableStateOf<SavedReply?>(null)
    /** Each screen's latest snapshot, so a screen scrolled away comes back as the user left it. */
    val snapshots = mutableMapOf<String, PrismSnapshot>()
    private var job: Job? = null
    private var count = 0
    /** Same id for every message in this chat, so the model remembers earlier ones. */
    private var conversation = UUID.randomUUID().toString()

    /** Claude mode: sends [text]. Replay mode: plays [reply], or the picked one. */
    fun send(text: String, reply: SavedReply? = null) {
        if (busy) return
        var replay: SavedReply? = null
        if (mode == ChatMode.Replay) {
            replay = reply ?: picked ?: return
            // A tapped card shows in the box; Play moves on to the next one (to walk through the list).
            val i = replies.indexOf(replay)
            if (reply != null) picked = replay
            else if (i >= 0) picked = replies[(i + 1) % replies.size]
        }
        count++
        val replyId = "chat$count"
        val question = replay?.title ?: text
        messages = messages + ChatMessage("user$count", true, listOf(Piece.Words(question))) +
            ChatMessage(replyId, false, status = "Thinking…")
        busy = true
        job = scope.launch { stream(question, replay?.id, replyId) }
    }

    fun stop() { job?.cancel() }

    fun newChat() {
        job?.cancel()
        messages = emptyList()
        snapshots.clear()
        conversation = UUID.randomUUID().toString()
    }

    /** A screen asked something (P.ask): it becomes the user's next message. */
    fun handle(context: android.content.Context, effect: PrismEffect) {
        if (effect is PrismEffect.Ask) {
            if (mode == ChatMode.Replay) mode = ChatMode.Claude
            send(effect.text)
        } else {
            Demo.handleEffect(context, effect)
        }
    }

    /** The saved replies from the server, with their descriptions (GET /replies?titles=1). */
    suspend fun loadReplies() {
        if (replies.isNotEmpty()) return
        val list = withContext(Dispatchers.IO) {
            runCatching {
                val arr = JSONArray(URL("$CHAT_SERVER/replies?titles=1").readText())
                List(arr.length()) { i -> arr.getJSONObject(i).let { SavedReply(it.getString("id"), it.optString("title", it.getString("id"))) } }
            }.getOrDefault(emptyList())
        }
        replies = list
        if (picked == null) picked = list.firstOrNull()
    }

    private suspend fun stream(text: String, replay: String?, replyId: String) {
        val started = System.currentTimeMillis()
        val body = JSONObject()
            .put("message", text)
            .put("mode", if (mode == ChatMode.Claude) "claude" else "replay")
            .put("conversation", conversation)
            // What this SDK draws, so the AI only uses parts it can show (VERSIONS.md).
            .put("app", JSONObject().put("blocks", PrismVersions.BLOCKS).put("library", PrismVersions.LIBRARY))
        if (replay != null) body.put("replay", replay)
        val conn = URL("$CHAT_SERVER/chat").openConnection() as HttpURLConnection
        // Stop closes the connection, which ends the blocking read below.
        job?.invokeOnCompletion { conn.disconnect() }
        try {
            withContext(Dispatchers.IO) {
                conn.requestMethod = "POST"
                conn.doOutput = true
                conn.readTimeout = 180_000 // web searches can be quiet for a while
                conn.setRequestProperty("Content-Type", "application/json")
                conn.outputStream.use { it.write(body.toString().toByteArray()) }
                var event = ""
                // Server-Sent Events: "event: name" then "data: {json}". Each event has one data line.
                conn.inputStream.bufferedReader().useLines { lines ->
                    for (line in lines) {
                        if (line.startsWith("event: ")) event = line.removePrefix("event: ")
                        else if (line.startsWith("data: ")) {
                            val json = runCatching { JSONObject(line.removePrefix("data: ")) }.getOrNull() ?: continue
                            val name = event
                            withContext(Dispatchers.Main) { handle(name, json, replyId, started) }
                        }
                    }
                }
            }
        } catch (e: Exception) {
            update(replyId) {
                it.copy(status = if (job?.isCancelled == true) "Stopped"
                else "Can't reach the server at $CHAT_SERVER. Is `node server/server.mjs` running?")
            }
        } finally {
            busy = false
        }
    }

    private fun handle(event: String, json: JSONObject, replyId: String, started: Long) {
        when (event) {
            "text" -> update(replyId) { m ->
                val piece = json.optString("text")
                val last = m.pieces.lastOrNull()
                m.copy(status = null, pieces = if (last is Piece.Words) m.pieces.dropLast(1) + Piece.Words(last.text + piece)
                else m.pieces + Piece.Words(piece))
            }
            "status" -> update(replyId) { it.copy(status = json.optString("text", "Working…")) }
            "block_start" -> update(replyId) { it.copy(status = null, pieces = it.pieces + Piece.Building(json.optString("id", "block"), BlockProgress())) }
            "block_progress" -> {
                val id = json.optString("id", "block")
                val shape = json.optJSONArray("shape")?.let { a -> List(a.length()) { a.getString(it) } } ?: emptyList()
                val progress = BlockProgress(json.optString("title").ifEmpty { null }, shape)
                update(replyId) { m -> m.copy(pieces = m.pieces.map { if (it is Piece.Building && it.id == id) Piece.Building(id, progress) else it }) }
            }
            // block_partial: the screen so far; block: the finished screen. Both go into the same
            // widget, so the screen grows in place while the AI writes it.
            "block", "block_partial" -> {
                val id = json.optString("id", "block")
                val env = json.optJSONObject("envelope")?.toString() ?: return
                // Instance ids must be unique on screen, also across server restarts: add our reply id.
                val instance = "$replyId/$id"
                update(replyId) { m ->
                    val i = m.pieces.indexOfFirst { (it is Piece.Building && it.id == id) || (it is Piece.Screen && it.id == instance) }
                    m.copy(pieces = if (i == -1) m.pieces + Piece.Screen(instance, env)
                    else m.pieces.toMutableList().also { it[i] = Piece.Screen(instance, env) })
                }
            }
            "done" -> {
                val seconds = (System.currentTimeMillis() - started) / 1000.0
                val cost = json.optDouble("costUsd", 0.0).let { if (it > 0) " · $%.3f".format(it) else "" }
                update(replyId) { it.copy(status = "%.1f s".format(seconds) + cost) }
            }
            "error" -> update(replyId) { it.copy(status = "Error: " + json.optString("message", "unknown")) }
        }
    }

    private fun update(id: String, change: (ChatMessage) -> ChatMessage) {
        messages = messages.map { if (it.id == id) change(it) else it }
    }
}

// Starting points for Claude mode: each asks for something a screen answers well.
private val prompts = listOf(
    "How does HTTPS keep my password safe?",
    "Help me pick a laptop for video editing",
    "Book a table for 4 on Friday at 8",
    "Quiz me on Spanish travel phrases",
)

@Composable
fun ChatScreen(t: Tokens) {
    val model = ChatModel
    val list = rememberLazyListState()
    LaunchedEffect(Unit) { model.loadReplies() }
    // Follow the newest message while it streams.
    LaunchedEffect(model.messages.size, model.messages.lastOrNull()?.pieces?.size) {
        if (model.messages.isNotEmpty()) list.animateScrollToItem(model.messages.size - 1)
    }
    Column(Modifier.fillMaxSize().imePadding()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Segmented(ChatMode.entries.map { it.label }, model.mode.ordinal, t) { model.mode = ChatMode.entries[it] }
            Spacer(Modifier.weight(1f))
            Text("New chat", color = if (model.messages.isEmpty()) t.muted else t.text, fontSize = 15.sp,
                modifier = Modifier.clip14().border(1.dp, t.border, RoundedCornerShape(12.dp))
                    .clickable(enabled = model.messages.isNotEmpty()) { model.newChat() }
                    .padding(horizontal = 14.dp, vertical = 8.dp))
        }
        Box(Modifier.weight(1f)) {
            if (model.messages.isEmpty()) Welcome(model, t)
            else LazyColumn(state = list, modifier = Modifier.fillMaxSize(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(22.dp)) {
                items(model.messages, key = { it.id }) { MessageRow(it, t) }
            }
        }
        Composer(model, t)
    }
}

@Composable
private fun Welcome(model: ChatModel, t: Tokens) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Spacer(Modifier.height(28.dp))
        PrismMark(52.dp)
        Spacer(Modifier.height(6.dp))
        Text("Answers with screens", color = t.text, fontSize = 28.sp, fontWeight = FontWeight.Light)
        Text(if (model.mode == ChatMode.Replay) "Play a real AI answer saved earlier. No AI needed."
        else "Ask the AI for something a screen helps with.", color = t.muted, fontSize = 15.sp)
        Spacer(Modifier.height(8.dp))
        // The showcase answers first (the ones in the README videos), then the rest.
        if (model.mode == ChatMode.Replay) model.replies.sortedBy { if (it.id.startsWith("showcase")) 0 else 1 }.take(6)
            .forEach { r -> Card(r.title, t) { model.send("", r) } }
        else prompts.forEach { p -> Card(p, t) { model.send(p) } }
    }
}

@Composable
private fun Card(title: String, t: Tokens, onClick: () -> Unit) {
    Text(title, color = t.text, fontSize = 15.sp,
        modifier = Modifier.fillMaxWidth().clip14()
            .background(t.surface, RoundedCornerShape(14.dp)).border(1.dp, t.border, RoundedCornerShape(14.dp))
            .clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 14.dp))
}

/** One rounded box: the message (Claude) or the saved reply to play (Replay), and a round button. */
@Composable
private fun Composer(model: ChatModel, t: Tokens) {
    var draft by remember { mutableStateOf("") }
    var menu by remember { mutableStateOf(false) }
    val send = {
        if (model.mode == ChatMode.Claude) { if (draft.isNotBlank()) { model.send(draft.trim()); draft = "" } }
        else model.send("")
    }
    Column(Modifier.padding(start = 14.dp, end = 14.dp, top = 8.dp, bottom = 6.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Row(Modifier.fillMaxWidth().heightIn(min = 54.dp)
            .background(t.surface, RoundedCornerShape(22.dp)).border(1.dp, t.border, RoundedCornerShape(22.dp)).padding(5.dp),
            verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.weight(1f).padding(start = 12.dp)) {
                if (model.mode == ChatMode.Claude) {
                    BasicTextField(draft, { draft = it }, singleLine = true,
                        textStyle = TextStyle(color = t.text, fontSize = 16.sp), cursorBrush = SolidColor(t.primary),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                        keyboardActions = KeyboardActions(onSend = { send() }),
                        modifier = Modifier.fillMaxWidth().semantics { contentDescription = "Message" },
                        decorationBox = { field ->
                            if (draft.isEmpty()) Text("Ask for something with a screen…", color = t.muted, fontSize = 16.sp)
                            field()
                        })
                } else {
                    Row(Modifier.fillMaxWidth().clickable { menu = true }.padding(vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(model.picked?.title ?: "No saved replies (is the server running?)", color = t.text, fontSize = 16.sp,
                            maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                        // A small chevron, drawn so it looks the same on every phone.
                        Canvas(Modifier.padding(horizontal = 10.dp).size(10.dp)) {
                            val w = size.width; val h = size.height
                            drawLine(t.muted, Offset(0f, h * 0.3f), Offset(w / 2, h * 0.75f), 1.6.dp.toPx(), StrokeCap.Round)
                            drawLine(t.muted, Offset(w, h * 0.3f), Offset(w / 2, h * 0.75f), 1.6.dp.toPx(), StrokeCap.Round)
                        }
                    }
                    DropdownMenu(menu, { menu = false }) {
                        model.replies.forEach { r -> DropdownMenuItem(text = { Text(r.title) }, onClick = { model.picked = r; menu = false }) }
                    }
                }
            }
            val disabled = !model.busy && (if (model.mode == ChatMode.Claude) draft.isBlank() else model.picked == null)
            RoundButton(
                kind = if (model.busy) "stop" else if (model.mode == ChatMode.Replay) "play" else "send",
                t = t, enabled = !disabled,
                onClick = { if (model.busy) model.stop() else send() },
            )
        }
        Text(if (model.mode == ChatMode.Replay) "Replay: saved answers from Claude Haiku" else "Claude: live answers through the dev server",
            color = t.muted, fontSize = 11.sp, modifier = Modifier.padding(top = 6.dp))
    }
}

/** The coral round button: play, send (arrow up) or stop, drawn so it looks the same on every phone. */
@Composable
private fun RoundButton(kind: String, t: Tokens, enabled: Boolean, onClick: () -> Unit) {
    val label = when (kind) { "stop" -> "Stop"; "play" -> "Play"; else -> "Send" }
    val fill = if (kind == "stop") t.text else t.primary
    val ink = if (kind == "stop") t.background else Color.White
    Canvas(Modifier.size(42.dp).alpha(if (enabled) 1f else 0.35f).clip14(CircleShape)
        .clickable(enabled = enabled, onClick = onClick).semantics { contentDescription = label }) {
        drawCircle(fill)
        val c = center
        val u = size.minDimension / 42f
        when (kind) {
            "stop" -> drawRoundRect(ink, Offset(c.x - 6 * u, c.y - 6 * u), Size(12 * u, 12 * u), CornerRadius(2 * u))
            "play" -> drawPath(Path().apply {
                moveTo(c.x - 5 * u, c.y - 7 * u); lineTo(c.x + 8 * u, c.y); lineTo(c.x - 5 * u, c.y + 7 * u); close()
            }, ink)
            else -> {
                drawLine(ink, Offset(c.x, c.y + 7 * u), Offset(c.x, c.y - 7 * u), 2.4f * u, StrokeCap.Round)
                drawLine(ink, Offset(c.x - 6 * u, c.y - 1 * u), Offset(c.x, c.y - 7 * u), 2.4f * u, StrokeCap.Round)
                drawLine(ink, Offset(c.x + 6 * u, c.y - 1 * u), Offset(c.x, c.y - 7 * u), 2.4f * u, StrokeCap.Round)
            }
        }
    }
}

@Composable
private fun MessageRow(message: ChatMessage, t: Tokens) {
    val context = LocalContext.current
    if (message.fromUser) {
        Row(Modifier.fillMaxWidth()) {
            Spacer(Modifier.weight(1f).widthIn(min = 48.dp))
            Text((message.pieces.firstOrNull() as? Piece.Words)?.text ?: "", color = t.text, fontSize = 16.sp,
                modifier = Modifier.background(t.primary.copy(alpha = 0.12f), RoundedCornerShape(18.dp))
                    .border(1.dp, t.primary.copy(alpha = 0.25f), RoundedCornerShape(18.dp))
                    .padding(horizontal = 14.dp, vertical = 9.dp))
        }
    } else {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            Box(Modifier.padding(top = 2.dp)) { PrismMark(22.dp) }
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                for (piece in message.pieces) when (piece) {
                    is Piece.Words -> Markdown(piece.text, t)
                    is Piece.Building -> BuildingCard(piece.progress, t)
                    is Piece.Screen -> PrismWidget(
                        envelopeJson = piece.envelopeJson,
                        instanceId = piece.id,
                        snapshot = ChatModel.snapshots[piece.id],
                        onEffect = { ChatModel.handle(context, it) },
                        onSnapshot = { ChatModel.snapshots[piece.id] = it },
                    )
                }
                message.status?.let { Text(it, color = t.muted, fontSize = 12.sp) }
            }
        }
    }
}

/** Shown while the model is still writing a screen: its title and grey shapes, gently pulsing. */
@Composable
private fun BuildingCard(progress: BlockProgress, t: Tokens) {
    val pulse by rememberInfiniteTransition(label = "pulse")
        .animateFloat(0.45f, 1f, infiniteRepeatable(tween(800), RepeatMode.Reverse), label = "alpha")
    Column(Modifier.fillMaxWidth().background(t.surface, RoundedCornerShape(16.dp))
        .border(1.dp, t.border, RoundedCornerShape(16.dp)).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(progress.title ?: "Building the screen…", color = if (progress.title != null) t.text else t.muted,
            fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
        val rows = progress.shape.size.coerceIn(2, 6)
        repeat(rows) { i ->
            Box(Modifier.alpha(pulse).fillMaxWidth(if (i % 2 == 0) 0.85f else 0.55f).height(12.dp)
                .background(t.border, RoundedCornerShape(6.dp)))
        }
    }
}

/** The model's plain text: paragraphs, bullet lists, small headings, **bold** and `code`. Enough for chat. */
@Composable
private fun Markdown(text: String, t: Tokens) {
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        var code: MutableList<String>? = null
        for (raw in text.trim().lines()) {
            val line = raw.trim()
            when {
                line.startsWith("```") -> if (code == null) code = mutableListOf() else {
                    CodeBox(code.joinToString("\n"), t); code = null
                }
                code != null -> code.add(raw)
                line.isEmpty() -> {}
                line.startsWith("- ") || line.startsWith("* ") ->
                    Row { Text("•  ", color = t.text, fontSize = 16.sp); Text(inline(line.drop(2), t), color = t.text, fontSize = 16.sp, lineHeight = 22.sp) }
                line.startsWith("#") ->
                    Text(inline(line.trimStart('#').trim(), t), color = t.text, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
                else -> Text(inline(line, t), color = t.text, fontSize = 16.sp, lineHeight = 22.sp)
            }
        }
        code?.let { CodeBox(it.joinToString("\n"), t) } // still streaming
    }
}

@Composable
private fun CodeBox(code: String, t: Tokens) {
    Text(code, color = t.text, fontSize = 13.sp, fontFamily = FontFamily.Monospace,
        modifier = Modifier.fillMaxWidth().background(t.surface, RoundedCornerShape(10.dp)).padding(10.dp))
}

private fun inline(s: String, t: Tokens): AnnotatedString = buildAnnotatedString {
    // **bold** and `code`, nothing else.
    Regex("""\*\*([^*]+)\*\*|`([^`]+)`""").let { re ->
        var last = 0
        for (m in re.findAll(s)) {
            append(s.substring(last, m.range.first))
            if (m.groupValues[1].isNotEmpty()) withStyle(SpanStyle(fontWeight = FontWeight.SemiBold)) { append(m.groupValues[1]) }
            else withStyle(SpanStyle(fontFamily = FontFamily.Monospace, background = t.border)) { append(m.groupValues[2]) }
            last = m.range.last + 1
        }
        append(s.substring(last))
    }
}

/** A two-or-more option switch, the selected one on a raised chip. */
@Composable
fun Segmented(options: List<String>, selected: Int, t: Tokens, onSelect: (Int) -> Unit) {
    Row(Modifier.background(t.border.copy(alpha = 0.6f), RoundedCornerShape(12.dp)).padding(3.dp)) {
        options.forEachIndexed { i, label ->
            Text(label, color = if (i == selected) t.text else t.muted, fontSize = 15.sp,
                fontWeight = if (i == selected) FontWeight.SemiBold else FontWeight.Normal,
                modifier = Modifier.clip14(RoundedCornerShape(9.dp))
                    .background(if (i == selected) t.surface else Color.Transparent, RoundedCornerShape(9.dp))
                    .clickable { onSelect(i) }.padding(horizontal = 16.dp, vertical = 7.dp))
        }
    }
}

/** The Prism logo mark (brand/): three glass panes, coral, mint and azure. */
@Composable
fun PrismMark(size: androidx.compose.ui.unit.Dp) {
    val dark = isSystemInDarkTheme()
    val colours = if (dark) listOf(Color(0xFFFF5A4E), Color(0xD93DDC97), Color(0xCCA9C6FF))
    else listOf(Color(0xD9E5483C), Color(0xBF1FA971), Color(0x993A76F0))
    Canvas(Modifier.width(size * 104f / 108f).height(size)) {
        val u = this.size.height / 108f // the logo is drawn on a 104 x 108 grid
        colours.forEachIndexed { i, c ->
            drawRoundRect(c, Offset((4 + 19 * i) * u, (4 + 14 * i) * u), Size(58 * u, 72 * u), CornerRadius(12 * u))
        }
    }
}

private fun Modifier.clip14(shape: Shape = RoundedCornerShape(14.dp)) = clip(shape)
