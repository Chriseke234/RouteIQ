class TripEntity {
  final String id;
  final String driverId;
  final String vehicleId;
  final String status; // 'pending', 'optimized', 'in_transit', 'completed', 'canceled'
  final DateTime? startTime;
  final DateTime? endTime;
  final int vectorClockClient;
  final int vectorClockServer;
  final List<TripNodeEntity> nodes;

  const TripEntity({
    required this.id,
    required this.driverId,
    required this.vehicleId,
    required this.status,
    this.startTime,
    this.endTime,
    required this.vectorClockClient,
    required this.vectorClockServer,
    required this.nodes,
  });

  TripEntity copyWith({
    String? status,
    int? vectorClockClient,
    int? vectorClockServer,
    List<TripNodeEntity>? nodes,
  }) {
    return TripEntity(
      id: id,
      driverId: driverId,
      vehicleId: vehicleId,
      status: status ?? this.status,
      startTime: startTime,
      endTime: endTime,
      vectorClockClient: vectorClockClient ?? this.vectorClockClient,
      vectorClockServer: vectorClockServer ?? this.vectorClockServer,
      nodes: nodes ?? this.nodes,
    );
  }
}

class TripNodeEntity {
  final String id;
  final String tripId;
  final int sequenceIndex;
  final String nodeStatus; // 'pending', 'arrived', 'delivered', 'skipped'
  final String address;
  final double latitude;
  final double longitude;
  final DateTime? eta;
  final DateTime? actualArrival;
  final DateTime? actualDeparture;

  const TripNodeEntity({
    required this.id,
    required this.tripId,
    required this.sequenceIndex,
    required this.nodeStatus,
    required this.address,
    required this.latitude,
    required this.longitude,
    this.eta,
    this.actualArrival,
    this.actualDeparture,
  });

  TripNodeEntity copyWith({
    String? id,
    String? tripId,
    int? sequenceIndex,
    String? nodeStatus,
    String? address,
    double? latitude,
    double? longitude,
    DateTime? eta,
    DateTime? actualArrival,
    DateTime? actualDeparture,
  }) {
    return TripNodeEntity(
      id: id ?? this.id,
      tripId: tripId ?? this.tripId,
      sequenceIndex: sequenceIndex ?? this.sequenceIndex,
      nodeStatus: nodeStatus ?? this.nodeStatus,
      address: address ?? this.address,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      eta: eta ?? this.eta,
      actualArrival: actualArrival ?? this.actualArrival,
      actualDeparture: actualDeparture ?? this.actualDeparture,
    );
  }
}
