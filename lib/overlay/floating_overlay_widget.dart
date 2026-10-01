import 'package:flutter/material.dart';
import 'package:flutter_overlay_window/flutter_overlay_window.dart';

@pragma("vm:entry-point")
void overlayMain() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MaterialApp(
    debugShowCheckedModeBanner: false,
    home: FloatingOverlayWidget(),
  ));
}

class FloatingOverlayWidget extends StatefulWidget {
  const FloatingOverlayWidget({super.key});

  @override
  State<FloatingOverlayWidget> createState() => _FloatingOverlayWidgetState();
}

class _FloatingOverlayWidgetState extends State<FloatingOverlayWidget> {
  bool _isExpanded = false;
  String _locationStatus = "GPS Active (7.1710, 79.8986)";

  @override
  void initState() {
    super.initState();
    FlutterOverlayWindow.overlayListener.listen((event) {
      if (event != null && mounted) {
        setState(() {
          _locationStatus = "Lat: ${event['latitude']} | Lng: ${event['longitude']}";
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: Center(
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          width: _isExpanded ? 240 : 64,
          height: _isExpanded ? 160 : 64,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF007A4B), Color(0xFF059669)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(_isExpanded ? 24 : 32),
            border: Border.all(color: Colors.white.withOpacity(0.4), width: 2),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.35),
                blurRadius: 16,
                spreadRadius: 2,
                offset: const Offset(0, 4),
              )
            ],
          ),
          child: _isExpanded ? _buildExpandedView() : _buildCollapsedIcon(),
        ),
      ),
    );
  }

  Widget _buildCollapsedIcon() {
    return InkWell(
      onTap: () {
        setState(() => _isExpanded = true);
        FlutterOverlayWindow.resizeOverlay(260, 180, true);
      },
      borderRadius: BorderRadius.circular(32),
      child: const Center(
        child: Icon(
          Icons.shield_rounded,
          color: Colors.white,
          size: 32,
        ),
      ),
    );
  }

  Widget _buildExpandedView() {
    return Padding(
      padding: const EdgeInsets.all(12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.location_on, color: Colors.amber, size: 18),
                  SizedBox(width: 4),
                  Text(
                    "සහය සේවා Live",
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
              GestureDetector(
                onTap: () {
                  setState(() => _isExpanded = false);
                  FlutterOverlayWindow.resizeOverlay(70, 70, true);
                },
                child: const Icon(Icons.close, color: Colors.white70, size: 18),
              )
            ],
          ),
          Text(
            _locationStatus,
            style: const TextStyle(color: Colors.white70, fontSize: 10),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.redAccent,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                  ),
                  onPressed: () {},
                  icon: const Icon(Icons.warning_amber_rounded, size: 16),
                  label: const Text(
                    "SOS Alert",
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          )
        ],
      ),
    );
  }
}
