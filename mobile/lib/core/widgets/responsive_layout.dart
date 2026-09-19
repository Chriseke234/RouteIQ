import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/app_theme.dart';
import 'app_svg_icons.dart';
import '../offline/local_storage_service.dart';
import '../../features/auth/presentation/pages/auth_page.dart';

enum NavSection {
  navigation,
  optimizer,
  analytics,
}

/// Unified responsive layout container supporting Desktop, Tablet, and Mobile.
class ResponsiveScaffold extends ConsumerStatefulWidget {
  final NavSection currentSection;
  final Widget body;
  final ValueChanged<NavSection> onSectionChanged;
  final String title;
  final List<Widget>? actions;

  const ResponsiveScaffold({
    super.key,
    required this.currentSection,
    required this.body,
    required this.onSectionChanged,
    required this.title,
    this.actions,
  });

  @override
  ConsumerState<ResponsiveScaffold> createState() => _ResponsiveScaffoldState();
}

class _ResponsiveScaffoldState extends ConsumerState<ResponsiveScaffold> {
  String _userRole = 'Dispatcher';
  String _userEmail = 'fleet.manager@routeiq.io';

  @override
  void initState() {
    super.initState();
    _loadUserInfo();
  }

  Future<void> _loadUserInfo() async {
    final role = await LocalStorageService.getUserRole();
    final email = await LocalStorageService.getUserEmail();
    if (mounted) {
      setState(() {
        _userRole = role == 'manager' ? 'Fleet Dispatcher' : 'Lead Driver';
        if (email != null && email.isNotEmpty) {
          _userEmail = email;
        }
      });
    }
  }

  Future<void> _handleLogout() async {
    await LocalStorageService.clearSession();
    if (mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const AuthPage()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isDesktop = constraints.maxWidth >= 1100;
        final isTablet = constraints.maxWidth >= 650 && constraints.maxWidth < 1100;

        if (isDesktop || isTablet) {
          return Scaffold(
            backgroundColor: AppTheme.background,
            body: Row(
              children: [
                _buildSidebar(isDesktop: isDesktop),
                Expanded(
                  child: Column(
                    children: [
                      _buildTopHeader(isDesktop: isDesktop),
                      Expanded(child: widget.body),
                    ],
                  ),
                ),
              ],
            ),
          );
        } else {
          // Mobile Layout
          return Scaffold(
            backgroundColor: AppTheme.background,
            appBar: AppBar(
              backgroundColor: AppTheme.surface,
              title: Text(
                widget.title,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              actions: [
                ...?widget.actions,
                IconButton(
                  icon: const AppSvgIcon(icon: AppSvgIcon.logout, size: 18, color: AppTheme.textSecondary),
                  onPressed: _handleLogout,
                  tooltip: "Logout",
                )
              ],
            ),
            body: widget.body,
            bottomNavigationBar: Container(
              decoration: const BoxDecoration(
                color: AppTheme.surface,
                border: Border(top: BorderSide(color: AppTheme.surfaceElevated, width: 1)),
              ),
              child: BottomNavigationBar(
                currentIndex: widget.currentSection.index,
                onTap: (index) => widget.onSectionChanged(NavSection.values[index]),
                backgroundColor: Colors.transparent,
                elevation: 0,
                selectedItemColor: AppTheme.primary,
                unselectedItemColor: AppTheme.textMuted,
                type: BottomNavigationBarType.fixed,
                selectedFontSize: 12,
                unselectedFontSize: 11,
                items: const [
                  BottomNavigationBarItem(
                    icon: Padding(
                      padding: EdgeInsets.only(bottom: 4),
                      child: AppSvgIcon(icon: AppSvgIcon.navigation, size: 20, color: AppTheme.textMuted),
                    ),
                    activeIcon: Padding(
                      padding: EdgeInsets.only(bottom: 4),
                      child: AppSvgIcon(icon: AppSvgIcon.navigation, size: 20, color: AppTheme.primary),
                    ),
                    label: "Live Map",
                  ),
                  BottomNavigationBarItem(
                    icon: Padding(
                      padding: EdgeInsets.only(bottom: 4),
                      child: AppSvgIcon(icon: AppSvgIcon.route, size: 20, color: AppTheme.textMuted),
                    ),
                    activeIcon: Padding(
                      padding: EdgeInsets.only(bottom: 4),
                      child: AppSvgIcon(icon: AppSvgIcon.route, size: 20, color: AppTheme.primary),
                    ),
                    label: "Route Planner",
                  ),
                  BottomNavigationBarItem(
                    icon: Padding(
                      padding: EdgeInsets.only(bottom: 4),
                      child: AppSvgIcon(icon: AppSvgIcon.analytics, size: 20, color: AppTheme.textMuted),
                    ),
                    activeIcon: Padding(
                      padding: EdgeInsets.only(bottom: 4),
                      child: AppSvgIcon(icon: AppSvgIcon.analytics, size: 20, color: AppTheme.primary),
                    ),
                    label: "Trucks & Team",
                  ),
                ],
              ),
            ),
          );
        }
      },
    );
  }

