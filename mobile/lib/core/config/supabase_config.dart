import 'package:supabase_flutter/supabase_flutter.dart';

/// Supabase configuration constants and initialization helpers.
class SupabaseConfig {
  // Default demo / configurable Supabase project endpoints
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://xyzcompany.supabase.co',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.demoKey',
  );

  static bool _isInitialized = false;
  static bool get isInitialized => _isInitialized;

  /// Initialize Supabase client safely with offline graceful fallback
  static Future<void> initialize() async {
    try {
      if (supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty && !supabaseUrl.contains('xyzcompany')) {
        await Supabase.initialize(
          url: supabaseUrl,
          anonKey: supabaseAnonKey,
          debug: false,
        );
        _isInitialized = true;
      }
    } catch (_) {
      // Graceful offline fallback mode
      _isInitialized = false;
    }
  }

  static SupabaseClient? get client {
    if (_isInitialized) {
      try {
        return Supabase.instance.client;
      } catch (_) {
        return null;
      }
    }
    return null;
  }
}
