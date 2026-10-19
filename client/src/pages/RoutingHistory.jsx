import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, TablePagination, TextField, InputAdornment, 
  CircularProgress, IconButton, Tooltip 
} from '@mui/material';
import { Search, Eye, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const RoutingHistory = () => {
  const [history, setHistory] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const navigate = useNavigate();

  // Wait until the user stops typing for 400 ms before asking the server to search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(0);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch ONE page (search is done by the server). `cancelled` ignores out-of-date replies.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/routing/routing-history', {
          params: { page: page + 1, limit: rowsPerPage, search: debouncedSearch }
        });
        if (!cancelled && res.data.success) {
          setHistory(res.data.data);
          setTotal(res.data.pagination.total);
        }
      } catch (err) {
        console.error('Failed to fetch routing history', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, rowsPerPage, debouncedSearch]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = (item) => {
    navigate(`/routing-decision/${item.orderId?._id || 'unknown'}`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <History size={32} color="#7c3aed" />
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            Routing History
          </Typography>
        </Box>
        <TextField
          placeholder="Search Customer or Warehouse..."
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={20} color="#9ca3af" />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />
      </Box>

      <TableContainer component={Paper} sx={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date / Time</TableCell>
                  <TableCell>Customer Name</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Assigned Warehouse</TableCell>
                  <TableCell>Routing Score</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history
                  .map((item) => (
                    <TableRow key={item._id} hover>
                      <TableCell>
                        {new Date(item.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>{item.orderId?.customerName || 'Unknown'}</TableCell>
                      <TableCell>{item.orderId?.productId?.productName || 'Unknown'}</TableCell>
                      <TableCell>
                        {item.warehouseId?.warehouseName || 'Unknown'}
                        {item.warehouseId?.city && ` (${item.warehouseId.city})`}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold" color="primary">
                          {item.routingScore ? item.routingScore.toFixed(4) : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton onClick={() => handleViewDetails(item)} color="primary">
                            <Eye size={20} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                {history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No routing history found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={total}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </>
        )}
      </TableContainer>
    </Box>
  );
};

export default RoutingHistory;
