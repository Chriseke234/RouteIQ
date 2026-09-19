import 'dart:math';
import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_svg_icons.dart';
import '../../../../core/offline/local_storage_service.dart';
import '../../../trip/domain/entities/trip.dart';

class RouteOptimizerPage extends StatefulWidget {
  final VoidCallback onRouteApplied;

  const RouteOptimizerPage({super.key, required this.onRouteApplied});

  @override
  State<RouteOptimizerPage> createState() => _RouteOptimizerPageState();
}

class _RouteOptimizerPageState extends State<RouteOptimizerPage> {
  final List<TripNodeEntity> _currentStops = [];
  bool _isOptimizing = false;
  bool _isOptimized = false;
  double _originalDistanceKm = 84.5;
  double _optimizedDistanceKm = 52.8;
  double _dieselSavedLiters = 11.2;
  int _timeSavedMinutes = 48;

  final _newAddressController = TextEditingController();
  final _newLatController = TextEditingController();
  final _newLonController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadInitialStops();
  }

  @override
  void dispose() {
    _newAddressController.dispose();
    _newLatController.dispose();
    _newLonController.dispose();
    super.dispose();
  }

  Future<void> _loadInitialStops() async {
    final trip = await LocalStorageService.getActiveTrip();
    if (trip != null && trip.nodes.isNotEmpty) {
      setState(() {
        _currentStops.clear();
        _currentStops.addAll(trip.nodes);
        _calculateBaselineMetrics();
      });
    }
  }

  void _calculateBaselineMetrics() {
    if (_currentStops.length < 2) {
      _originalDistanceKm = 0;
      return;
    }
    double total = 0;
    for (int i = 0; i < _currentStops.length - 1; i++) {
      total += _haversineDistance(
        _currentStops[i].latitude,
        _currentStops[i].longitude,
        _currentStops[i + 1].latitude,
        _currentStops[i + 1].longitude,
      );
    }
    _originalDistanceKm = total;
  }

  double _haversineDistance(double lat1, double lon1, double lat2, double lon2) {
    const r = 6371.0; // Earth radius in km
    final dLat = (lat2 - lat1) * (pi / 180.0);
    final dLon = (lon2 - lon1) * (pi / 180.0);
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1 * (pi / 180.0)) * cos(lat2 * (pi / 180.0)) * sin(dLon / 2) * sin(dLon / 2);
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return r * c;
  }

  Future<void> _runOptimization() async {
    if (_currentStops.length < 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Please have at least 3 stops to optimize route ordering.")),
      );
      return;
    }

    setState(() => _isOptimizing = true);
    await Future.delayed(const Duration(milliseconds: 900));

    // Nearest Neighbor TSP Heuristic Solver
    final List<TripNodeEntity> unvisited = List.from(_currentStops);
    final List<TripNodeEntity> optimized = [];

    // Keep origin
    var current = unvisited.removeAt(0);
    optimized.add(current);

    while (unvisited.isNotEmpty) {
      int nearestIndex = 0;
      double shortestDist = double.infinity;

      for (int i = 0; i < unvisited.length; i++) {
        final dist = _haversineDistance(
          current.latitude,
          current.longitude,
          unvisited[i].latitude,
          unvisited[i].longitude,
        );
        if (dist < shortestDist) {
          shortestDist = dist;
          nearestIndex = i;
        }
      }

      current = unvisited.removeAt(nearestIndex);
      optimized.add(current);
    }

    // Recalculate sequences
    final List<TripNodeEntity> updatedList = optimized.asMap().entries.map<TripNodeEntity>((e) {
      return e.value.copyWith(sequenceIndex: e.key);
    }).toList();

    double optimizedTotal = 0;
    for (int i = 0; i < updatedList.length - 1; i++) {
      optimizedTotal += _haversineDistance(
        updatedList[i].latitude,
        updatedList[i].longitude,
        updatedList[i + 1].latitude,
        updatedList[i + 1].longitude,
      );
    }

    final savedKm = max(0.0, _originalDistanceKm - optimizedTotal);
    final savedLiters = savedKm * 0.35; // 35L per 100km fleet consumption
    final savedMins = (savedKm * 2.2).toInt();

    setState(() {
      _currentStops.clear();
      _currentStops.addAll(updatedList);
      _optimizedDistanceKm = optimizedTotal;
      _dieselSavedLiters = savedLiters;
      _timeSavedMinutes = savedMins;
      _isOptimized = true;
      _isOptimizing = false;
    });
  }

  Future<void> _applyToActiveTrip() async {
    final trip = await LocalStorageService.getActiveTrip();
    if (trip != null) {
      final updatedTrip = trip.copyWith(
        nodes: _currentStops,
        vectorClockClient: trip.vectorClockClient + 1,
      );
      await LocalStorageService.saveActiveTrip(updatedTrip);
      widget.onRouteApplied();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: AppTheme.success,
            content: Text("Best route sent to driver!"),
          ),
        );
      }
    }
  }

  void _showAddStopDialog() {
    _newAddressController.text = "Victoria Island Tech Park, Lagos";
    _newLatController.text = "6.4281";
    _newLonController.text = "3.4219";

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppTheme.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            AppSvgIcon(icon: AppSvgIcon.plus, size: 20, color: AppTheme.primary),
            SizedBox(width: 8),
            Text("Add Delivery Stop", style: TextStyle(fontSize: 18, color: Colors.white)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _newAddressController,
              decoration: const InputDecoration(labelText: "Stop Address"),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _newLatController,
                    decoration: const InputDecoration(labelText: "Latitude"),
                    keyboardType: TextInputType.number,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _newLonController,
                    decoration: const InputDecoration(labelText: "Longitude"),
                    keyboardType: TextInputType.number,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text("Cancel", style: TextStyle(color: AppTheme.textSecondary)),
          ),
          ElevatedButton(
            onPressed: () {
              final lat = double.tryParse(_newLatController.text.trim()) ?? 6.45;
              final lon = double.tryParse(_newLonController.text.trim()) ?? 3.40;
              final newStop = TripNodeEntity(
                id: "N-${DateTime.now().millisecondsSinceEpoch}",
                tripId: "TRP-8842",
                sequenceIndex: _currentStops.length,
                nodeStatus: "pending",
                address: _newAddressController.text.trim(),
                latitude: lat,
                longitude: lon,
              );
              setState(() {
                _currentStops.add(newStop);
                _isOptimized = false;
                _calculateBaselineMetrics();
              });
              Navigator.pop(ctx);
            },
            child: const Text("Add Stop"),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isDesktop = constraints.maxWidth >= 960;

        return SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header Card
              _buildOptimizerHeader(),
              const SizedBox(height: 24),

              // KPI Savings Cards
              _buildSavingsKpiGrid(isDesktop: isDesktop),
              const SizedBox(height: 24),

              // Stop Manifest Reordering Section
              _buildStopsEditorSection(),
            ],
          ),
        );
      },
    );
  }

  Widget _buildOptimizerHeader() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.surfaceElevated),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    AppSvgIcon(icon: AppSvgIcon.sparkle, size: 20, color: AppTheme.primaryHover),
                    SizedBox(width: 8),
                    Text(
                      "Smart Route Planner",
                      style: TextStyle(color: AppTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                SizedBox(height: 6),
                Text(
                  "Finds the quickest, most affordable route for all your delivery stops to save fuel and cut road time.",
                  style: TextStyle(color: AppTheme.textSecondary, fontSize: 13),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Row(
            children: [
              OutlinedButton.icon(
                onPressed: _showAddStopDialog,
                icon: const AppSvgIcon(icon: AppSvgIcon.plus, size: 16, color: AppTheme.primary),
                label: const Text("Add Stop"),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppTheme.primary),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
              const SizedBox(width: 12),
              ElevatedButton.icon(
                onPressed: _isOptimizing ? null : _runOptimization,
                icon: _isOptimizing
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const AppSvgIcon(icon: AppSvgIcon.sparkle, size: 16, color: Colors.white),
                label: Text(_isOptimizing ? "Finding Best Route..." : "Find Best Route"),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSavingsKpiGrid({required bool isDesktop}) {
    final percentReduction = _originalDistanceKm > 0
        ? (((_originalDistanceKm - _optimizedDistanceKm) / _originalDistanceKm) * 100).clamp(0, 100).toStringAsFixed(1)
        : "37.5";

    return GridView.count(
      crossAxisCount: isDesktop ? 4 : 2,
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: isDesktop ? 1.8 : 1.4,
      children: [
        _buildMetricCard(
          title: "Fuel Saved",
          value: "-$percentReduction%",
          subtitle: "Target: 35-40% Fuel Cut",
          icon: AppSvgIcon.fuel,
          accentColor: AppTheme.success,
        ),
        _buildMetricCard(
          title: "Total Distance",
          value: "${_optimizedDistanceKm.toStringAsFixed(1)} km",
          subtitle: "Before: ${_originalDistanceKm.toStringAsFixed(1)} km",
          icon: AppSvgIcon.route,
          accentColor: AppTheme.primary,
        ),
        _buildMetricCard(
          title: "Fuel Saved (Liters)",
          value: "${_dieselSavedLiters.toStringAsFixed(1)} L",
          subtitle: "Est. Savings: ₦${(_dieselSavedLiters * 1350).toStringAsFixed(0)}",
          icon: AppSvgIcon.sparkle,
          accentColor: AppTheme.warning,
        ),
        _buildMetricCard(
          title: "Driving Time Saved",
          value: "$_timeSavedMinutes mins",
          subtitle: "Fewer hours stuck in traffic",
          icon: AppSvgIcon.clock,
          accentColor: const Color(0xFFA855F7), // Purple
        ),
      ],
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required String subtitle,
    required String icon,
    required Color accentColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppTheme.surfaceElevated),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12, fontWeight: FontWeight.w600)),
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: accentColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: AppSvgIcon(icon: icon, size: 16, color: accentColor),
              ),
            ],
          ),
          Text(
            value,
            style: TextStyle(color: AppTheme.textPrimary, fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.5),
          ),
          Text(subtitle, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
        ],
      ),
    );
  }

  Widget _buildStopsEditorSection() {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.surfaceElevated),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "Today's Delivery Stops",
                    style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    "Drag stops to change order, or click 'Send Route to Driver' to start.",
                    style: const TextStyle(color: AppTheme.textMuted, fontSize: 12),
                  ),
                ],
              ),
              if (_isOptimized)
                ElevatedButton.icon(
                  onPressed: _applyToActiveTrip,
                  icon: const AppSvgIcon(icon: AppSvgIcon.checkCircle, size: 16, color: Colors.white),
                  label: const Text("Send Route to Driver"),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.success,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),

          ReorderableListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _currentStops.length,
            onReorder: (oldIndex, newIndex) {
              setState(() {
                if (newIndex > oldIndex) newIndex -= 1;
                final item = _currentStops.removeAt(oldIndex);
                _currentStops.insert(newIndex, item);
                _isOptimized = false;
                _calculateBaselineMetrics();
              });
            },
            itemBuilder: (context, index) {
              final stop = _currentStops[index];
              return Container(
                key: ValueKey(stop.id),
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.background,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppTheme.surfaceElevated),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.drag_handle, color: AppTheme.textMuted, size: 20),
                    const SizedBox(width: 12),
                    Container(
                      width: 28,
                      height: 28,
                      decoration: BoxDecoration(
                        color: AppTheme.primary.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          "${index + 1}",
                          style: const TextStyle(color: AppTheme.primaryHover, fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            stop.address,
                            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            "Coordinates: ${stop.latitude.toStringAsFixed(4)}, ${stop.longitude.toStringAsFixed(4)}",
                            style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const AppSvgIcon(icon: AppSvgIcon.trash, size: 16, color: AppTheme.error),
                      onPressed: () {
                        if (_currentStops.length <= 2) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text("A trip requires at least 2 stops.")),
                          );
                          return;
                        }
                        setState(() {
                          _currentStops.removeAt(index);
                          _isOptimized = false;
                          _calculateBaselineMetrics();
                        });
                      },
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
