package com.sahayasewa.app

import android.app.KeyguardManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.WindowManager
import androidx.core.app.NotificationCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    private val SCREEN_WAKER_CHANNEL = "com.sahayasewa.app/screen_waker"
    private val RED_ALERT_CHANNEL_ID = "sahaya_emergency_red_alert"
    private val SERVICE_ALERT_CHANNEL_ID = "sahaya_quick_and_relief_channel"
    private var sirenMediaPlayer: MediaPlayer? = null
    private var screenWakeLock: PowerManager.WakeLock? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        applyLockScreenFlags()
        createNativeNotificationChannels()
        handleIncomingEmergencyIntent(intent)
    }

    override fun onResume() {
        super.onResume()
        applyLockScreenFlags()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        applyLockScreenFlags()
        handleIncomingEmergencyIntent(intent)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        applyLockScreenFlags()
    }

    private fun handleIncomingEmergencyIntent(intent: Intent?) {
        if (intent == null) return
        val isEmergencyWake = intent.getBooleanExtra("EMERGENCY_RED_ALERT_WAKE", false)
        if (isEmergencyWake) {
            forceWakeUpScreenAndBringToFront(false)
        }
    }

    private fun applyLockScreenFlags() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            )
        }
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON
        )
    }

    private fun createNativeNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

            // 1. Red Alert Emergency Siren Channel (Bypass DND & Full Screen Lockscreen Wake)
            val sirenSoundUri = Uri.parse("android.resource://${packageName}/raw/siren")
            val alarmAudioAttrs = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()

            val redChannel = NotificationChannel(
                RED_ALERT_CHANNEL_ID,
                "🚨 රතු එළිය හදිසි ආපදා සයිරනය (Red Alert Siren)",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "දුරකථන තිරය Off කර තිබියදීත් සයිරන් නාදය සමඟ තිරය On කර පණිවිඩය පෙන්වයි"
                enableLights(true)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 200, 1000, 200, 1500, 200, 2000)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
                setBypassDnd(true)
                setSound(sirenSoundUri, alarmAudioAttrs)
            }
            nm.createNotificationChannel(redChannel)

            // 2. Quick Service, Blood Request & Relief Request Channel
            val defaultNotifUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val notifAudioAttrs = AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()

            val serviceChannel = NotificationChannel(
                SERVICE_ALERT_CHANNEL_ID,
                "⚡ ඉක්මන් සේවා, ලේ ඉල්ලීම් සහ සහන සේවා (24/7 Alerts)",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "ඇප් එකෙන් ඉවත් වී සිටියදීත් ඉක්මන් සේවා, ලේ ඉල්ලීම් සහ සහන සේවා දැනුම්දීම් පෙන්වයි"
                enableLights(true)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 400, 150, 400, 150, 600)
                lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
                setSound(defaultNotifUri, notifAudioAttrs)
            }
            nm.createNotificationChannel(serviceChannel)
        }
    }

    fun startNativeEmergencySiren() {
        try {
            if (sirenMediaPlayer?.isPlaying == true) return
            stopNativeEmergencySiren()

            val audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            if (audioManager != null) {
                val maxVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
                val curVol = audioManager.getStreamVolume(AudioManager.STREAM_ALARM)
                if (curVol < (maxVol * 0.7).toInt()) {
                    try {
                        audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxVol, 0)
                    } catch (_: Exception) {}
                }
            }

            val afd = resources.openRawResourceFd(R.raw.siren)
            val mp = MediaPlayer()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                mp.setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
            } else {
                @Suppress("DEPRECATION")
                mp.setAudioStreamType(AudioManager.STREAM_ALARM)
            }
            mp.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
            afd.close()
            mp.isLooping = true
            mp.prepare()
            mp.start()
            sirenMediaPlayer = mp

            triggerEmergencyVibration()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun stopNativeEmergencySiren() {
        try {
            sirenMediaPlayer?.let {
                if (it.isPlaying) {
                    it.stop()
                }
                it.release()
            }
        } catch (_: Exception) {}
        sirenMediaPlayer = null

        try {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vm?.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            }
            vibrator?.cancel()
        } catch (_: Exception) {}
    }

    private fun triggerEmergencyVibration() {
        try {
            val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vm = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vm?.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
            }
            val pattern = longArrayOf(0, 1000, 250, 1000, 250, 1500, 250, 2000)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(pattern, 0)
            }
        } catch (_: Exception) {}
    }

    fun forceWakeUpScreenAndBringToFront(relaunchActivity: Boolean = true) {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
            if (powerManager != null) {
                if (screenWakeLock?.isHeld == true) {
                    try { screenWakeLock?.release() } catch (_: Exception) {}
                }
                @Suppress("DEPRECATION")
                screenWakeLock = powerManager.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK or
                    PowerManager.ACQUIRE_CAUSES_WAKEUP or
                    PowerManager.ON_AFTER_RELEASE,
                    "sahaya:emergency_screen_wake"
                )
                screenWakeLock?.acquire(45000) // Keep screen illuminated for 45 seconds during Red Alert
            }

            applyLockScreenFlags()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
                keyguardManager?.requestDismissKeyguard(this, null)
            }

            if (relaunchActivity) {
                val launchIntent = Intent(applicationContext, MainActivity::class.java).apply {
                    addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                    )
                    putExtra("EMERGENCY_RED_ALERT_WAKE", true)
                }
                applicationContext.startActivity(launchIntent)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun triggerFullScreenRedAlertNotification(title: String, body: String) {
        try {
            createNativeNotificationChannels()
            forceWakeUpScreenAndBringToFront(true)
            startNativeEmergencySiren()

            val fullScreenIntent = Intent(applicationContext, MainActivity::class.java).apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP
                )
                putExtra("EMERGENCY_RED_ALERT_WAKE", true)
            }

            val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val fullScreenPendingIntent = PendingIntent.getActivity(
                applicationContext,
                9110,
                fullScreenIntent,
                pendingFlags
            )

            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            val notifBuilder = NotificationCompat.Builder(applicationContext, RED_ALERT_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(if (title.startsWith("🚨")) title else "🚨 $title")
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(true)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setContentIntent(fullScreenPendingIntent)

            nm?.notify(9911, notifBuilder.build())
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun showBackgroundServiceNotification(title: String, body: String, notifId: Int) {
        try {
            createNativeNotificationChannels()
            val tapIntent = Intent(applicationContext, MainActivity::class.java).apply {
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP
                )
            }
            val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }
            val pendingIntent = PendingIntent.getActivity(
                applicationContext,
                notifId,
                tapIntent,
                pendingFlags
            )

            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            val notifBuilder = NotificationCompat.Builder(applicationContext, SERVICE_ALERT_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_EVENT)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)

            nm?.notify(notifId, notifBuilder.build())
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, SCREEN_WAKER_CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "wakeUpScreen" -> {
                    val title = call.argument<String>("title") ?: "🚨 රතු එළිය - හදිසි ආපදා අනතුරු ඇඟවීමක්!"
                    val body = call.argument<String>("body") ?: "ඔබගේ ප්‍රදේශය අවට හදිසි ආපදාවක් වාර්තා වී ඇත. වහාම පරීක්ෂා කරන්න."
                    val playSiren = call.argument<Boolean>("playSiren") ?: true
                    if (playSiren) {
                        triggerFullScreenRedAlertNotification(title, body)
                    } else {
                        forceWakeUpScreenAndBringToFront(true)
                    }
                    result.success(true)
                }
                "stopSiren" -> {
                    stopNativeEmergencySiren()
                    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                    nm?.cancel(9911)
                    result.success(true)
                }
                "showBackgroundNotification" -> {
                    val title = call.argument<String>("title") ?: "සහය සේවා දැනුම්දීමක්"
                    val body = call.argument<String>("body") ?: ""
                    val notifId = call.argument<Int>("notifId") ?: (System.currentTimeMillis() % 100000).toInt()
                    showBackgroundServiceNotification(title, body, notifId)
                    result.success(true)
                }
                else -> result.notImplemented()
            }
        }
    }
}
