package au.tinytummy.app

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import androidx.core.content.FileProvider
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.File
import java.io.FileOutputStream

@InvokeArg
class SavePdfArgs {
    var fileName: String = ""
    var base64Data: String = ""
}

@InvokeArg
class SaveTextArgs {
    var fileName: String = ""
    var text: String = ""
    var mimeType: String = "text/plain"
}

@InvokeArg
class OpenPdfArgs {
    var uri: String = ""
}

@InvokeArg
class OpenFileArgs {
    var uri: String = ""
    var mimeType: String = "application/octet-stream"
}

@TauriPlugin
class DownloadsPlugin(private val activity: Activity) : Plugin(activity) {
    @Command
    fun savePdfToDownloads(invoke: Invoke) {
        val args = invoke.parseArgs(SavePdfArgs::class.java)

        try {
            val pdfBytes = Base64.decode(args.base64Data, Base64.DEFAULT)
            val savedUri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                saveWithMediaStore(args.fileName, pdfBytes, "application/pdf")
            } else {
                saveLegacy(args.fileName, pdfBytes, "application/pdf")
            }
            val result = JSObject().apply {
                put("fileName", args.fileName)
                put("uri", savedUri)
            }
            invoke.resolve(result)
        } catch (error: Exception) {
            invoke.reject("Failed to save PDF to Downloads: ${error.message}")
        }
    }

    @Command
    fun saveTextToDownloads(invoke: Invoke) {
        val args = invoke.parseArgs(SaveTextArgs::class.java)

        try {
            val bytes = args.text.toByteArray(Charsets.UTF_8)
            val mimeType = args.mimeType.ifBlank { "text/plain" }
            val savedUri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                saveWithMediaStore(args.fileName, bytes, mimeType)
            } else {
                saveLegacy(args.fileName, bytes, mimeType)
            }
            val result = JSObject().apply {
                put("fileName", args.fileName)
                put("uri", savedUri)
            }
            invoke.resolve(result)
        } catch (error: Exception) {
            invoke.reject("Failed to save file to Downloads: ${error.message}")
        }
    }

    @Command
    fun openPdfFromDownloads(invoke: Invoke) {
        val args = invoke.parseArgs(OpenPdfArgs::class.java)
        openFromDownloads(invoke, args.uri, "application/pdf", "Tiny Tummy PDF report")
    }

    @Command
    fun openFileFromDownloads(invoke: Invoke) {
        val args = invoke.parseArgs(OpenFileArgs::class.java)
        openFromDownloads(
            invoke,
            args.uri,
            args.mimeType.ifBlank { "application/octet-stream" },
            "Tiny Tummy backup"
        )
    }

    private fun openFromDownloads(invoke: Invoke, uriValue: String, mimeType: String, clipLabel: String) {
        activity.runOnUiThread {
            try {
                if (uriValue.isBlank()) {
                    throw IllegalArgumentException("Saved file location is missing.")
                }

                val uri = Uri.parse(uriValue)
                val intent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(uri, mimeType)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    clipData = ClipData.newUri(
                        activity.contentResolver,
                        clipLabel,
                        uri
                    )
                }
                activity.startActivity(intent)
                invoke.resolve()
            } catch (error: ActivityNotFoundException) {
                invoke.reject("No app is installed to open this file.")
            } catch (error: Exception) {
                invoke.reject("Could not open saved file: ${error.message}")
            }
        }
    }

    private fun saveWithMediaStore(fileName: String, bytes: ByteArray, mimeType: String): String {
        val resolver = activity.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
            put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
            put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
            put(MediaStore.Downloads.IS_PENDING, 1)
        }

        val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
            ?: throw IllegalStateException("Unable to create the Downloads file.")

        try {
            resolver.openOutputStream(uri)?.use { stream ->
                stream.write(bytes)
            } ?: throw IllegalStateException("Unable to open the Downloads file.")

            val completedValues = ContentValues().apply {
                put(MediaStore.Downloads.IS_PENDING, 0)
            }
            resolver.update(uri, completedValues, null, null)
            return uri.toString()
        } catch (error: Exception) {
            resolver.delete(uri, null, null)
            throw error
        }
    }

    private fun saveLegacy(fileName: String, bytes: ByteArray, @Suppress("UNUSED_PARAMETER") mimeType: String): String {
        val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        if (!downloadsDir.exists() && !downloadsDir.mkdirs()) {
            throw IllegalStateException("Unable to access the Downloads folder.")
        }

        val targetFile = File(downloadsDir, fileName)
        FileOutputStream(targetFile).use { stream ->
            stream.write(bytes)
        }
        return FileProvider.getUriForFile(
            activity,
            "${activity.packageName}.fileprovider",
            targetFile
        ).toString()
    }
}
