import 'package:flutter/material.dart';
import '../../../../core/widgets/responsive_layout.dart';
import '../../../navigation/presentation/pages/trip_navigation_page.dart';
import '../../../optimizer/presentation/pages/route_optimizer_page.dart';
import '../../../analytics/presentation/pages/fleet_analytics_page.dart';

class TripPage extends StatefulWidget {
  const TripPage({super.key});

  @override
  State<TripPage> createState() => _TripPageState();
}

class _TripPageState extends State<TripPage> {
  NavSection _currentSection = NavSection.navigation;
  Key _navKey = UniqueKey();

  void _onSectionChanged(NavSection section) {
    setState(() {
      _currentSection = section;
    });
  }

  void _onRouteApplied() {
    setState(() {
      _currentSection = NavSection.navigation;
      _navKey = UniqueKey(); // Refresh navigation map view with new sequence
    });
  }

  String get _title {
    switch (_currentSection) {
      case NavSection.navigation:
        return "Live Route & Navigation";
      case NavSection.optimizer:
        return "AI Route Optimizer";
      case NavSection.analytics:
        return "Fleet Operations Hub";
    }
  }

  Widget get _currentBody {
    switch (_currentSection) {
      case NavSection.navigation:
        return TripNavigationPage(key: _navKey);
      case NavSection.optimizer:
        return RouteOptimizerPage(onRouteApplied: _onRouteApplied);
      case NavSection.analytics:
        return const FleetAnalyticsPage();
    }
  }

  @override
  Widget build(BuildContext context) {
    return ResponsiveScaffold(
      currentSection: _currentSection,
      onSectionChanged: _onSectionChanged,
      title: _title,
      body: _currentBody,
    );
  }
}
