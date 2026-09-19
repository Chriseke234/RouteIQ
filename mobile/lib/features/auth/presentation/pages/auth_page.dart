import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/app_svg_icons.dart';
import '../../../../core/config/supabase_config.dart';
import '../../../../core/offline/local_storage_service.dart';
import '../../../trip/presentation/pages/trip_page.dart';

class AuthPage extends StatefulWidget {
  const AuthPage({super.key});

  @override
  State<AuthPage> createState() => _AuthPageState();
}

class _AuthPageState extends State<AuthPage> {
  final _emailController = TextEditingController(text: "dispatcher@routeiq.io");
  final _passwordController = TextEditingController(text: "DemoPass123!");
  final _fullNameController = TextEditingController(text: "Alex Johnson");
  
  bool _isSignUp = false;
  bool _isLoading = false;
  String _selectedRole = 'manager'; // 'manager' (Dispatcher) or 'driver'
  String? _errorMessage;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _fullNameController.dispose();
    super.dispose();
  }

  Future<void> _handleAuth() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    final fullName = _fullNameController.text.trim();

    if (email.isEmpty || password.isEmpty || (_isSignUp && fullName.isEmpty)) {
      setState(() {
        _errorMessage = "Please fill in all required credentials.";
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final supabase = SupabaseConfig.client;

      if (supabase != null) {
        if (_isSignUp) {
          final res = await supabase.auth.signUp(
            email: email,
            password: password,
            data: {'role': _selectedRole, 'full_name': fullName},
          );
          if (res.user != null) {
            await LocalStorageService.saveUserSession(
              email: email,
              token: res.session?.accessToken ?? 'sb_token_${res.user!.id}',
              role: _selectedRole,
              name: fullName,
            );
          }
        } else {
          final res = await supabase.auth.signInWithPassword(
            email: email,
            password: password,
          );
          if (res.user != null) {
            await LocalStorageService.saveUserSession(
              email: email,
              token: res.session?.accessToken ?? 'sb_token_${res.user!.id}',
              role: _selectedRole,
              name: fullName.isNotEmpty ? fullName : "RouteIQ User",
            );
          }
        }
      } else {
        // Offline / Demo Direct Authentication bypass
        await Future.delayed(const Duration(milliseconds: 500));
        await LocalStorageService.saveUserSession(
          email: email,
          token: "offline_pwa_session_token_ready",
          role: _selectedRole,
          name: fullName.isNotEmpty ? fullName : (_selectedRole == 'manager' ? "Fleet Dispatcher" : "Lead Driver"),
        );
      }

      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const TripPage()),
        );
      }
    } catch (e) {
      // In case Supabase network fails, offer instant offline demo sign-in
      await LocalStorageService.saveUserSession(
        email: email,
        token: "demo_offline_token",
        role: _selectedRole,
        name: fullName.isNotEmpty ? fullName : "Demo Operator",
      );
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const TripPage()),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isDesktop = constraints.maxWidth >= 900;
          return Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: isDesktop
                  ? Container(
                      constraints: const BoxConstraints(maxWidth: 1040, maxHeight: 680),
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: AppTheme.surfaceElevated),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.4),
                            blurRadius: 30,
                            offset: const Offset(0, 15),
                          )
                        ],
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Row(
                        children: [
                          Expanded(child: _buildHeroBanner()),
                          Expanded(child: _buildAuthForm()),
                        ],
                      ),
                    )
                  : Container(
                      constraints: const BoxConstraints(maxWidth: 480),
                      decoration: BoxDecoration(
                        color: AppTheme.surface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppTheme.surfaceElevated),
                      ),
                      padding: const EdgeInsets.all(24),
                      child: _buildAuthForm(),
                    ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildHeroBanner() {
    return Stack(
      fit: StackFit.expand,
      children: [
        // Real Unsplash Logistics Fleet Imagery
        Image.network(
          "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80",
          fit: BoxFit.cover,
        ),
        Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                const Color(0xFF0F172A).withValues(alpha: 0.6),
                const Color(0xFF0F172A).withValues(alpha: 0.95),
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.primary),
                    ),
                    child: const Center(
                      child: AppSvgIcon(icon: AppSvgIcon.truck, size: 24, color: AppTheme.primary),
                    ),
                  ),
                  const SizedBox(width: 14),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "RouteIQ",
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                        ),
                      ),
                      Text(
                        "Fleet AI & Routing Engine",
                        style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
                      ),
                    ],
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryDark.withValues(alpha: 0.4),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppTheme.primary.withValues(alpha: 0.4)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        AppSvgIcon(icon: AppSvgIcon.sparkle, size: 14, color: AppTheme.primaryHover),
                        SizedBox(width: 6),
                        Text(
                          "35-40% Fuel Consumption Reduction",
                          style: TextStyle(color: AppTheme.primaryHover, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    "Smart Delivery Logistics & Route Planner",
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      height: 1.25,
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    "Smart route planning, live driver tracking, offline delivery sync, and fuel savings built for delivery teams across Nigeria.",
                    style: TextStyle(color: AppTheme.textSecondary, fontSize: 13, height: 1.5),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAuthForm() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Center(
                  child: AppSvgIcon(icon: AppSvgIcon.shield, size: 20, color: AppTheme.primary),
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _isSignUp ? "Create Account" : "Welcome Back",
                    style: const TextStyle(
                      color: AppTheme.textPrimary,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const Text(
                    "Sign in to access your routes and drivers",
                    style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Role Selector
          Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: AppTheme.background,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppTheme.surfaceElevated),
            ),
            child: Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _selectedRole = 'manager'),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: _selectedRole == 'manager' ? AppTheme.primary : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: Text(
                          "Fleet Manager",
                          style: TextStyle(
                            color: _selectedRole == 'manager' ? Colors.white : AppTheme.textSecondary,
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _selectedRole = 'driver'),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: _selectedRole == 'driver' ? AppTheme.primary : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Center(
                        child: Text(
                          "Field Driver",
                          style: TextStyle(
                            color: _selectedRole == 'driver' ? Colors.white : AppTheme.textSecondary,
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          if (_isSignUp) ...[
            TextField(
              controller: _fullNameController,
              style: const TextStyle(color: AppTheme.textPrimary),
              decoration: const InputDecoration(
                labelText: "Full Name",
                prefixIcon: Padding(
                  padding: EdgeInsets.all(12),
                  child: AppSvgIcon(icon: AppSvgIcon.user, size: 18, color: AppTheme.textMuted),
                ),
              ),
            ),
            const SizedBox(height: 14),
          ],

          TextField(
            controller: _emailController,
            style: const TextStyle(color: AppTheme.textPrimary),
            decoration: const InputDecoration(
              labelText: "Work Email",
              prefixIcon: Padding(
                padding: EdgeInsets.all(12),
                child: AppSvgIcon(icon: AppSvgIcon.route, size: 18, color: AppTheme.textMuted),
              ),
            ),
          ),
          const SizedBox(height: 14),

          TextField(
            controller: _passwordController,
            obscureText: true,
            style: const TextStyle(color: AppTheme.textPrimary),
            decoration: const InputDecoration(
              labelText: "Password",
              prefixIcon: Padding(
                padding: EdgeInsets.all(12),
                child: AppSvgIcon(icon: AppSvgIcon.shield, size: 18, color: AppTheme.textMuted),
              ),
            ),
          ),
          const SizedBox(height: 20),

          if (_errorMessage != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.error.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppTheme.error.withValues(alpha: 0.4)),
              ),
              child: Row(
                children: [
                  const AppSvgIcon(icon: AppSvgIcon.warning, size: 18, color: AppTheme.error),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _errorMessage!,
                      style: const TextStyle(color: AppTheme.error, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],

          ElevatedButton(
            onPressed: _isLoading ? null : _handleAuth,
            child: _isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _isSignUp ? "Create Account" : "Access Workspace",
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      const SizedBox(width: 8),
                      const AppSvgIcon(icon: AppSvgIcon.arrowRight, size: 18, color: Colors.white),
                    ],
                  ),
          ),
          const SizedBox(height: 16),

          TextButton(
            onPressed: () {
              setState(() {
                _isSignUp = !_isSignUp;
                _errorMessage = null;
              });
            },
            child: Text(
              _isSignUp
                  ? "Already have an account? Sign In"
                  : "Need a new fleet account? Register",
              style: const TextStyle(color: AppTheme.primaryHover, fontSize: 13, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
