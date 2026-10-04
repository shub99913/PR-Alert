export const analyzeEvent = (event: any) => {
    let alertCandidate = null;

    if (event.type === 'earthquake' && event.magnitude && event.magnitude >= 5.0) {
        alertCandidate = {
            eventId: event.id,
            threatType: 'Seismic',
            initialSeverity: event.magnitude >= 7.0 ? 'critical' : 'high',
            rulesTriggered: ['MAGNITUDE_THRESHOLD_EXCEEDED'],
            dispatchAreaRadiusKm: event.magnitude * 10
        };
    } else if (event.type === 'wildfire' && event.additional?.confidence === 'high') {
        alertCandidate = {
            eventId: event.id,
            threatType: 'Wildfire',
            initialSeverity: 'high',
            rulesTriggered: ['HIGH_CONFIDENCE_THERMAL_ANOMALY'],
            dispatchAreaRadiusKm: 25
        };
    }

    return alertCandidate;
};
