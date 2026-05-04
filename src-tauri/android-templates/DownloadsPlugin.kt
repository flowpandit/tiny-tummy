package com.nikhilmehral.tinytummy

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
class OpenPdfArgs {
    var uri: String = ""
}

@TauriPlugin
class DownloadsPlugin(private val activity: Activity) : Plugin(activity) {
    @Command
    fun savePdfToDownloads(invoke: Invoke) {
        val args = invoke.parseArgs(SavePdfArgs::class.java)

        try {
            val pdfBytes = Base64.decode(args.base64Data, Base64.DEFAULT)
            val savedUri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                saveWithMediaStore(args.fileName, pdfBytes)
            } else {
                saveLegacy(args.fileName, pdfBytes)
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
    fun openPdfFromDownloads(invoke: Invoke) {
        val args = invoke.parseArgs(OpenPdfArgs::class.java)

        activity.runOnUiThread {
            try {
                if (args.uri.isBlank()) {
                    throw IllegalArgumentException("Saved PDF location is missing.")
                }

                val uri = Uri.parse(args.uri)
                val intent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(uri, "application/pdf")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    clipData = ClipData.newUri(
                        activity.contentResolver,
                        "Tiny Tummy PDF report",
                        uri
                    )
                }
                activity.startActivity(intent)
                invoke.resolve()
            } catch (error: ActivityNotFoundException) {
                invoke.reject("No PDF viewer is installed on this device.")
            } catch (error: Exception) {
                invoke.reject("Could not open PDF report: ${error.message}")
            }
        }
    }

    private fun saveWithMediaStore(fileName: String, pdfBytes: ByteArray): String {
        val resolver = activity.contentResolver
        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
            put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
            put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
            put(MediaStore.Downloads.IS_PENDING, 1)
        }

        val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
            ?: throw IllegalStateException("Unable to create the Downloads file.")

        try {
            resolver.openOutputStream(uri)?.use { stream ->
                stream.write(pdfBytes)
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

    private fun saveLegacy(fileName: String, pdfBytes: ByteArray): String {
        val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        if (!downloadsDir.exists() && !downloadsDir.mkdirs()) {
            throw IllegalStateException("Unable to access the Downloads folder.")
        }

        val targetFile = File(downloadsDir, fileName)
        FileOutputStream(targetFile).use { stream ->
            stream.write(pdfBytes)
        }
        return FileProvider.getUriForFile(
            activity,
            "${activity.packageName}.fileprovider",
            targetFile
        ).toString()
    }
}
