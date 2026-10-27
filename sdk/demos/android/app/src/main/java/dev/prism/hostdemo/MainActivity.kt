package dev.prism.hostdemo

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.Alignment
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.Box
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.prism.android.PrismWidget

class Tokens(val background: Color, val surface: Color, val border: Color, val text: Color, val muted: Color, val primary: Color)

// The Prism brand (core/tokens.json): warm off-white and ink, with coral as the demo's colour.
private val Light = Tokens(Color(0xFFF7F6F5), Color(0xFFFFFFFF), Color(0xFFE6E4E2), Color(0xFF18181B), Color(0xFF6B6966), Color(0xFFE5483C))
private val Dark = Tokens(Color(0xFF050506), Color(0xFF111114), Color(0xFF24242A), Color(0xFFF4F4F5), Color(0xFFA8A6A5), Color(0xFFFF5A4E))

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        val examples = Demo.examples(this)
        setContent {
            val dark = isSystemInDarkTheme()
            val t = if (dark) Dark else Light
            // uiMode is handled in place, so keep the status bar icons readable ourselves.
            SideEffect { Demo.setLightBars(window, !dark) }
            MaterialTheme(colorScheme = if (dark) darkColorScheme(primary = t.primary) else lightColorScheme(primary = t.primary)) {
                var openId by rememberSaveable { mutableStateOf<String?>(null) }
                // `adb shell am start ... --es tab chat` opens the Chat tab first.
                var tab by rememberSaveable { mutableStateOf(intent.getStringExtra("tab") ?: "examples") }
                Column(Modifier.fillMaxSize().background(t.background).safeDrawingPadding()) {
                    val ex = examples.firstOrNull { it.id == openId }
                    Box(Modifier.weight(1f)) {
                        if (tab == "chat") ChatScreen(t)
                        else if (ex == null) {
                            Gallery(examples, t, onOpen = { openId = it }, onViews = {
                                startActivity(Intent(this@MainActivity, ViewsActivity::class.java))
                            })
                        } else {
                            BackHandler { openId = null }
                            ExamplePage(ex, t, onBack = { openId = null })
                        }
                    }
                    TabBar(tab, t) { tab = it }
                }
            }
        }
    }
}

/** Examples and Chat, at the bottom like the iOS demo. */
@Composable
private fun TabBar(tab: String, t: Tokens, onSelect: (String) -> Unit) {
    Box(Modifier.fillMaxWidth().height(1.dp).background(t.border))
    Row(Modifier.fillMaxWidth().background(t.background).padding(vertical = 8.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
        for ((id, label) in listOf("examples" to "Examples", "chat" to "Chat")) {
            val on = tab == id
            Text(label, color = if (on) t.primary else t.muted, fontSize = 15.sp,
                fontWeight = if (on) FontWeight.SemiBold else FontWeight.Medium,
                modifier = Modifier.clip(RoundedCornerShape(12.dp))
                    .background(if (on) t.primary.copy(alpha = 0.12f) else Color.Transparent, RoundedCornerShape(12.dp))
                    .clickable { onSelect(id) }.padding(horizontal = 28.dp, vertical = 10.dp))
        }
    }
}

// The home screen's sections. Tests check the SDK (a part that crashes, effects, the basic blocks
// only our own code may use); they stay at the bottom.
private val testIds = setOf("06-broken", "07-effects", "11-blocks")

/** "Chat parts (from the part library)" -> "Chat parts": the notes in brackets are for developers. */
private fun friendly(title: String) = title.substringBefore(" (")

@Composable
private fun Gallery(examples: List<Example>, t: Tokens, onOpen: (String) -> Unit, onViews: () -> Unit) {
    val main = examples.filter { it.id !in testIds }.sortedBy { if (it.id == "12-chat-parts") 0 else 1 }
    Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(Modifier.padding(top = 12.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            PrismMark(40.dp)
            Spacer(Modifier.width(14.dp))
            Column {
                Text("Prism examples", color = t.text, fontSize = 26.sp, fontWeight = FontWeight.Light)
                Text("Small working screens, drawn with Android controls.", color = t.muted, fontSize = 13.sp)
            }
        }
        SectionTitle("Examples", t)
        Group(t) { main.forEachIndexed { i, ex -> GalleryRow(friendly(ex.title), i > 0, t) { onOpen(ex.id) } } }
        SectionTitle("Tests", t)
        Group(t) {
            examples.filter { it.id in testIds }.forEachIndexed { i, ex -> GalleryRow(friendly(ex.title), i > 0, t) { onOpen(ex.id) } }
            GalleryRow("Views screen (two PrismWidgetViews)", true, t, onViews)
        }
    }
}

@Composable
private fun SectionTitle(text: String, t: Tokens) {
    Text(text, color = t.muted, fontSize = 14.sp, fontWeight = FontWeight.Medium, modifier = Modifier.padding(start = 16.dp, top = 14.dp))
}

@Composable
private fun Group(t: Tokens, content: @Composable () -> Unit) {
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(t.surface)
        .border(1.dp, t.border, RoundedCornerShape(16.dp))) { content() }
}

@Composable
private fun GalleryRow(title: String, divider: Boolean, t: Tokens, onClick: () -> Unit) {
    if (divider) Box(Modifier.fillMaxWidth().padding(start = 16.dp).height(1.dp).background(t.border))
    Row(Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 16.dp, vertical = 15.dp),
        verticalAlignment = Alignment.CenterVertically) {
        Text(title, color = t.text, fontSize = 17.sp, modifier = Modifier.weight(1f))
        Text("›", color = t.muted, fontSize = 22.sp)
    }
}

@Composable
private fun ExamplePage(ex: Example, t: Tokens, onBack: () -> Unit) {
    val context = LocalContext.current
    var showSource by remember(ex.id) { mutableStateOf(false) }
    var resets by remember(ex.id) { mutableIntStateOf(0) }
    Column(Modifier.fillMaxSize()) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 4.dp).horizontalScroll(rememberScrollState())) {
            TextButton(onClick = onBack) { Text("← Back") }
            TextButton(onClick = { showSource = !showSource }) { Text(if (showSource) "Hide source" else "Show source") }
            TextButton(onClick = { Demo.snapshots.remove(ex.id); resets++ }) { Text("Reset") }
        }
        Column(Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(16.dp)) {
            Text(ex.title, color = t.text, fontSize = 22.sp, fontWeight = FontWeight.Bold)
            Spacer(Modifier.padding(6.dp))
            PrismWidget(
                envelopeJson = ex.envelopeJson,
                instanceId = "${ex.id}#$resets",
                snapshot = Demo.snapshots[ex.id],
                onEffect = { Demo.handleEffect(context, it) },
                onSnapshot = { Demo.snapshots[ex.id] = it },
            )
            Spacer(Modifier.padding(6.dp))
            Text("This text sits right below the widget: the widget sized itself to its content.", color = t.muted, fontSize = 13.sp)
            if (showSource) {
                Spacer(Modifier.padding(6.dp))
                Text(
                    ex.source,
                    color = t.text,
                    fontSize = 12.sp,
                    fontFamily = FontFamily.Monospace,
                    modifier = Modifier.fillMaxWidth()
                        .background(t.surface, RoundedCornerShape(10.dp))
                        .border(1.dp, t.border, RoundedCornerShape(10.dp))
                        .padding(12.dp),
                )
            }
        }
    }
}
