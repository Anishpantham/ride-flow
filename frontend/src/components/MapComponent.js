import React, { useState, useEffect, useCallback } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Loader2 } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'AIzaSyDummyKeyForDevelopment';

export const MapComponent = ({ 
  center = { lat: 40.7128, lng: -74.0060 },
  zoom = 12,
  markers = [],
  onMapClick,
  height = '500px',
  className = ''
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);

  return (
    <div className={`relative ${className}`} style={{ height }}>
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} onLoad={() => setMapLoaded(true)}>
        <Map
          style={{ width: '100%', height: '100%' }}
          defaultCenter={center}
          defaultZoom={zoom}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapId="rideflow-map"
          onClick={onMapClick}
        >
          {markers.map((marker, index) => (
            <AdvancedMarker
              key={marker.id || index}
              position={marker.position}
              onClick={() => marker.onClick && marker.onClick(marker)}
            >
              <Pin
                background={marker.color || '#007AFF'}
                borderColor="#FFFFFF"
                glyphColor="#FFFFFF"
                scale={1.2}
              />
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </div>
  );
};