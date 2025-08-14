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
  Settings,
  BookmarkRemove
} from '@mui/icons-material';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/' },
  { text: 'SWP', icon: <BookmarkRemove />, path: '/swp' },
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
  { text: 'Settings', icon: <Settings />, path: '/settings' },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawer = (
    <div>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton onClick={() => { 
                handleDrawerToggle(); 
                navigate(item.path); 
              }}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ 
        display: 'flex',
        minHeight: '100vh',
        maxWidth: '100vw',
        overflow: 'hidden'
      }}>
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
            sx={{ mr: 2, display: { sm: 'none' } }}
            onClick={handleDrawerToggle}
          >
            <MenuIcon />
          </IconButton>
          <Typography 
            variant="h6" 
            noWrap 
            component="div"
            sx={{
              fontSize: { xs: '1rem', sm: '1.25rem' },
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
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
          p: { xs: 1, sm: 2, md: 3 },
          width: { xs: '100%', sm: `calc(100% - ${drawerWidth}px)` },
          height: '100vh',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          '& > *': {
            maxWidth: '100%',
            flexShrink: 0
          }
        }}
      >
        <Toolbar />
        <Box sx={{ 
          flex: 1, 
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
