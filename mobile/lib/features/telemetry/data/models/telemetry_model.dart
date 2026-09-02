import '../../domain/entities/telemetry.dart';

class TelemetryModel extends TelemetryEntity {
  const TelemetryModel({
    required super.recordId,
    super.tripId,
    required super.latitude,
    required super.longitude,
    required super.speedKph,
    required super.headingDegrees,
    required super.batteryLevel,
    required super.timestampUtc,
  });

  factory TelemetryModel.fromEntity(TelemetryEntity entity) {
    return TelemetryModel(
      recordId: entity.recordId,
      tripId: entity.tripId,
      latitude: entity.latitude,
      longitude: entity.longitude,
      speedKph: entity.speedKph,
      headingDegrees: entity.headingDegrees,
      batteryLevel: entity.batteryLevel,
      timestampUtc: entity.timestampUtc,
    );
  }

  factory TelemetryModel.fromJson(Map<String, dynamic> json) {
    return TelemetryModel(
      recordId: json['record_id'] ?? '',
      tripId: json['trip_id'],
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
      speedKph: (json['speed_kph'] as num?)?.toDouble() ?? 0.0,
      headingDegrees: (json['heading_degrees'] as num?)?.toDouble() ?? 0.0,
      batteryLevel: (json['battery_level'] as num?)?.toDouble() ?? 1.0,
      timestampUtc: json['timestamp_utc'] != null ? DateTime.parse(json['timestamp_utc']) : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'record_id': recordId,
      'trip_id': tripId,
      'latitude': latitude,
      'longitude': longitude,
      'speed_kph': speedKph,
      'heading_degrees': headingDegrees,
      'battery_level': batteryLevel,
      'timestamp_utc': timestampUtc.toUtc().toIso8601String(),
    };
  }
}
