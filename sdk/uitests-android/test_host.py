#!/usr/bin/env python3
"""Real taps on the Android demo app (dev.prism.hostdemo): a plain Compose + Views app that uses
the exported SDK (dist/android/prism_sdk.aar) through the Kotlin wrapper (sdk/android).
Finds elements by their text in Android's UI tree (uiautomator), taps with adb, checks the
screen, and saves screenshots to sdk/screenshots.
    python3 uitests-android/test_host.py      (app installed, emulator running)
"""
import os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(HERE, "..", "screenshots")
APP = "dev.prism.hostdemo/.MainActivity"
failures = []

def adb(*args):
    return subprocess.run(["adb", *args], capture_output=True, text=True).stdout

def tree():
    """[(text, (x1, y1, x2, y2), class)] for every element with a text or description."""
    adb("shell", "uiautomator", "dump", "/sdcard/ui.xml")
    xml = adb("shell", "cat", "/sdcard/ui.xml")
    out = []
    for node in re.finditer(r"<node [^>]*>", xml):
        n = node.group(0)
        t = re.search(r' text="([^"]*)"', n).group(1) or re.search(r' content-desc="([^"]*)"', n).group(1)
        b = tuple(int(v) for v in re.findall(r"\d+", re.search(r' bounds="([^"]*)"', n).group(1)))
        cls = re.search(r' class="([^"]*)"', n).group(1)
        out.append((t.replace("&#10;", "\n").replace("&amp;", "&"), b, cls))
    return out

def find(text, index=0, timeout=4):
    end = time.time() + timeout
    while time.time() < end:
        hits = [b for (t, b, _) in tree() if t == text]
        if len(hits) > index:
            return hits[index]
        time.sleep(0.4)
    return None

def tap_xy(x, y):
    adb("shell", "input", "tap", str(int(x)), str(int(y)))
    time.sleep(0.8)

def tap(text, index=0, dx=0):
    b = find(text, index)
    if not b:
        raise AssertionError(f"not found: {text!r}")
    tap_xy((b[0] + b[2]) / 2 + dx, (b[1] + b[3]) / 2)
    return b

def check(cond, what):
    print(("  ok   " if cond else "  FAIL ") + what)
    if not cond:
        failures.append(what)

def shot(name):
    with open(os.path.join(SHOTS, name + ".png"), "wb") as f:
        f.write(subprocess.run(["adb", "exec-out", "screencap", "-p"], capture_output=True).stdout)

def start():
    adb("shell", "am", "force-stop", "dev.prism.hostdemo")
    adb("shell", "am", "start", "-W", "-n", APP)
    find("Prism · Compose host", timeout=15)  # wait until the list is up (slow on a cold emulator)

def wait_tap(text, timeout=10):
    """tap() with a longer wait: screens open slowly on a busy emulator."""
    b = find(text, timeout=timeout)
    if not b:
        raise AssertionError(f"not found: {text!r}")
    tap_xy((b[0] + b[2]) / 2, (b[1] + b[3]) / 2)

def back():
    wait_tap("← Back")
    find("Prism · Compose host", timeout=10)

def test_every_example():
    print("every example draws in the host app")
    start()
    check(find("Prism · Compose host", timeout=10) is not None, "host app open")
    marks = {"Hello": "Welcome to Prism", "Counter": "Tap a button", "Task list": "1 of 3 done",
             "Settings": "Notifications are on.", "Comparison table": "Where Prism runs", "Dashboard": "Store overview"}
    for title, mark in marks.items():
        tap(title)
        check(find(mark, timeout=8) is not None, f"{title} draws")
        back()
    shot("android-host-gallery")

def test_counter_state_kept():
    print("counter: taps, then state kept after going back and reopening")
    start()
    tap("Counter")
    tap("+1"); tap("+1")
    check(find("Going up") is not None, "counter went up")
    shot("android-host-counter")
    back()
    tap("Counter")
    check(find("Going up", timeout=8) is not None, "state kept after reopening")
    check(find("2") is not None, "still 2")
    back()

def test_settings():
    print("settings: native switch")
    start()
    tap("Settings")
    row = find("Notifications", timeout=8)
    tap_xy(950, (row[1] + row[3]) / 2)
    check(find("Notifications are off.") is not None, "switch changed the state")
    shot("android-host-settings")
    back()

def test_views_screen():
    print("Android Views screen: two PrismWidgetViews")
    start()
    # The link is below the examples; the list is longer than the screen.
    for _ in range(4):
        if find("Views screen (two PrismWidgetViews) →", timeout=2):
            break
        adb("shell", "input", "swipe", "540", "1800", "540", "600", "300")
    wait_tap("Views screen (two PrismWidgetViews) →")
    check(find("Tap a button", timeout=8) is not None, "counter widget in a View hierarchy")
    check(find("1 of 3 done") is not None, "tasks widget in a View hierarchy")
    shot("android-host-views")

for t in [test_every_example, test_counter_state_kept, test_settings, test_views_screen]:
    try:
        t()
    except AssertionError as e:
        check(False, str(e))

print("\n" + ("ALL PASSED" if not failures else f"{len(failures)} FAILED: " + "; ".join(failures)))
sys.exit(1 if failures else 0)
