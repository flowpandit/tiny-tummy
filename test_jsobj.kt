import app.tauri.plugin.JSObject
import app.tauri.plugin.Invoke
fun test(i: Invoke) {
    val o = JSObject()
    o.put("ok", true)
    i.resolve(o)
}
