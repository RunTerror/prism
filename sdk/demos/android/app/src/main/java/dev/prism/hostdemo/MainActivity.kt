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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.prism.android.PrismWidget

class Tokens(val background: Color, val surface: Color, val border: Color, val text: Color, val muted: Color, val primary: Color)

private val Light = Tokens(Color(0xFFF4F4F7), Color(0xFFFFFFFF), Color(0xFFE4E4E9), Color(0xFF1C1C1E), Color(0xFF6B6B76), Color(0xFF4F46E5))
private val Dark = Tokens(Color(0xFF0F0F12), Color(0xFF1C1C22), Color(0xFF2C2C34), Color(0xFFF2F2F7), Color(0xFFA1A1AA), Color(0xFF818CF8))

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
            MaterialTheme(colorScheme = if (dark) darkColorScheme() else lightColorScheme()) {
                var openId by rememberSaveable { mutableStateOf<String?>(null) }
                Column(Modifier.fillMaxSize().background(t.background).safeDrawingPadding()) {
                    val ex = examples.firstOrNull { it.id == openId }
                    if (ex == null) {
                        Gallery(examples, t, onOpen = { openId = it }, onViews = {
                            startActivity(Intent(this@MainActivity, ViewsActivity::class.java))
                        })
                    } else {
                        BackHandler { openId = null }
                        ExamplePage(ex, t, onBack = { openId = null })
                    }
                }
            }
        }
    }
}

@Composable
private fun Gallery(examples: List<Example>, t: Tokens, onOpen: (String) -> Unit, onViews: () -> Unit) {
    Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Prism · Compose host", color = t.text, fontSize = 26.sp, fontWeight = FontWeight.Bold)
        Text("dev.prism.android.PrismWidget, Valdi drawer", color = t.muted, fontSize = 14.sp)
        Spacer(Modifier.padding(4.dp))
        for (ex in examples) {
            Row(
                Modifier.fillMaxWidth()
                    .background(t.surface, RoundedCornerShape(14.dp))
                    .border(1.dp, t.border, RoundedCornerShape(14.dp))
                    .clickable { onOpen(ex.id) }
                    .padding(16.dp),
            ) {
                Text(ex.title, color = t.text, fontSize = 17.sp, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                Text(ex.id, color = t.muted, fontSize = 13.sp)
            }
        }
        Spacer(Modifier.padding(4.dp))
        Row(
            Modifier.fillMaxWidth()
                .background(t.primary, RoundedCornerShape(14.dp))
                .clickable { onViews() }
                .padding(16.dp),
        ) {
            Text("Views screen (two PrismWidgetViews) →", color = t.background, fontSize = 17.sp, fontWeight = FontWeight.Medium)
        }
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
