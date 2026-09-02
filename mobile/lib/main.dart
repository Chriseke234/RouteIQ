import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/theme/app_theme.dart';
import 'core/config/supabase_config.dart';
import 'core/offline/local_storage_service.dart';
import 'features/auth/presentation/pages/auth_page.dart';
import 'features/trip/presentation/pages/trip_page.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Supabase client
  await SupabaseConfig.initialize();

  // Check login state
  final hasSession = await LocalStorageService.hasSession();

  runApp(
    ProviderScope(
      child: RouteIQApp(hasSession: hasSession),
    ),
  );
}

class RouteIQApp extends StatelessWidget {
  final bool hasSession;

  const RouteIQApp({super.key, required this.hasSession});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RouteIQ | AI Fleet Logistics & Navigation',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: hasSession ? const TripPage() : const AuthPage(),
    );
  }
}
