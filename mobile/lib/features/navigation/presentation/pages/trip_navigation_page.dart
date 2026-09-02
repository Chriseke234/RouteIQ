import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_svg_icons.dart';
import '../../../../core/offline/local_storage_service.dart';
import '../../../trip/domain/entities/trip.dart';

class TripNavigationPage extends ConsumerStatefulWidget {
  const TripNavigationPage({super.key});

  @override
  ConsumerState<TripNavigationPage> createState() => _TripNavigationPageState();
}

class _TripNavigationPageState extends ConsumerState<TripNavigationPage> {
  final MapController _mapController = MapController();
  TripEntity? _trip;
  LatLng? _currentPosition;
  bool _isLoading = true;
  bool _isSimulatingMovement = false;
  Timer? _simTimer;
  int _simIndex = 0;
  bool _isDeviated = false;
  String? _statusBannerMessage;

  @override
  void initState() {
    super.initState();
    _loadTripData();
    _initGps();
  }

  @override
  void dispose() {
    _simTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadTripData() async {
    setState(() => _isLoading = true);
    final trip = await LocalStorageService.getActiveTrip();
    if (mounted) {
      setState(() {
        _trip = trip;
        _isLoading = false;
        if (trip != null && trip.nodes.isNotEmpty) {
          _currentPosition = LatLng(trip.nodes.first.latitude, trip.nodes.first.longitude);
        }
      });
    }
  }

  Future<void> _initGps() async {
    try {
      final perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        await Geolocator.requestPermission();
      }
      final pos = await Geolocator.getLastKnownPosition();
      if (pos != null && mounted) {
        setState(() {
          _currentPosition = LatLng(pos.latitude, pos.longitude);
        });
      }
    } catch (_) {
      // Graceful fallback for browser
    }
  }

