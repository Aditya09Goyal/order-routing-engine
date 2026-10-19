import React, { useEffect, useState } from 'react';
import { Box, Typography, Grid, Card, CardContent } from '@mui/material';
import { Warehouse, Package, ShoppingCart, CheckCircle } from 'lucide-react';
import api from '../api/axios';

const Dashboard = () => {
  const [stats, setStats] = useState({
    warehouses: 0,
    products: 0,
    activeOrders: 0,
    fulfilledOrders: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
          const [warehousesRes, productsRes, statsRes] = await Promise.all([
          api.get('/warehouses'),
          api.get('/products'),
          api.get('/orders/stats') // just the counts, not every order
        ]);

        const warehouses = warehousesRes.data.data.length;
        const products = productsRes.data.data.length;
        const activeOrders = statsRes.data.data.active;
        const fulfilledOrders = statsRes.data.data.fulfilled;

        setStats({ warehouses, products, activeOrders, fulfilledOrders });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { title: 'Total Warehouses', value: stats.warehouses, icon: <Warehouse size={40} color="#06b6d4" /> },
    { title: 'Total Products', value: stats.products, icon: <Package size={40} color="#06b6d4" /> },
    { title: 'Active Orders', value: stats.activeOrders, icon: <ShoppingCart size={40} color="#7c3aed" /> },
    { title: 'Fulfilled Orders', value: stats.fulfilledOrders, icon: <CheckCircle size={40} color="#10b981" /> },
  ];

  return (
    <Box>
      <Typography variant="h4" color="text.primary" fontWeight="bold" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={4} sx={{ mt: 2 }}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%', display: 'flex', alignItems: 'center' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', w: '100%' }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography color="text.secondary" variant="subtitle2" gutterBottom>
                    {card.title}
                  </Typography>
                  <Typography variant="h3" color="text.primary" fontWeight="bold">
                    {card.value}
                  </Typography>
                </Box>
                <Box sx={{ ml: 2, p: 1, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                  {card.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Dashboard;