  Widget _buildTopHeader({required bool isDesktop}) {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 24),
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        border: Border(bottom: BorderSide(color: AppTheme.surfaceElevated, width: 1)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Text(
                widget.title,
                style: const TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(width: 16),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.success.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppTheme.success.withValues(alpha: 0.3)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircleAvatar(radius: 3, backgroundColor: AppTheme.success),
                    SizedBox(width: 6),
                    Text(
                      "PWA Active • Live Online",
                      style: TextStyle(color: AppTheme.success, fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ],
          ),
          Row(
            children: [
              ...?widget.actions,
              const SizedBox(width: 8),
              IconButton(
                icon: const AppSvgIcon(icon: AppSvgIcon.logout, size: 18, color: AppTheme.textSecondary),
                onPressed: _handleLogout,
                tooltip: "Logout",
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSidebar({required bool isDesktop}) {
    final width = isDesktop ? 260.0 : 80.0;

    return Container(
      width: width,
      height: double.infinity,
      decoration: const BoxDecoration(
        color: AppTheme.surface,
        border: Border(right: BorderSide(color: AppTheme.surfaceElevated, width: 1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Brand
          Container(
            height: 64,
            padding: EdgeInsets.symmetric(horizontal: isDesktop ? 20 : 16),
            alignment: Alignment.centerLeft,
            child: Row(
              mainAxisAlignment: isDesktop ? MainAxisAlignment.start : MainAxisAlignment.center,
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppTheme.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3)),
                  ),
                  padding: const EdgeInsets.all(8),
                  child: const AppSvgIcon(
                    icon: AppSvgIcon.route,
                    color: AppTheme.primary,
                    size: 20,
                  ),
                ),
                if (isDesktop) ...[
                  const SizedBox(width: 12),
                  const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "RouteIQ",
                        style: TextStyle(
                          color: AppTheme.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          letterSpacing: -0.5,
                        ),
                      ),
                      Text(
                        "Smart Delivery Logistics",
                        style: TextStyle(
                          color: AppTheme.textMuted,
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Nav Items
          Padding(
            padding: EdgeInsets.symmetric(horizontal: isDesktop ? 12 : 8),
            child: Column(
              children: [
                _buildNavItem(
                  section: NavSection.navigation,
                  icon: AppSvgIcon.navigation,
                  title: "Live Driver Map",
                  isDesktop: isDesktop,
                ),
                const SizedBox(height: 6),
                _buildNavItem(
                  section: NavSection.optimizer,
                  icon: AppSvgIcon.route,
                  title: "Smart Route Planner",
                  isDesktop: isDesktop,
                ),
                const SizedBox(height: 6),
                _buildNavItem(
                  section: NavSection.analytics,
                  icon: AppSvgIcon.analytics,
                  title: "Trucks & Team Hub",
                  isDesktop: isDesktop,
                ),
              ],
            ),
          ),

          const Spacer(),

          // User Card
          Container(
            margin: EdgeInsets.all(isDesktop ? 12 : 8),
            padding: EdgeInsets.all(isDesktop ? 12 : 8),
            decoration: BoxDecoration(
              color: AppTheme.background,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.surfaceElevated),
            ),
            child: Row(
              children: [
                // Real Unsplash Avatar
                ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: Image.network(
                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80",
                    width: 36,
                    height: 36,
                    fit: BoxFit.cover,
                  ),
                ),
                if (isDesktop) ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _userRole,
                          style: const TextStyle(
                            color: AppTheme.textPrimary,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          _userEmail,
                          style: const TextStyle(
                            color: AppTheme.textMuted,
                            fontSize: 11,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildNavItem({
    required NavSection section,
    required String icon,
    required String title,
    required bool isDesktop,
  }) {
    final isSelected = widget.currentSection == section;

    return InkWell(
      onTap: () => widget.onSectionChanged(section),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: EdgeInsets.symmetric(horizontal: isDesktop ? 14 : 10, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary.withValues(alpha: 0.12) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? AppTheme.primary.withValues(alpha: 0.3) : Colors.transparent,
          ),
        ),
        child: Row(
          mainAxisAlignment: isDesktop ? MainAxisAlignment.start : MainAxisAlignment.center,
          children: [
            AppSvgIcon(
              icon: icon,
              size: 20,
              color: isSelected ? AppTheme.primary : AppTheme.textSecondary,
            ),
            if (isDesktop) ...[
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    color: isSelected ? AppTheme.textPrimary : AppTheme.textSecondary,
                    fontSize: 13,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
