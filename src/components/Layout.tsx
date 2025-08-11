import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Settings,
  Category,
  AccountBalance,
  People,
  Folder,
  Class,
  Assessment,
  Flag,
  AccountBalanceWallet,
  TrendingUp,
  MoneyOff,
  ImportExport,
  Storage,
} from '@mui/icons-material';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/' },
  { text: 'Configs', icon: <Settings />, path: '/configs' },
  { text: 'Asset Purposes', icon: <Category />, path: '/asset-purposes' },
  { text: 'Loan Types', icon: <AccountBalance />, path: '/loan-types' },
  { text: 'Holders', icon: <People />, path: '/holders' },
  { text: 'SIP Types', icon: <TrendingUp />, path: '/sip-types' },
  { text: 'Buckets', icon: <Folder />, path: '/buckets' },
  { text: 'Asset Classes', icon: <Class />, path: '/asset-classes' },
  { text: 'Assets Holdings', icon: <Assessment />, path: '/assets-holdings' },
  { text: 'Goals', icon: <Flag />, path: '/goals' },
  { text: 'Accounts', icon: <AccountBalanceWallet />, path: '/accounts' },
  { text: 'Income', icon: <TrendingUp />, path: '/income' },
  { text: 'Cash Flow', icon: <MoneyOff />, path: '/cash-flow' },
  { text: 'Liabilities', icon: <AccountBalance />, path: '/liabilities' },
  { text: 'Import/Export', icon: <ImportExport />, path: '/import-export' },
  { text: 'Query Builder', icon: <Storage />, path: '/query-builder' },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <div>
      <Toolbar />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton onClick={() => navigate(item.path)}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Personal Finance Management
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
