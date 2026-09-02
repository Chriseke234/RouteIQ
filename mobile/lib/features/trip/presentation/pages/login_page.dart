import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'trip_page.dart';

class LoginPage extends ConsumerStatefulWidget {
  const LoginPage({super.key});

  @override
  ConsumerState<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends ConsumerState<LoginPage> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;
  bool _isOfflineModeEnabled = false;

  @override
  void initState() {
    super.initState();
    _checkOfflineSession();
  }

  Future<void> _checkOfflineSession() async {
    final prefs = await SharedPreferences.getInstance();
    final cachedToken = prefs.getString("access_token");
    if (cachedToken != null) {
      setState(() {
        _isOfflineModeEnabled = true;
      });
    }
  }

  Future<void> _handleLogin() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      setState(() {
        _isLoading = false;
        _errorMessage = "Please enter email and password.";
      });
      return;
    }

    try {
      // Simulate normal api login
      // For MVP implementation, we mock the success response & cache access token
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString("access_token", "mock_jwt_token_routeiq_offline_ready");
      await prefs.setString("driver_email", email);

      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const TripPage()),
        );
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = "Login failed: ${e.toString()}";
      });
    }
  }

  void _handleOfflineAccess() {
    if (_isOfflineModeEnabled) {
      // Direct offline bypass with local cached token
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const TripPage()),
      );
    } else {
      setState(() {
        _errorMessage = "No offline credentials cached. Please login online first.";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Premium Dark Slate
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Premium Logo Placeholder
              const Center(
                child: Icon(
                  Icons.local_shipping_outlined,
                  size: 64.0,
                  color: Color(0xFF38BDF8), // Vibrant Light Blue
                ),
              ),
              const SizedBox(height: 16),
              const Center(
                child: Text(
                  "RouteIQ",
                  style: TextStyle(
                    fontSize: 32.0,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: 1.5,
                  ),
                ),
              ),
              const Center(
                child: Text(
                  "Offline-First Logistics Optimization",
                  style: TextStyle(
                    fontSize: 14.0,
                    color: Color(0xFF94A3B8), // Muted Gray
                  ),
                ),
              ),
              const SizedBox(height: 48),

              // Inputs
              TextField(
                controller: _emailController,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: "Email Address",
                  labelStyle: const TextStyle(color: Color(0xFF64748B)),
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12.0),
                    borderSide: BorderSide.none,
                  ),
                  prefixIcon: const Icon(Icons.email_outlined, color: Color(0xFF64748B)),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                obscureText: true,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: "Password",
                  labelStyle: const TextStyle(color: Color(0xFF64748B)),
                  filled: true,
                  fillColor: const Color(0xFF1E293B),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12.0),
                    borderSide: BorderSide.none,
                  ),
                  prefixIcon: const Icon(Icons.lock_outlined, color: Color(0xFF64748B)),
                ),
              ),
              const SizedBox(height: 24),

              // Error Display
              if (_errorMessage != null) ...[
                Text(
                  _errorMessage!,
                  style: const TextStyle(color: Color(0xFFF87171), fontSize: 13),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
              ],

              // Login Button (Online)
              ElevatedButton(
                onPressed: _isLoading ? null : _handleLogin,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0EA5E9), // Premium cyan
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16.0),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12.0),
                  ),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Text(
                        "Login Online",
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                      ),
              ),
              const SizedBox(height: 16),

              // Offline Access Option
              OutlinedButton(
                onPressed: _handleOfflineAccess,
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF38BDF8),
                  side: BorderSide(
                    color: _isOfflineModeEnabled ? const Color(0xFF38BDF8) : const Color(0xFF334155),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 16.0),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12.0),
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      _isOfflineModeEnabled ? Icons.wifi_off_outlined : Icons.lock_clock_outlined,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      "Access Offline (Local PIN / Biometric)",
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
