package com.nikhilmehral.tinytummy

import android.app.Activity
import android.content.ContentValues
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.Plugin
import java.io.File
import java.io.FileOutputStream

@InvokeArg
class SavePdfArgs {
    var fileName: String = ""
    var base64Data: String = ""
}

@TauriPlugin
class DownloadsPlugin(private val activity: Activity) : Plugin(activity) {
    @Command
    fun savePdfToDownloads(invoke: Invoke) {
        val args = invoke.parseArgs(SavePdfArgs::class.java)

        try {
            val pdfBytes = Base64.decode(args.base64Data, Base64.DEFAULT)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                saveWithMediaStore(args.fileName, pdfBytes)
            } else {
                saveLegacy(args.fileName, pdfBytes)
            }
            invoke.resolve()
        } catch (error: Exception) {
            invoke.reject("Failed to save PDF to Downloads: ${error.message}")
        }
    }

    private fun saveWithMediaStore(fileName: String, pdfBytes: ByteArray) {
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
        } catch (error: Exception) {
            resolver.delete(uri, null, null)
            throw error
        }
    }

    private fun saveLegacy(fileName: String, pdfBytes: ByteArray) {
        val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        if (!downloadsDir.exists() && !downloadsDir.mkdirs()) {
            throw IllegalStateException("Unable to access the Downloads folder.")
        }

        val targetFile = File(downloadsDir, fileName)
        FileOutputStream(targetFile).use { stream ->
            stream.write(pdfBytes)
        }
    }
}
