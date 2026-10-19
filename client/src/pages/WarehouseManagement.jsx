import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Modal, TextField, Grid, Tooltip } from '@mui/material';
import { Plus, Edit } from 'lucide-react';
import api from '../api/axios';

const WarehouseManagement = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [formData, setFormData] = useState({
    warehouseName: '', city: '', latitude: '', longitude: '', capacity: '',
    activeStatus: true,
    dispatchTime: 24,
    costPerKm: 5,
    shipmentSpeed: 200
  });
  const [editId, setEditId] = useState(null);

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses');
      setWarehouses(res.data.data);
    } catch (err) {
      console.error(err);
      // Show the server's validation message (e.g. "shipmentSpeed must be at least 1")
      alert(err.response?.data?.message || 'Could not save the warehouse');
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleOpen = (warehouse = null) => {
    if (warehouse) {
      setFormData({
        warehouseName: warehouse.warehouseName,
        city: warehouse.city,
        latitude: warehouse.latitude,
        longitude: warehouse.longitude,
        capacity: warehouse.capacity,
        activeStatus: warehouse.activeStatus,
        dispatchTime: warehouse.dispatchTime ?? 24,
        costPerKm: warehouse.costPerKm ?? 5,
        shipmentSpeed: warehouse.shipmentSpeed ?? 200,
      });
      setEditId(warehouse._id);
    } else {
      setFormData({
        warehouseName: '', city: '', latitude: '', longitude: '', capacity: '',
        activeStatus: true,
        dispatchTime: 24,
        costPerKm: 5,
        shipmentSpeed: 200
      });
      setEditId(null);
    }
    setOpenModal(true);
  };

  const handleClose = () => setOpenModal(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/warehouses/${editId}`, formData);
      } else {
        await api.post('/warehouses', formData);
      }
      fetchWarehouses();
      handleClose();
    } catch (err) {
      console.error(err);
    }
  };

  const field = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" color="text.primary" fontWeight="bold">
          Warehouse Management
        </Typography>
        <Button variant="contained" color="primary" startIcon={<Plus />} onClick={() => handleOpen()}>
          Add Warehouse
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Warehouse Name</TableCell>
              <TableCell>City</TableCell>
              <TableCell>Capacity</TableCell>
              <TableCell>
                <Tooltip title="Hours before dispatch begins" arrow>
                  <span>Dispatch (h)</span>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Tooltip title="Shipping cost rate" arrow>
                  <span>Cost/km</span>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Tooltip title="Delivery network speed" arrow>
                  <span>Speed (km/d)</span>
                </Tooltip>
              </TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {warehouses.map((w) => (
              <TableRow key={w._id}>
                <TableCell>{w.warehouseName}</TableCell>
                <TableCell>{w.city}</TableCell>
                <TableCell>{w.capacity?.toLocaleString()}</TableCell>
                <TableCell>
                  <Chip label={`${w.dispatchTime ?? 24}h`} size="small"
                    sx={{ backgroundColor: 'rgba(124,58,237,0.15)', color: '#a78bfa' }} />
                </TableCell>
                <TableCell>
                  <Chip label={`\u20b9${w.costPerKm ?? 5}/km`} size="small"
                    sx={{ backgroundColor: 'rgba(6,182,212,0.15)', color: '#67e8f9' }} />
                </TableCell>
                <TableCell>
                  <Chip label={`${w.shipmentSpeed ?? 200} km/d`} size="small"
                    sx={{ backgroundColor: 'rgba(16,185,129,0.15)', color: '#6ee7b7' }} />
                </TableCell>
                <TableCell>
                  <Chip
                    label={w.activeStatus ? 'Active' : 'Inactive'}
                    color={w.activeStatus ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Button size="small" startIcon={<Edit size={16} />} onClick={() => handleOpen(w)}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Modal
        open={openModal}
        onClose={handleClose}
        slotProps={{
          backdrop: {
            sx: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.7)' }
          }
        }}
      >
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 560,
          background: '#13131f',          /* solid opaque dark — overrides translucent paper */
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
          p: 4, borderRadius: 2, maxHeight: '90vh', overflowY: 'auto'
        }}>
          <Typography variant="h6" mb={2}>
            {editId ? 'Edit Warehouse' : 'Add Warehouse'}
          </Typography>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              {/* Basic Info */}
              <Grid item xs={12}>
                <TextField fullWidth label="Warehouse Name" required
                  value={formData.warehouseName} onChange={field('warehouseName')} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="City" required
                  value={formData.city} onChange={field('city')} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Latitude" type="number" required inputProps={{ step: 'any' }}
                  value={formData.latitude} onChange={field('latitude')} />
              </Grid>
              <Grid item xs={6}>
                <TextField fullWidth label="Longitude" type="number" required inputProps={{ step: 'any' }}
                  value={formData.longitude} onChange={field('longitude')} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Capacity" type="number" required
                  value={formData.capacity} onChange={field('capacity')} />
              </Grid>

              {/* Logistics Attributes */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary"
                  sx={{ mt: 1, mb: 0.5, fontWeight: 'bold', letterSpacing: 0.5 }}>
                  LOGISTICS ATTRIBUTES
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth label="Dispatch Time (h)" type="number"
                  inputProps={{ min: 0, step: 1 }}
                  helperText="Hours before shipment starts"
                  value={formData.dispatchTime}
                  onChange={field('dispatchTime')}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth label="Cost per km" type="number"
                  inputProps={{ min: 0, step: 0.5 }}
                  helperText="Shipping rate in Rs per km"
                  value={formData.costPerKm}
                  onChange={field('costPerKm')}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth label="Shipment Speed (km/d)" type="number"
                  inputProps={{ min: 1, step: 1 }}
                  helperText="Distance covered per day"
                  value={formData.shipmentSpeed}
                  onChange={field('shipmentSpeed')}
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button onClick={handleClose}>Cancel</Button>
              <Button type="submit" variant="contained" color="primary">Save</Button>
            </Box>
          </form>
        </Box>
      </Modal>
    </Box>
  );
};

export default WarehouseManagement;
