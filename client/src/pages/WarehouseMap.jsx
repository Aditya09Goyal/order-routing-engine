import React, { useEffect, useState } from 'react';
import { Box, Typography, Card } from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api/axios';

const createColoredIcon = (color) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};
const redIcon = createColoredIcon('red');
const blueIcon = createColoredIcon('blue');

const WarehouseMap = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [wRes, oRes] = await Promise.all([
          api.get('/warehouses'),
          api.get('/orders', { params: { status: 'assigned,fulfilled', limit: 200 } })
        ]);
        setWarehouses(wRes.data.data);
        setOrders(oRes.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const centerPos = [20.5937, 78.9629]; // Center of India

  return (
    <Box sx={{ height: 'calc(100vh - 100px)' }}>
      <Typography variant="h4" color="text.primary" fontWeight="bold" gutterBottom>
        Warehouse & Order Map
      </Typography>

      <Card sx={{ height: '100%', mt: 2 }}>
        <MapContainer center={centerPos} zoom={5} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; OSM'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {warehouses.map(w => (
            <Marker key={w._id} position={[w.latitude, w.longitude]} icon={blueIcon}>
              <Popup>
                <b>{w.warehouseName}</b><br/>
                City: {w.city}<br/>
                Capacity: {w.capacity}
              </Popup>
            </Marker>
          ))}

          {orders.map(o => {
            const customerPos = [o.customerLatitude, o.customerLongitude];
            const wh = o.assignedWarehouseId;
            if (!wh) return null;
            const whPos = [wh.latitude, wh.longitude];

            return (
              <React.Fragment key={o._id}>
                <Marker position={customerPos} icon={redIcon}>
                  <Popup>
                    <b>Customer: {o.customerName}</b><br/>
                    Status: {o.status}
                  </Popup>
                </Marker>
                <Polyline positions={[customerPos, whPos]} color="#06b6d4" weight={2} dashArray="5, 10" />
              </React.Fragment>
            );
          })}
        </MapContainer>
      </Card>
    </Box>
  );
};

export default WarehouseMap;
