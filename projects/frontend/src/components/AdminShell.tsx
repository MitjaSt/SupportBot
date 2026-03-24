import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Divider,
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
  Analytics,
  CallSplit,
  Description,
  Forum,
  Logout,
  ManageSearch,
  Menu,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: 'Analytics', path: '/analytics', icon: <Analytics /> },
  { label: 'Conversations', path: '/conversations', icon: <Forum /> },
  { label: 'Knowledge Base', path: '/knowledge-base', icon: <ManageSearch /> },
  { label: 'System Prompt', path: '/system-prompt', icon: <Description /> },
  { label: 'Chunk Inspector', path: '/chunk-inspector', icon: <CallSplit /> },
];

export function AdminShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar>
        <Typography variant="subtitle2" fontWeight={600} color="text.secondary" noWrap>
          Macular Society
        </Typography>
      </Toolbar>
      <Divider />
      <List component="nav" aria-label="Admin navigation" sx={{ flex: 1, py: 1 }}>
        {NAV_ITEMS.map(({ label, path, icon }) => (
          <ListItem key={path} disablePadding>
            <ListItemButton
              component={NavLink}
              to={path}
              onClick={() => setMobileOpen(false)}
              sx={{
                borderRadius: 1,
                mx: 1,
                '&.active': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                  '&:hover': { bgcolor: 'primary.dark' },
                },
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{icon}</ListItemIcon>
              <ListItemText primary={label} primaryTypographyProps={{ variant: 'body2' }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        {user && (
          <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ mb: 1 }}>
            {user.name ?? user.sub}
          </Typography>
        )}
        <ListItemButton
          onClick={() => { signOut(); navigate('/'); }}
          sx={{ borderRadius: 1, px: 1 }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <Logout fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Log out" primaryTypographyProps={{ variant: 'body2' }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* AppBar — visible on mobile only to toggle the drawer */}
      <AppBar
        position="fixed"
        sx={{ display: { sm: 'none' }, zIndex: (t) => t.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="Open navigation"
            edge="start"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <Menu />
          </IconButton>
          <Typography variant="h6" noWrap>
            Admin
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Persistent drawer on desktop, temporary on mobile */}
      <Box component="nav" sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          overflowY: 'auto',
          mt: { xs: 8, sm: 0 },
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
