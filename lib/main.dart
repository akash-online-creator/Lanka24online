import 'dart:isolate';
import 'package:flutter/material.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart' hide NotificationVisibility;
import 'package:flutter_overlay_window/flutter_overlay_window.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'services/background_location_handler.dart';
import 'overlay/floating_overlay_widget.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SahayaSewaApp());
}

class SahayaSewaApp extends StatelessWidget {
  const SahayaSewaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Sahaya Sewa',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF007A4B)),
        useMaterial3: true,
      ),
      home: const MainAppScreen(),
    );
  }
}

class MainAppScreen extends StatefulWidget {
  const MainAppScreen({super.key});

  @override
  State<MainAppScreen> createState() => _MainAppScreenState();
}

class _MainAppScreenState extends State<MainAppScreen> {
  late final WebViewController _webViewController;
  ReceivePort? _receivePort;
  bool _isServiceRunning = false;
  bool _isOverlayActive = false;

  @override
  void initState() {
    super.initState();
    _initWebview();
    _initForegroundTask();
    _autoStartBackgroundServices();
  }

  void _initWebview() {
    _webViewController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF07130C))
      ..loadRequest(Uri.parse('https://ais-pre-arugkwlbojbp6jxjcd24un-234713481275.asia-southeast1.run.app'));
  }

  void _initForegroundTask() {
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'sahaya_location_channel',
        channelName: 'Sahaya 24/7 Location Service',
        channelDescription: 'Maintains background safety & disaster awareness',
        channelImportance: NotificationChannelImportance.HIGH,
        priority: NotificationPriority.HIGH,
        iconData: const NotificationIconData(
          resType: ResourceType.mipmap,
          resPrefix: ResourcePrefix.ic,
          name: 'launcher',
        ),
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: true,
        playSound: false,
      ),
      foregroundTaskOptions: const ForegroundTaskOptions(
        interval: 10000,
        isOnceEvent: false,
        autoRunOnBoot: true,
        allowWakeLock: true,
        allowWifiLock: true,
      ),
    );
  }

  Future<void> _autoStartBackgroundServices() async {
    try {
      await Permission.location.request();
      await Permission.locationAlways.request();
      await Permission.notification.request();

      if (!await FlutterForegroundTask.isRunningService) {
        final receivePort = FlutterForegroundTask.receivePort;
        _receivePort = receivePort;
        _receivePort?.listen((data) {
          if (data is Map) {
            FlutterOverlayWindow.shareData(data);
          }
        });

        await FlutterForegroundTask.startService(
          notificationTitle: '🚨 Sahaya Sewa Live Guard Active',
          notificationText: 'Tracking real-time location in background...',
          callback: startLocationCallback,
        );
        setState(() => _isServiceRunning = true);
      }
    } catch (e) {
      debugPrint('Background init notice: $e');
    }
  }

  Future<void> _toggleFloatingOverlay() async {
    bool hasPermission = await FlutterOverlayWindow.isPermissionGranted();
    if (!hasPermission) {
      await FlutterOverlayWindow.requestPermission();
      return;
    }

    if (await FlutterOverlayWindow.isActive()) {
      await FlutterOverlayWindow.closeOverlay();
      setState(() => _isOverlayActive = false);
    } else {
      await FlutterOverlayWindow.showOverlay(
        enableDrag: true,
        overlayTitle: "Sahaya Sewa Floating Radar",
        overlayContent: "Tap to expand",
        flag: OverlayFlag.defaultFlag,
        alignment: OverlayAlignment.centerRight,
        visibility: NotificationVisibility.visibilityPublic,
        positionGravity: PositionGravity.auto,
        width: 70,
        height: 70,
      );
      setState(() => _isOverlayActive = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            WebViewWidget(controller: _webViewController),
            Positioned(
              bottom: 20,
              right: 20,
              child: FloatingActionButton.extended(
                backgroundColor: const Color(0xFF007A4B),
                foregroundColor: Colors.white,
                onPressed: _toggleFloatingOverlay,
                icon: const Icon(Icons.picture_in_picture_alt),
                label: Text(_isOverlayActive ? "Hide Floating Overlay" : "Floating Overlay"),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
