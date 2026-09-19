import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_svg_icons.dart';

class VehicleItem {
  final String id;
  final String name;
  final String type;
  final String driver;
  final String status; // 'in_transit', 'delivering', 'idle'
  final int batteryLevel;
  final int speedKph;
  final String imageUrl;
  final double fuelSavedPercent;

  const VehicleItem({
    required this.id,
    required this.name,
    required this.type,
    required this.driver,
    required this.status,
    required this.batteryLevel,
    required this.speedKph,
    required this.imageUrl,
    required this.fuelSavedPercent,
  });
}

class FleetAnalyticsPage extends StatefulWidget {
  const FleetAnalyticsPage({super.key});

  @override
  State<FleetAnalyticsPage> createState() => _FleetAnalyticsPageState();
}

class _FleetAnalyticsPageState extends State<FleetAnalyticsPage> {
  String _selectedFilter = 'all';

  final List<VehicleItem> _vehicles = const [
    VehicleItem(
      id: "FLT-LAG-402",
      name: "Mercedes Actros 3340",
      type: "Heavy Haul Rigid",
      driver: "Alex Johnson (DRV-104)",
      status: "in_transit",
      batteryLevel: 94,
      speedKph: 68,
      imageUrl: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80",
      fuelSavedPercent: 38.4,
    ),
    VehicleItem(
      id: "FLT-LAG-815",
      name: "Isuzu NPR 75L",
      type: "Urban Box Truck",
      driver: "Tunde Bakare (DRV-88)",
      status: "delivering",
      batteryLevel: 82,
      speedKph: 0,
      imageUrl: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=600&q=80",
      fuelSavedPercent: 36.1,
    ),
    VehicleItem(
      id: "FLT-ABJ-319",
      name: "Ford Transit High-Roof",
      type: "Express Delivery Van",
      driver: "Emeka Okafor (DRV-72)",
      status: "in_transit",
      batteryLevel: 88,
      speedKph: 54,
      imageUrl: "https://images.unsplash.com/photo-1559297434-fae8a1916a79?auto=format&fit=crop&w=600&q=80",
      fuelSavedPercent: 41.2,
    ),
    VehicleItem(
      id: "FLT-PHC-109",
      name: "Scania R500 V8",
      type: "Interstate Semi-Trailer",
      driver: "Musa Ibrahim (DRV-115)",
      status: "idle",
      batteryLevel: 100,
      speedKph: 0,
      imageUrl: "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80",
      fuelSavedPercent: 35.8,
    ),
    VehicleItem(
      id: "FLT-KAN-501",
      name: "Volvo FH16 Aero",
      type: "Long-Haul Freight Hauler",
      driver: "Kayode Adeleke (DRV-120)",
      status: "in_transit",
      batteryLevel: 91,
      speedKph: 62,
      imageUrl: "https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=600&q=80",
      fuelSavedPercent: 39.5,
    ),
    VehicleItem(
      id: "FLT-IBD-220",
      name: "Mercedes Sprinter 319",
      type: "High-Priority Parcel Van",
      driver: "Samuel Osei (DRV-133)",
      status: "delivering",
      batteryLevel: 85,
      speedKph: 0,
      imageUrl: "https://images.unsplash.com/photo-1592838064575-70ed626d3a0e?auto=format&fit=crop&w=600&q=80",
      fuelSavedPercent: 42.1,
    ),
    VehicleItem(
      id: "FLT-ABJ-770",
      name: "MAN TGX 26.540",
      type: "Heavy Inter-City Freight",
      driver: "Usman Danjuma (DRV-142)",
      status: "in_transit",
      batteryLevel: 96,
      speedKph: 71,
      imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80",
      fuelSavedPercent: 37.0,
    ),
    VehicleItem(
      id: "FLT-LAG-614",
      name: "Iveco Daily 35S18",
      type: "Urban Logistics Courier",
      driver: "Babatunde Lawal (DRV-158)",
      status: "in_transit",
      batteryLevel: 89,
      speedKph: 48,
      imageUrl: "https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=600&q=80",
      fuelSavedPercent: 38.9,
    ),
    VehicleItem(
      id: "FLT-ENUG-305",
      name: "DAF XF 480 Super Space",
      type: "Regional Distribution Rigid",
      driver: "Chinedu Eze (DRV-165)",
      status: "delivering",
      batteryLevel: 78,
      speedKph: 0,
      imageUrl: "https://images.unsplash.com/photo-1513828583688-c52646db42da?auto=format&fit=crop&w=600&q=80",
      fuelSavedPercent: 40.3,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isDesktop = constraints.maxWidth >= 1024;

        final filteredVehicles = _vehicles.where((v) {
          if (_selectedFilter == 'all') return true;
          return v.status == _selectedFilter;
        }).toList();

        return SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // KPI Overview Grid
              _buildKpiOverview(isDesktop: isDesktop),
              const SizedBox(height: 24),

              // Filter Tabs & Controls
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "Fleet Operations & Live Telemetry",
                        style: TextStyle(color: AppTheme.textPrimary, fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        "Real-time GPS telemetry, battery levels, and route savings per vehicle.",
                        style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
                      ),
                    ],
                  ),
                  _buildFilterSegment(),
                ],
              ),
              const SizedBox(height: 16),

              // Vehicle Grid / List
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: filteredVehicles.length,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: isDesktop ? 2 : 1,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  childAspectRatio: isDesktop ? 2.2 : 1.4,
                ),
                itemBuilder: (context, index) {
                  return _buildVehicleCard(filteredVehicles[index]);
                },
              ),
              const SizedBox(height: 24),

              // Recent Trip History Log
              _buildTripHistoryLog(),
            ],
          ),
        );
      },
    );
  }

  Widget _buildKpiOverview({required bool isDesktop}) {
    return GridView.count(
      crossAxisCount: isDesktop ? 4 : 2,
      crossAxisSpacing: 16,
      mainAxisSpacing: 16,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: isDesktop ? 1.8 : 1.4,
      children: [
        _buildStatCard(
          title: "Active Fleet Units",
          value: "28 / 32",
          subtitle: "87.5% Fleet Utilization",
          icon: AppSvgIcon.truck,
          accentColor: AppTheme.primary,
        ),
        _buildStatCard(
          title: "Diesel Fuel Saved",
          value: "37.8%",
          subtitle: "₦4,820,000 Saved this month",
          icon: AppSvgIcon.fuel,
          accentColor: AppTheme.success,
        ),
        _buildStatCard(
          title: "Total Distance Tracked",
          value: "14,920 km",
          subtitle: "100% Vector Clock Synced",
          icon: AppSvgIcon.route,
          accentColor: AppTheme.warning,
        ),
        _buildStatCard(
          title: "On-Time Dispatch Rate",
          value: "98.4%",
          subtitle: "Average 100m Geofence Stop",
          icon: AppSvgIcon.checkCircle,
          accentColor: const Color(0xFFA855F7),
        ),
      ],
    );
  }

  Widget _buildStatCard({
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
            style: const TextStyle(color: AppTheme.textPrimary, fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.5),
          ),
          Text(subtitle, style: const TextStyle(color: AppTheme.textMuted, fontSize: 11)),
        ],
      ),
    );
  }

  Widget _buildFilterSegment() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppTheme.surfaceElevated),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildFilterButton("all", "All Units"),
          _buildFilterButton("in_transit", "In Transit"),
          _buildFilterButton("delivering", "Delivering"),
          _buildFilterButton("idle", "Idle"),
        ],
      ),
    );
  }

  Widget _buildFilterButton(String key, String label) {
    final isSelected = _selectedFilter == key;
    return InkWell(
      onTap: () => setState(() => _selectedFilter = key),
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : AppTheme.textSecondary,
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          ),
        ),
      ),
    );
  }

  Widget _buildVehicleCard(VehicleItem v) {
    Color statusColor = AppTheme.success;
    String statusLabel = "In Transit";
    if (v.status == 'delivering') {
      statusColor = AppTheme.warning;
      statusLabel = "At Geofence Stop";
    } else if (v.status == 'idle') {
      statusColor = AppTheme.textMuted;
      statusLabel = "Depot Idle";
    }

    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.surfaceElevated),
      ),
      clipBehavior: Clip.antiAlias,
      child: Row(
        children: [
          // Real Unsplash vehicle image
          SizedBox(
            width: 140,
            height: double.infinity,
            child: Stack(
              fit: StackFit.expand,
              children: [
                Image.network(v.imageUrl, fit: BoxFit.cover),
                Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                      colors: [Colors.transparent, AppTheme.surface.withValues(alpha: 0.9)],
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        v.id,
                        style: const TextStyle(color: AppTheme.primaryHover, fontSize: 13, fontWeight: FontWeight.bold),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: statusColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          statusLabel,
                          style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  Text(
                    v.name,
                    style: const TextStyle(color: AppTheme.textPrimary, fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    "Driver: ${v.driver}",
                    style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
                  ),
                  const Divider(height: 12, color: AppTheme.surfaceElevated),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const AppSvgIcon(icon: AppSvgIcon.speed, size: 14, color: AppTheme.primary),
                          const SizedBox(width: 4),
                          Text("${v.speedKph} km/h", style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                        ],
                      ),
                      Row(
                        children: [
                          const AppSvgIcon(icon: AppSvgIcon.battery, size: 14, color: AppTheme.success),
                          const SizedBox(width: 4),
                          Text("${v.batteryLevel}%", style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                        ],
                      ),
                      Row(
                        children: [
                          const AppSvgIcon(icon: AppSvgIcon.fuel, size: 14, color: AppTheme.warning),
                          const SizedBox(width: 4),
                          Text("-${v.fuelSavedPercent}%", style: const TextStyle(color: AppTheme.warning, fontSize: 12, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTripHistoryLog() {
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
          const Text(
            "Recent Fleet Trip Manifests & Dispatches",
            style: TextStyle(color: AppTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          _buildTripHistoryRow(
            tripId: "TRP-8841",
            corridor: "Ikeja Hub → Apapa Port Terminal",
            stops: "8 Stops",
            distance: "64.2 km",
            fuelSaved: "-39.1%",
            status: "Completed",
          ),
          const Divider(height: 16, color: AppTheme.surfaceElevated),
          _buildTripHistoryRow(
            tripId: "TRP-8840",
            corridor: "Victoria Island → Lekki Expressway Corridor",
            stops: "12 Stops",
            distance: "98.5 km",
            fuelSaved: "-37.4%",
            status: "Completed",
          ),
          const Divider(height: 16, color: AppTheme.surfaceElevated),
          _buildTripHistoryRow(
            tripId: "TRP-8839",
            corridor: "Oshodi Freight Depot → Alaba Int'l Market",
            stops: "6 Stops",
            distance: "42.0 km",
            fuelSaved: "-40.8%",
            status: "Completed",
          ),
        ],
      ),
    );
  }

  Widget _buildTripHistoryRow({
    required String tripId,
    required String corridor,
    required String stops,
    required String distance,
    required String fuelSaved,
    required String status,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppTheme.primary.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const AppSvgIcon(icon: AppSvgIcon.route, size: 18, color: AppTheme.primary),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                corridor,
                style: const TextStyle(color: AppTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 2),
              Text(
                "$tripId • $stops • $distance",
                style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: AppTheme.success.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(
            fuelSaved,
            style: const TextStyle(color: AppTheme.success, fontSize: 11, fontWeight: FontWeight.bold),
          ),
        ),
      ],
    );
  }
}
