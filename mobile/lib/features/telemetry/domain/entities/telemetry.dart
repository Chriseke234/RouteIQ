class TelemetryEntity {
  final String recordId;
  final String? tripId;
  final double latitude;
  final double longitude;
  final double speedKph;
  final double headingDegrees;
  final double batteryLevel;
  final DateTime timestampUtc;

  const TelemetryEntity({
    required this.recordId,
    this.tripId,
    required this.latitude,
    required this.longitude,
    required this.speedKph,
    required this.headingDegrees,
    required this.batteryLevel,
    required this.timestampUtc,
  });
}
