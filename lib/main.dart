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
      title: 'සහය සේවා',
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
  bool _isServiceRunning = false;
  bool _isOverlayActive = false;
  bool _isLoading = true;

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
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            setState(() => _isLoading = true);
          },
          onPageFinished: (String url) {
            setState(() => _isLoading = false);
          },
          onWebResourceError: (WebResourceError error) {
            debugPrint('WebView Error: ${error.description}');
            // If any remote load fails, instantly fall back to local assets
            _webViewController.loadFlutterAsset('assets/web/index.html');
          },
        ),
      )
      ..loadFlutterAsset('assets/web/index.html');
  }

  void _initForegroundTask() {
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'sahaya_location_channel',
        channelName: 'සහය සේවා 24/7 Location Service',
        channelDescription: 'Maintains background safety & disaster awareness',
        channelImportance: NotificationChannelImportance.HIGH,
        priority: NotificationPriority.HIGH,
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: true,
        playSound: false,
      ),
      foregroundTaskOptions: ForegroundTaskOptions(
        eventAction: ForegroundTaskEventAction.repeat(10000),
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
        FlutterForegroundTask.addTaskDataCallback((data) {
          if (data is Map) {
            FlutterOverlayWindow.shareData(data);
          }
        });

        await FlutterForegroundTask.startService(
          notificationTitle: '🚨 සහය සේවා Live Guard සක්‍රීයයි',
          notificationText: 'පසුබිමේ සජීවී ස්ථාන දත්ත සහ ආරක්ෂණ පද්ධතිය ක්‍රියාත්මකයි...',
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
        overlayTitle: "සහය සේවා Floating Radar",
        overlayContent: "විස්තර බැලීමට ඔබන්න",
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
      backgroundColor: const Color(0xFF07130C),
      body: SafeArea(
        child: Stack(
          children: [
            WebViewWidget(controller: _webViewController),
            if (_isLoading)
              const Center(
                child: CircularProgressIndicator(
                  color: Color(0xFF007A4B),
                ),
              ),
            Positioned(
              bottom: 20,
              right: 20,
              child: FloatingActionButton.extended(
                backgroundColor: const Color(0xFF007A4B),
                foregroundColor: Colors.white,
                onPressed: _toggleFloatingOverlay,
                icon: const Icon(Icons.picture_in_picture_alt),
                label: Text(_isOverlayActive ? "Radar සඟවන්න" : "Floating Radar"),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
