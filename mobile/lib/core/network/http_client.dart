import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class NetworkClient {
  late final Dio _dio;
  
  // Singleton instance
  static final NetworkClient _instance = NetworkClient._internal();
  factory NetworkClient() => _instance;

  NetworkClient._internal() {
    _dio = Dio(
      BaseOptions(
        baseUrl: "http://10.0.2.2:8000", // Default Android emulator local address mapping to host localhost
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // Attach Interceptors
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final prefs = await SharedPreferences.getInstance();
          final token = prefs.getString("access_token");
          if (token != null) {
            options.headers["Authorization"] = "Bearer $token";
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          // Token expired or invalid
          if (error.response?.statusCode == 401) {
            final prefs = await SharedPreferences.getInstance();
            // Clear expired token
            await prefs.remove("access_token");
            
            // In a production app, redirect driver to login / biometric authentication screen
          }
          return handler.next(error);
        },
      ),
    );
  }

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) {
    return _dio.get(path, queryParameters: queryParameters);
  }

  Future<Response> post(String path, {dynamic data, Map<String, dynamic>? queryParameters}) {
    return _dio.post(path, data: data, queryParameters: queryParameters);
  }

  Future<Response> put(String path, {dynamic data, Map<String, dynamic>? queryParameters}) {
    return _dio.put(path, data: data, queryParameters: queryParameters);
  }
}