  void _toggleSimulation() {
    if (_isSimulatingMovement) {
      _simTimer?.cancel();
      setState(() => _isSimulatingMovement = false);
    } else {
      if (_trip == null || _trip!.nodes.isEmpty) return;
      setState(() => _isSimulatingMovement = true);

      // Interpolate along stops
      final points = _trip!.nodes.map((n) => LatLng(n.latitude, n.longitude)).toList();
      _simTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
        if (!mounted) return;
        setState(() {
          _simIndex = (_simIndex + 1) % points.length;
          _currentPosition = points[_simIndex];
          _mapController.move(_currentPosition!, 14.0);

          // Check geofence
          final activeNode = _getActiveNode();
          if (activeNode != null) {
            final dist = const Distance().as(
              LengthUnit.Meter,
              _currentPosition!,
              LatLng(activeNode.latitude, activeNode.longitude),
            );
            if (dist <= 150 && activeNode.nodeStatus == 'pending') {
              _updateNodeStatus(activeNode.id, 'arrived');
            }
          }
        });
      });
    }
  }

  TripNodeEntity? _getActiveNode() {
    if (_trip == null || _trip!.nodes.isEmpty) return null;
    try {
      return _trip!.nodes.firstWhere((n) => n.nodeStatus == 'pending' || n.nodeStatus == 'arrived');
    } catch (_) {
      return _trip!.nodes.last;
    }
  }

  Future<void> _updateNodeStatus(String nodeId, String newStatus) async {
    if (_trip == null) return;
    final updatedNodes = _trip!.nodes.map((node) {
      if (node.id == nodeId) {
        final now = DateTime.now();
        return node.copyWith(
          nodeStatus: newStatus,
          actualArrival: newStatus == 'arrived' ? now : node.actualArrival,
          actualDeparture: (newStatus == 'delivered' || newStatus == 'skipped') ? now : node.actualDeparture,
        );
      }
      return node;
    }).toList();

    final updatedTrip = _trip!.copyWith(
      nodes: updatedNodes,
      vectorClockClient: _trip!.vectorClockClient + 1,
    );

    setState(() {
      _trip = updatedTrip;
      _statusBannerMessage = "Stop updated to '$newStatus'. Vector Clock: [${updatedTrip.vectorClockClient}, ${updatedTrip.vectorClockServer}]";
    });

    await LocalStorageService.saveActiveTrip(updatedTrip);
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppTheme.primary));
    }

    if (_trip == null) {
      return _buildEmptyState();
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final isDesktop = constraints.maxWidth >= 960;

        return Column(
          children: [
            if (_statusBannerMessage != null) _buildNotificationBanner(),
            Expanded(
              child: isDesktop
                  ? Row(
                      children: [
                        Expanded(flex: 3, child: _buildMapSection()),
                        Container(width: 1, color: AppTheme.surfaceElevated),
                        SizedBox(
                          width: 420,
                          child: _buildDetailsAndQueuePanel(),
                        ),
                      ],
                    )
                  : Column(
                      children: [
                        Expanded(flex: 3, child: _buildMapSection()),
                        Expanded(flex: 2, child: _buildDetailsAndQueuePanel()),
                      ],
                    ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildNotificationBanner() {
    return Container(
      color: AppTheme.primaryDark.withValues(alpha: 0.8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          const AppSvgIcon(icon: AppSvgIcon.checkCircle, size: 18, color: AppTheme.primaryHover),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _statusBannerMessage!,
              style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w500),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 16, color: Colors.white70),
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
            onPressed: () => setState(() => _statusBannerMessage = null),
          ),
        ],
      ),
    );
  }

  Widget _buildMapSection() {
    final points = _trip!.nodes.map((n) => LatLng(n.latitude, n.longitude)).toList();
    final center = _currentPosition ?? (points.isNotEmpty ? points.first : const LatLng(6.5244, 3.3792));

    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: center,
            initialZoom: 13.0,
          ),
          children: [
            TileLayer(
              urlTemplate: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
              subdomains: const ['a', 'b', 'c'],
            ),
            // Geofence Circle Overlays (100m)
            CircleLayer(
              circles: _trip!.nodes.map((node) {
                final isCompleted = node.nodeStatus == 'delivered';
                final isArrived = node.nodeStatus == 'arrived';
                
                Color ringColor = AppTheme.primary;
                if (isCompleted) ringColor = AppTheme.success;
                if (isArrived) ringColor = AppTheme.warning;

                return CircleMarker(
                  point: LatLng(node.latitude, node.longitude),
                  radius: 100.0,
                  useRadiusInMeter: true,
                  color: ringColor.withValues(alpha: 0.12),
                  borderColor: ringColor.withValues(alpha: 0.4),
                  borderStrokeWidth: 2.0,
                );
              }).toList(),
            ),
            // Polyline connection
            if (points.isNotEmpty)
              PolylineLayer(
                polylines: [
                  Polyline(
                    points: points,
                    color: AppTheme.primary,
                    strokeWidth: 4.0,
                  ),
                ],
              ),
            // Stop Markers
            MarkerLayer(
              markers: _trip!.nodes.map((node) {
                final isCompleted = node.nodeStatus == 'delivered';
                final isArrived = node.nodeStatus == 'arrived';

                Color markerColor = const Color(0xFF64748B);
                if (isCompleted) markerColor = AppTheme.success;
                if (isArrived) markerColor = AppTheme.warning;
                if (node.nodeStatus == 'pending') markerColor = AppTheme.primary;

                return Marker(
                  point: LatLng(node.latitude, node.longitude),
                  width: 34,
                  height: 34,
                  child: Container(
                    decoration: BoxDecoration(
                      color: markerColor,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                      boxShadow: const [
                        BoxShadow(color: Colors.black38, blurRadius: 6, offset: Offset(0, 3)),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        "${node.sequenceIndex + 1}",
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
            // Live Driver Position Pulse
            if (_currentPosition != null)
              MarkerLayer(
                markers: [
                  Marker(
                    point: _currentPosition!,
                    width: 44,
                    height: 44,
                    child: Container(
                      decoration: BoxDecoration(
                        color: AppTheme.primaryHover.withValues(alpha: 0.3),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Container(
                          width: 18,
                          height: 18,
                          decoration: BoxDecoration(
                            color: AppTheme.primary,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2.5),
                            boxShadow: const [
                              BoxShadow(color: Colors.black45, blurRadius: 6),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
          ],
        ),

        // Floating Simulation & Track Controller
        Positioned(
          top: 16,
          right: 16,
          child: Row(
            children: [
              ElevatedButton.icon(
                onPressed: _toggleSimulation,
                icon: AppSvgIcon(
                  icon: _isSimulatingMovement ? AppSvgIcon.warning : AppSvgIcon.navigation,
                  size: 16,
                  color: Colors.white,
                ),
                label: Text(_isSimulatingMovement ? "Stop GPS Sim" : "Simulate Live GPS"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _isSimulatingMovement ? AppTheme.warning : AppTheme.surface,
                  foregroundColor: Colors.white,
                  side: const BorderSide(color: AppTheme.surfaceElevated),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: AppTheme.surface.withValues(alpha: 0.95),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: AppTheme.surfaceElevated),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 4,
                      backgroundColor: _isDeviated ? AppTheme.error : AppTheme.success,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      _isDeviated ? "Deviated" : "On Schedule",
                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDetailsAndQueuePanel() {
    final activeNode = _getActiveNode();
    final isArrived = activeNode?.nodeStatus == 'arrived';
    final isDelivered = activeNode?.nodeStatus == 'delivered';

    return Container(
      color: AppTheme.surface,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Current Destination Banner
          if (activeNode != null)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: AppTheme.background,
                border: Border(bottom: BorderSide(color: AppTheme.surfaceElevated, width: 1)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          AppSvgIcon(icon: AppSvgIcon.mapPin, size: 18, color: AppTheme.primary),
                          SizedBox(width: 8),
                          Text(
                            "Next Target Stop",
                            style: TextStyle(color: AppTheme.textSecondary, fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: isArrived
                              ? AppTheme.warning.withValues(alpha: 0.15)
                              : AppTheme.primary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          isArrived ? "INSIDE 100m GEOFENCE" : "STOP #${activeNode.sequenceIndex + 1}",
                          style: TextStyle(
                            color: isArrived ? AppTheme.warning : AppTheme.primaryHover,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    activeNode.address,
                    style: const TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            if (isArrived) {
                              _updateNodeStatus(activeNode.id, "delivered");
                            } else {
                              _updateNodeStatus(activeNode.id, "arrived");
                            }
                          },
                          icon: AppSvgIcon(
                            icon: isArrived ? AppSvgIcon.checkCircle : AppSvgIcon.navigation,
                            size: 16,
                            color: Colors.white,
                          ),
                          label: Text(isArrived ? "Confirm Delivery" : "Mark Arrived"),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: isArrived ? AppTheme.success : AppTheme.primary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      OutlinedButton.icon(
                        onPressed: () => _updateNodeStatus(activeNode.id, "skipped"),
                        icon: const AppSvgIcon(icon: AppSvgIcon.trash, size: 14, color: AppTheme.error),
                        label: const Text("Skip"),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.error,
                          side: const BorderSide(color: AppTheme.error),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

          // Stop Sequence List
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  "Delivery Manifest Sequence",
                  style: TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.bold),
                ),
                Text(
                  "${_trip!.nodes.where((n) => n.nodeStatus == 'delivered').length}/${_trip!.nodes.length} Completed",
                  style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                ),
              ],
            ),
          ),

          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: _trip!.nodes.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (context, index) {
                final node = _trip!.nodes[index];
                final isDelivered = node.nodeStatus == 'delivered';
                final isArrived = node.nodeStatus == 'arrived';
                final isSkipped = node.nodeStatus == 'skipped';

                Color statusColor = AppTheme.primary;
                String statusLabel = "Pending";
                if (isDelivered) {
                  statusColor = AppTheme.success;
                  statusLabel = "Delivered";
                } else if (isArrived) {
                  statusColor = AppTheme.warning;
                  statusLabel = "At Geofence";
                } else if (isSkipped) {
                  statusColor = AppTheme.error;
                  statusLabel = "Skipped";
                }

                return Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.background,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isArrived ? AppTheme.warning.withValues(alpha: 0.5) : AppTheme.surfaceElevated,
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            "${node.sequenceIndex + 1}",
                            style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              node.address,
                              style: TextStyle(
                                color: isDelivered ? AppTheme.textMuted : AppTheme.textPrimary,
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                decoration: isDelivered ? TextDecoration.lineThrough : null,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              "Lat: ${node.latitude.toStringAsFixed(4)}, Lon: ${node.longitude.toStringAsFixed(4)}",
                              style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          statusLabel,
                          style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const AppSvgIcon(icon: AppSvgIcon.route, size: 48, color: AppTheme.textMuted),
          const SizedBox(height: 16),
          const Text(
            "No Active Trip Found",
            style: TextStyle(color: AppTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            "Dispatch a new route or initialize demo data.",
            style: TextStyle(color: AppTheme.textSecondary, fontSize: 14),
          ),
          const SizedBox(height: 20),
          ElevatedButton(
            onPressed: _loadTripData,
            child: const Text("Load Active Trip"),
          ),
        ],
      ),
    );
  }
}
